import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.core.mail import send_mail
from django.utils.crypto import constant_time_compare
from django.utils.encoding import force_bytes
from django.utils.http import base36_to_int, urlsafe_base64_encode

logger = logging.getLogger(__name__)


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Signed, single-use email-verification token with its own lifetime.

    Django's base class expires every token after PASSWORD_RESET_TIMEOUT. We
    want verification links (24h) to outlive reset links (1h), so check_token
    is re-implemented against EMAIL_VERIFICATION_TIMEOUT. The token is bound
    to the password, ``email_verified`` and the address, so it stops working
    once used or if the password or address changes. Login activity does not
    invalidate it.
    """

    key_salt = "apps.accounts.EmailVerificationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.password}{timestamp}{user.email}{user.email_verified}"

    def check_token(self, user, token):
        if not (user and token):
            return False
        try:
            ts_b36, _ = token.split("-")
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False
        for secret in [self.secret, *self.secret_fallbacks]:
            if constant_time_compare(self._make_token_with_timestamp(user, ts, secret), token):
                break
        else:
            return False
        return (self._num_seconds(self._now()) - ts) <= settings.EMAIL_VERIFICATION_TIMEOUT


email_verification_token = EmailVerificationTokenGenerator()
password_reset_token = default_token_generator  # lifetime = settings.PASSWORD_RESET_TIMEOUT


def _humanize(seconds):
    if seconds % 86400 == 0:
        n = seconds // 86400
        return f"{n} day{'s' if n != 1 else ''}"
    if seconds % 3600 == 0:
        n = seconds // 3600
        return f"{n} hour{'s' if n != 1 else ''}"
    n = max(1, seconds // 60)
    return f"{n} minute{'s' if n != 1 else ''}"


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/verify-email?{urlencode({'uid': uid, 'token': token})}"
    lifetime = _humanize(settings.EMAIL_VERIFICATION_TIMEOUT)
    return _send_account_email(
        user.email,
        "Verify your Optimum LMS email",
        f"Confirm your email address by opening this link (valid for {lifetime}):\n\n{link}\n\n"
        "If you did not create this account, ignore this message.",
        f'<p>Confirm your email address to finish creating your Optimum LMS account.</p>'
        f'<p><a href="{link}">Verify email</a></p><p>This link is valid for {lifetime}.</p>'
        f"<p>If you did not create this account, ignore this message.</p>",
    )


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = password_reset_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?{urlencode({'uid': uid, 'token': token})}"
    lifetime = _humanize(settings.PASSWORD_RESET_TIMEOUT)
    return _send_account_email(
        user.email,
        "Reset your Optimum LMS password",
        f"Reset your password using this link (valid for {lifetime}, one use only):\n\n{link}\n\n"
        "If you did not request this, ignore this message — your password has not changed.",
        f'<p>A password reset was requested for your Optimum LMS account.</p>'
        f'<p><a href="{link}">Reset password</a></p>'
        f"<p>This link is valid for {lifetime} and can be used once.</p>"
        f"<p>If you did not request this, ignore this message — your password has not changed.</p>",
    )


def send_password_changed_email(user):
    return _send_account_email(
        user.email,
        "Your Optimum LMS password was changed",
        "Your Optimum LMS password has been changed. If you did not make this change, contact your administrator.",
        "<p>Your Optimum LMS password has been changed.</p><p>If you did not make this change, contact your administrator.</p>",
    )


def _send_account_email(email, subject, message, html_message):
    # Failures are logged, never raised: the API answers identically whether or
    # not an address exists, so an SMTP error must not change the response.
    try:
        return send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], html_message=html_message)
    except Exception:
        logger.exception("Could not send account email (subject=%r)", subject)
        return 0
