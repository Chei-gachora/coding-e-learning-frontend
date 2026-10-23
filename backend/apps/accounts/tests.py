"""Authentication, email verification and password-reset tests.

Links are taken from the *actual emails* the API sends (not hand-built
tokens) so the whole loop — send -> click -> confirm — is what's exercised.
Expiry is tested by moving the token generator's clock (``_now``) rather than
sleeping.
"""
import re
from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from .services import email_verification_token, password_reset_token
from .models import ExternalIdentity

User = get_user_model()

GOOD_PASSWORD = "A-strong-test-password!42"
NEW_PASSWORD = "A-different-Strong-password!59"


def link_from_email(message):
    """Return (uid, token) from the first http link in an outbox message."""
    url = re.search(r"https?://\S+", message.body).group(0).rstrip(".")
    query = parse_qs(urlparse(url).query)
    return query["uid"][0], query["token"][0], urlparse(url).path


def in_future(**delta):
    return patch.object(PasswordResetTokenGenerator, "_now", return_value=datetime.now() + timedelta(**delta))


class AuthBase(APITestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache

    def make_user(self, email="verified@example.com", username="verified", verified=True, **extra):
        return User.objects.create_user(
            username=username, email=email, password=GOOD_PASSWORD, email_verified=verified, **extra
        )

    def login(self, email, password=GOOD_PASSWORD):
        return self.client.post(reverse("login"), {"email": email, "password": password}, format="json")

    def register(self, email="learner@example.com", username="learner", password=GOOD_PASSWORD):
        return self.client.post(reverse("register"), {
            "username": username, "email": email, "first_name": "Test",
            "last_name": "Learner", "password": password,
        }, format="json")


class RegistrationAndLoginTests(AuthBase):
    def test_email_backend_is_a_real_django_setting(self):
        # Regression: the old settings defined a MAILERS dict Django ignores,
        # so real deployments fell back to SMTP on localhost and lost every email.
        self.assertTrue(hasattr(settings, "EMAIL_BACKEND"))
        self.assertFalse(hasattr(settings, "MAILERS"))

    def test_registration_requires_admin_approval_and_email_verification(self):
        response = self.register(" Learner@Example.com ")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username="learner")
        self.assertEqual(user.email, "learner@example.com")  # trimmed + lower-cased
        self.assertFalse(user.email_verified)
        self.assertFalse(user.is_approved)
        self.assertFalse(user.is_active)
        self.assertEqual(len(mail.outbox), 1)

        blocked_login = self.login(user.email)
        self.assertEqual(blocked_login.status_code, status.HTTP_401_UNAUTHORIZED)

        uid, token, path = link_from_email(mail.outbox[0])
        self.assertEqual(path, "/verify-email")
        verified = self.client.post(reverse("email-verify"), {"uid": uid, "token": token}, format="json")
        self.assertEqual(verified.status_code, status.HTTP_200_OK, verified.data)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertFalse(user.is_active)

        admin = self.make_user("admin@example.com", "admin", role="admin")
        self.client.force_authenticate(user=admin)
        approved = self.client.post(
            reverse("dashboard-learner-approve", kwargs={"learner_id": user.id}),
            {},
            format="json",
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK, approved.data)
        self.client.force_authenticate(user=None)
        login = self.login(user.email)
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("user", login.data)
        user.refresh_from_db()
        self.assertTrue(user.is_approved)
        self.assertTrue(user.is_active)

    def test_cookie_authentication_requires_csrf_for_state_changes(self):
        client = APIClient(enforce_csrf_checks=True)
        csrf_response = client.get(reverse("csrf-token"))
        csrf_token = csrf_response.data["csrfToken"]
        login_response = client.post(
            reverse("login"),
            {"email": "verified@example.com", "password": GOOD_PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.make_user()
        login_response = client.post(
            reverse("login"),
            {"email": "verified@example.com", "password": GOOD_PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("access", login_response.data)
        self.assertNotIn("refresh", login_response.data)

        blocked = client.patch(reverse("me"), {"first_name": "Changed"}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)
        allowed = client.patch(
            reverse("me"),
            {"first_name": "Changed"},
            format="json",
            HTTP_X_CSRFTOKEN=login_response.data["csrfToken"],
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
        blocked_logout = client.post(reverse("logout"), {}, format="json")
        self.assertEqual(blocked_logout.status_code, status.HTTP_403_FORBIDDEN)
        logout = client.post(
            reverse("logout"),
            {},
            format="json",
            HTTP_X_CSRFTOKEN=login_response.data["csrfToken"],
        )
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(logout.cookies["access_token"]["max-age"], 0)

    def test_invalid_registration_email_is_rejected(self):
        for email in ("abc", "abc@", "@gmail.com", "abc@gmail"):
            with self.subTest(email=email):
                self.assertEqual(self.register(email).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="learner").exists())

    def test_random_looking_gmail_address_uses_normal_verification_flow(self):
        response = self.register("xxgvhv@gmail.com", "randommail")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username="randommail")
        self.assertFalse(user.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("xxgvhv@gmail.com", mail.outbox[0].to)

    def test_login_ignores_email_case_and_surrounding_spaces(self):
        self.make_user("ann@example.com", "ann")
        for variant in ("ann@example.com", "ANN@EXAMPLE.COM", "Ann@Example.com", "  ann@example.com  "):
            with self.subTest(email=variant):
                self.assertEqual(self.login(variant).status_code, status.HTTP_200_OK)

    def test_login_matches_legacy_mixed_case_rows(self):
        user = self.make_user("legacy@example.com", "legacy")
        User.objects.filter(pk=user.pk).update(email="Legacy@Example.COM")  # bypasses save()
        self.assertEqual(self.login("legacy@example.com").status_code, status.HTTP_200_OK)

    def test_password_is_case_sensitive(self):
        self.make_user()
        for bad in (GOOD_PASSWORD.upper(), GOOD_PASSWORD.lower(), GOOD_PASSWORD.swapcase(), GOOD_PASSWORD[:-1]):
            with self.subTest(password=bad):
                resp = self.login("verified@example.com", bad)
                self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
                self.assertNotIn("access", resp.data)

    def test_login_forgives_stray_edge_whitespace_but_not_inner_changes(self):
        # Mobile keyboards/autofill often append a space; new passwords can't
        # start/end with whitespace (see PasswordRuleTests), so trimming is safe.
        self.make_user()
        self.assertEqual(self.login("verified@example.com", GOOD_PASSWORD + " ").status_code, 200)
        self.assertEqual(self.login("verified@example.com", " " + GOOD_PASSWORD).status_code, 200)
        self.assertEqual(self.login("verified@example.com", GOOD_PASSWORD.replace("-", " ", 1)).status_code, 401)

    def test_unverified_user_with_right_password_can_login(self):
        self.make_user("new@example.com", "newbie", verified=False)
        resp = self.login("new@example.com")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("user", resp.data)

    def test_wrong_password_never_reveals_whether_account_is_unverified(self):
        self.make_user("new@example.com", "newbie", verified=False)
        wrong = self.login("new@example.com", "Wrong-password-1")
        unknown = self.login("nobody@example.com", "Wrong-password-1")
        self.assertEqual(wrong.status_code, unknown.status_code)
        self.assertEqual(wrong.data["detail"], unknown.data["detail"])
        self.assertNotIn("code", wrong.data)

    def test_inactive_user_cannot_log_in(self):
        self.make_user(is_active=False)
        self.assertEqual(self.login("verified@example.com").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unknown_email_is_rejected(self):
        self.assertEqual(self.login("unknown@example.com").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_username_uniqueness_ignores_case(self):
        self.assertEqual(self.register("a@example.com", "Ann").status_code, 201)
        resp = self.register("b@example.com", "ann")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", resp.data)

    def test_duplicate_email_ignores_case(self):
        self.assertEqual(self.register("a@example.com", "one").status_code, 201)
        self.assertEqual(self.register("A@EXAMPLE.COM", "two").status_code, 400)

    def test_login_is_rate_limited(self):
        self.make_user()
        with patch.object(ScopedRateThrottle, "timer", return_value=1_000):
            codes = [
                self.login("verified@example.com", "Wrong-password-1").status_code
                for _ in range(12)
            ]
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, codes)


class ExternalProviderLoginTests(AuthBase):
    def provider_login(self, provider, claims):
        nonce = self.client.get(reverse("social-login-nonce")).data["nonce"]
        claims = {**claims, "nonce": nonce}
        with patch("apps.accounts.views.verify_provider_credential", return_value=claims):
            return self.client.post(
                reverse(f"{provider}-login"),
                {"credential": "test-provider-id-token", "nonce": nonce},
                format="json",
            )

    def google_login(self, claims):
        return self.provider_login("google", claims)

    def test_first_google_sign_in_creates_verified_student_pending_approval(self):
        response = self.google_login({
            "sub": "google-sub-new-student",
            "email": "New.Student@Example.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "Student",
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        user = User.objects.get(email="new.student@example.com")
        self.assertEqual(user.role, "student")
        self.assertTrue(user.email_verified)
        self.assertFalse(user.is_approved)
        self.assertFalse(user.is_active)
        self.assertTrue(ExternalIdentity.objects.filter(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-sub-new-student",
        ).exists())
        self.assertNotIn("access_token", response.cookies)

    def test_approved_existing_account_is_not_linked_by_email(self):
        user = self.make_user(
            "instructor@example.com",
            "instructor",
            verified=False,
            role="instructor",
            is_approved=True,
            is_active=True,
        )

        response = self.google_login({
            "sub": "google-sub-instructor",
            "email": "INSTRUCTOR@example.com",
            "email_verified": True,
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)
        user.refresh_from_db()
        self.assertEqual(user.role, "instructor")
        self.assertFalse(user.email_verified)
        self.assertTrue(user.check_password(GOOD_PASSWORD))
        self.assertFalse(ExternalIdentity.objects.filter(user=user).exists())
        self.assertNotIn("access_token", response.cookies)

    def test_linked_identity_signs_in_when_provider_email_changes(self):
        user = self.make_user(
            "instructor@example.com",
            "instructor",
            role="instructor",
            is_approved=True,
            is_active=True,
        )
        ExternalIdentity.objects.create(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-sub-instructor",
        )

        response = self.google_login({
            "sub": "google-sub-instructor",
            "email": "new-address@example.com",
            "email_verified": True,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["user"]["id"], user.id)
        self.assertIn("access_token", response.cookies)

    def test_google_identity_cannot_be_linked_to_a_second_account(self):
        user = self.make_user("learner@example.com", "learner")
        ExternalIdentity.objects.create(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="already-linked-subject",
        )

        response = self.google_login({
            "sub": "different-google-subject",
            "email": user.email,
            "email_verified": True,
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            ExternalIdentity.objects.get(user=user, provider=ExternalIdentity.Provider.GOOGLE).subject,
            "already-linked-subject",
        )
        self.assertNotIn("access_token", response.cookies)

    def test_all_configured_provider_routes_can_sign_in_existing_accounts(self):
        for provider in ("google", "microsoft", "apple"):
            with self.subTest(provider=provider):
                email = f"{provider}@example.com"
                user = self.make_user(email, provider, role="student", is_approved=True, is_active=True)
                ExternalIdentity.objects.create(
                    user=user,
                    provider=provider,
                    subject=f"{provider}-subject",
                )
                response = self.provider_login(provider, {
                    "sub": f"{provider}-subject",
                    "email": email,
                    "email_verified": True,
                })
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
                self.assertIn("access_token", response.cookies)

    def test_linked_microsoft_identity_can_sign_in_without_an_email_claim(self):
        user = self.make_user(
            "microsoft@example.com",
            "microsoft",
            role="student",
            is_approved=True,
            is_active=True,
        )
        ExternalIdentity.objects.create(
            user=user,
            provider=ExternalIdentity.Provider.MICROSOFT,
            subject="microsoft-subject",
        )

        response = self.provider_login("microsoft", {
            "sub": "microsoft-subject",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access_token", response.cookies)

    def test_authenticated_user_can_explicitly_link_provider_identity(self):
        user = self.make_user("link-target@example.com", "link-target", verified=False)
        nonce = self.client.get(reverse("social-login-nonce")).data["nonce"]
        claims = {
            "sub": "google-sub-explicit-link",
            "email": "different-provider-email@example.com",
            "email_verified": True,
            "nonce": nonce,
        }
        self.client.force_authenticate(user=user)
        with patch("apps.accounts.views.verify_provider_credential", return_value=claims):
            response = self.client.post(
                reverse("social-link", args=["google"]),
                {"credential": "test-provider-id-token", "nonce": nonce},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(ExternalIdentity.objects.filter(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-sub-explicit-link",
        ).exists())
        user.refresh_from_db()
        self.assertFalse(user.email_verified)

    def test_provider_identity_cannot_be_explicitly_linked_to_another_user(self):
        owner = self.make_user("identity-owner@example.com", "identity-owner")
        target = self.make_user("link-target@example.com", "link-target")
        ExternalIdentity.objects.create(
            user=owner,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-sub-owned",
        )
        nonce = self.client.get(reverse("social-login-nonce")).data["nonce"]
        claims = {
            "sub": "google-sub-owned",
            "email": "identity-owner@example.com",
            "email_verified": True,
            "nonce": nonce,
        }
        self.client.force_authenticate(user=target)
        with patch("apps.accounts.views.verify_provider_credential", return_value=claims):
            response = self.client.post(
                reverse("social-link", args=["google"]),
                {"credential": "test-provider-id-token", "nonce": nonce},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            ExternalIdentity.objects.get(
                provider=ExternalIdentity.Provider.GOOGLE,
                subject="google-sub-owned",
            ).user_id,
            owner.id,
        )

    def test_provider_identity_linking_requires_an_authenticated_user(self):
        nonce = self.client.get(reverse("social-login-nonce")).data["nonce"]

        response = self.client.post(
            reverse("social-link", args=["google"]),
            {"credential": "test-provider-id-token", "nonce": nonce},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_microsoft_username_is_not_accepted_as_a_verified_email(self):
        from apps.accounts.views import verify_provider_credential

        with patch("apps.accounts.views.settings.MICROSOFT_OAUTH_CLIENT_ID", "test-client"), patch(
            "apps.accounts.views.verify_microsoft_credential",
            return_value={
                "sub": "microsoft-unverified-subject",
                "preferred_username": "existing@example.com",
                "xms_edov": True,
            },
        ):
            claims = verify_provider_credential(
                ExternalIdentity.Provider.MICROSOFT,
                "test-provider-id-token",
            )

        self.assertNotIn("email", claims)
        with self.assertRaises(AuthenticationFailed):
            from apps.accounts.views import resolve_external_user

            resolve_external_user(ExternalIdentity.Provider.MICROSOFT, claims)

    def test_provider_credential_must_match_server_issued_nonce(self):
        nonce = self.client.get(reverse("social-login-nonce")).data["nonce"]
        with patch("apps.accounts.views.verify_provider_credential", return_value={
            "sub": "google-sub-replay",
            "email": "replay@example.com",
            "email_verified": True,
            "nonce": "not-the-issued-nonce",
        }):
            response = self.client.post(
                reverse("google-login"),
                {"credential": "test-provider-id-token", "nonce": nonce},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email="replay@example.com").exists())


class PasswordRuleTests(AuthBase):
    CASES = {
        "no uppercase": ("alllowercase1!", "uppercase"),
        "no lowercase": ("ALLUPPERCASE1!", "lowercase"),
        "no digit": ("NoDigitsHere!!", "number"),
        "too short": ("Ab1!", None),
        "all numeric": ("12345678901", None),
        "common": ("Password1", None),
    }

    def test_registration_rejects_weak_passwords(self):
        for name, (pw, word) in self.CASES.items():
            with self.subTest(name):
                resp = self.register(f"{abs(hash(name))}@example.com", f"u{abs(hash(name))}", pw)
                self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, resp.data)
                if word:
                    self.assertIn(word, " ".join(map(str, resp.data["password"])))

    def test_reset_rejects_weak_passwords_and_keeps_link_valid(self):
        user = self.make_user()
        uid, token = urlsafe_base64_encode(force_bytes(user.pk)), password_reset_token.make_token(user)
        weak = self.client.post(reverse("password-reset-confirm"), {
            "uid": uid, "token": token, "new_password": "alllowercase1", "confirm_password": "alllowercase1",
        }, format="json")
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertTrue(user.check_password(GOOD_PASSWORD))  # unchanged
        ok = self.client.post(reverse("password-reset-confirm"), {
            "uid": uid, "token": token, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD,
        }, format="json")
        self.assertEqual(ok.status_code, status.HTTP_200_OK, ok.data)  # link survived the failed attempt

    def test_reset_requires_matching_confirmation(self):
        user = self.make_user()
        resp = self.client.post(reverse("password-reset-confirm"), {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": password_reset_token.make_token(user),
            "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD + "x",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_passwords_cannot_start_or_end_with_whitespace(self):
        # Regression: reset used to accept these, but login trims them, so the
        # user could never sign in again.
        for pw in (GOOD_PASSWORD + " ", " " + GOOD_PASSWORD, GOOD_PASSWORD + "\t"):
            with self.subTest(repr(pw)):
                resp = self.register(f"{abs(hash(pw))}@example.com", f"u{abs(hash(pw))}", pw)
                self.assertEqual(resp.status_code, 400)
                self.assertIn("space", " ".join(map(str, resp.data["password"])))
        user = self.make_user()
        resp = self.client.post(reverse("password-reset-confirm"), {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": password_reset_token.make_token(user),
            "new_password": NEW_PASSWORD + " ", "confirm_password": NEW_PASSWORD + " ",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_password_with_unicode_letters_counts_as_upper_and_lower(self):
        self.assertEqual(self.register("u@example.com", "uni", "Ünïcode-pass-7").status_code, 201)


class EmailVerificationLinkTests(AuthBase):
    def start(self):
        self.register()
        self.user = User.objects.get(username="learner")
        return link_from_email(mail.outbox[-1])

    def verify(self, uid, token):
        return self.client.post(reverse("email-verify"), {"uid": uid, "token": token}, format="json")

    def test_link_works_once_then_is_rejected_as_reused(self):
        uid, token, _ = self.start()
        self.assertEqual(self.verify(uid, token).status_code, 200)
        reused = self.verify(uid, token)
        self.assertEqual(reused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", reused.data["detail"])

    def test_link_valid_just_inside_24_hours(self):
        uid, token, _ = self.start()
        with in_future(hours=23, minutes=59):
            self.assertEqual(self.verify(uid, token).status_code, 200)

    def test_link_expires_after_24_hours(self):
        uid, token, _ = self.start()
        with in_future(hours=24, minutes=1):
            resp = self.verify(uid, token)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)

    def test_expired_link_can_be_replaced_by_resending(self):
        uid, token, _ = self.start()
        mail.outbox.clear()
        resp = self.client.post(reverse("email-resend-verification"), {"email": "LEARNER@example.com"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        new_uid, new_token, _ = link_from_email(mail.outbox[0])
        self.assertEqual(self.verify(new_uid, new_token).status_code, 200)

    def test_tampered_token_and_wrong_uid_are_rejected(self):
        uid, token, _ = self.start()
        other = self.make_user("other@example.com", "other", verified=False)
        self.assertEqual(self.verify(uid, token[:-1] + ("a" if token[-1] != "a" else "b")).status_code, 400)
        self.assertEqual(self.verify(urlsafe_base64_encode(force_bytes(other.pk)), token).status_code, 400)
        self.assertEqual(self.verify("!!!", token).status_code, 400)
        self.assertEqual(self.verify(uid, "").status_code, 400)

    def test_password_reset_token_cannot_verify_an_email(self):
        uid, _, _ = self.start()
        reset_token = password_reset_token.make_token(self.user)
        self.assertEqual(self.verify(uid, reset_token).status_code, 400)

    def test_resend_does_not_disclose_accounts(self):
        self.make_user("done@example.com", "done", verified=True)
        mail.outbox.clear()
        a = self.client.post(reverse("email-resend-verification"), {"email": "done@example.com"}, format="json")
        b = self.client.post(reverse("email-resend-verification"), {"email": "ghost@example.com"}, format="json")
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))
        self.assertEqual(len(mail.outbox), 0)


class PasswordResetLinkTests(AuthBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user()

    def request_reset(self, email="verified@example.com"):
        mail.outbox.clear()
        resp = self.client.post(reverse("password-reset"), {"email": email}, format="json")
        self.assertEqual(resp.status_code, 200)
        return resp

    def confirm(self, uid, token, password=NEW_PASSWORD):
        return self.client.post(reverse("password-reset-confirm"), {
            "uid": uid, "token": token, "new_password": password, "confirm_password": password,
        }, format="json")

    def emailed_link(self):
        self.request_reset()
        self.assertEqual(len(mail.outbox), 1)
        uid, token, path = link_from_email(mail.outbox[0])
        self.assertEqual(path, "/reset-password")
        return uid, token

    def test_full_flow_from_email_to_new_login(self):
        uid, token = self.emailed_link()
        mail.outbox.clear()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.assertEqual(len(mail.outbox), 1)  # "your password was changed" notice
        self.assertEqual(self.login("verified@example.com", GOOD_PASSWORD).status_code, 401)
        self.assertEqual(self.login("verified@example.com", NEW_PASSWORD).status_code, 200)

    def test_request_accepts_any_email_casing(self):
        self.request_reset("  VERIFIED@Example.COM ")
        self.assertEqual(len(mail.outbox), 1)

    def test_reused_link_is_rejected(self):
        uid, token = self.emailed_link()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        again = self.confirm(uid, token, "Yet-another-Pass-77")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", again.data["detail"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))  # second attempt changed nothing

    def test_link_valid_just_inside_one_hour(self):
        uid, token = self.emailed_link()
        with in_future(minutes=59):
            self.assertEqual(self.confirm(uid, token).status_code, 200)

    def test_link_expires_after_one_hour(self):
        uid, token = self.emailed_link()
        with in_future(minutes=61):
            resp = self.confirm(uid, token)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(GOOD_PASSWORD))

    def test_expired_link_is_replaced_by_requesting_a_new_one(self):
        old_uid, old_token = self.emailed_link()
        with in_future(minutes=90):
            self.assertEqual(self.confirm(old_uid, old_token).status_code, 400)
        new_uid, new_token = self.emailed_link()
        self.assertEqual(self.confirm(new_uid, new_token).status_code, 200)

    def test_link_dies_when_password_changes_by_another_route(self):
        uid, token = self.emailed_link()
        self.user.set_password("Changed-elsewhere-9A")
        self.user.save()
        self.assertEqual(self.confirm(uid, token).status_code, 400)

    def test_link_for_one_user_cannot_reset_another(self):
        uid, token = self.emailed_link()
        victim = self.make_user("victim@example.com", "victim")
        resp = self.confirm(urlsafe_base64_encode(force_bytes(victim.pk)), token)
        self.assertEqual(resp.status_code, 400)
        victim.refresh_from_db()
        self.assertTrue(victim.check_password(GOOD_PASSWORD))

    def test_garbage_links_are_rejected_without_server_errors(self):
        for uid, token in [("", ""), ("abc", "def"), ("!!", "1-2"), ("MQ", "notatoken"), ("MQ", "zzzzzz-" + "a" * 20)]:
            with self.subTest(uid=uid, token=token):
                self.assertEqual(self.confirm(uid, token).status_code, 400)

    def test_reset_signs_out_existing_sessions(self):
        login = self.login("verified@example.com")
        refresh = login.cookies["refresh_token"].value
        uid, token = self.emailed_link()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.assertTrue(BlacklistedToken.objects.exists())
        self.client.cookies["refresh_token"] = refresh
        resp = self.client.post(reverse("login-refresh"), {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_request_does_not_disclose_account_existence(self):
        self.make_user("unverified@example.com", "unv", verified=False)
        self.make_user("inactive@example.com", "ina", is_active=False)
        known = self.client.post(reverse("password-reset"), {"email": "verified@example.com"}, format="json")
        mail.outbox.clear()
        for email in ("ghost@example.com", "unverified@example.com", "inactive@example.com"):
            resp = self.client.post(reverse("password-reset"), {"email": email}, format="json")
            self.assertEqual((resp.status_code, resp.data), (known.status_code, known.data))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["unverified@example.com"])

    def test_unverified_user_can_complete_password_reset_without_being_auto_verified(self):
        self.user.email_verified = False
        self.user.save(update_fields=["email_verified"])
        uid, token = self.emailed_link()

        self.assertEqual(self.confirm(uid, token).status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)
        self.assertEqual(self.login(self.user.email, NEW_PASSWORD).status_code, status.HTTP_200_OK)

    def test_reset_request_is_rate_limited(self):
        codes = [
            self.client.post(reverse("password-reset"), {"email": "verified@example.com"}, format="json").status_code
            for _ in range(7)
        ]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, codes[5:])

    def test_email_provider_outage_is_invisible_to_the_caller(self):
        with patch("apps.accounts.services.send_mail", side_effect=OSError("smtp down")):
            resp = self.client.post(reverse("password-reset"), {"email": "verified@example.com"}, format="json")
        self.assertEqual(resp.status_code, 200)

    def test_lifetimes_are_configured_as_documented(self):
        self.assertEqual(settings.PASSWORD_RESET_TIMEOUT, 3600)
        self.assertEqual(settings.EMAIL_VERIFICATION_TIMEOUT, 86400)
        self.assertIsNotNone(email_verification_token)


class TokenLifetimeTests(AuthBase):
    def test_jwt_lifetimes_match_the_docs(self):
        self.assertEqual(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(minutes=15))
        self.assertEqual(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"], timedelta(days=7))


class LockoutSafetyTests(AuthBase):
    """Guards for 'my changes must not lock anyone out of login'."""

    def test_legacy_accounts_differing_only_by_case_can_still_log_in(self):
        a = self.make_user("dup@example.com", "dup_a")
        b = self.make_user("other@example.com", "dup_b")
        User.objects.filter(pk=b.pk).update(email="DUP@example.com")   # legacy row, bypassing save()
        self.assertEqual(self.login("dup@example.com").status_code, 200)   # exact match wins
        self.assertEqual(self.login("DUP@example.com").status_code, 200)

    def test_verify_users_command_marks_accounts_as_verified(self):
        from django.core.management import call_command
        user = self.make_user("stuck@example.com", "stuck", verified=False)
        self.assertEqual(self.login("stuck@example.com").status_code, status.HTTP_200_OK)
        call_command("verify_users", "STUCK@example.com", stdout=__import__("io").StringIO())
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertEqual(self.login("stuck@example.com").status_code, 200)

    def test_verify_all(self):
        from django.core.management import call_command
        self.make_user("a1@example.com", "a1", verified=False)
        self.make_user("a2@example.com", "a2", verified=False)
        call_command("verify_users", "--all", stdout=__import__("io").StringIO())
        self.assertFalse(User.objects.filter(email_verified=False).exists())

    def test_existing_passwords_are_unaffected_by_new_complexity_rules(self):
        # Rules only apply when a password is SET; an old, simple password still logs in.
        u = self.make_user("old@example.com", "old")
        u.set_password("simplepass")     # would fail the new validator, but set_password doesn't validate
        u.save()
        self.assertEqual(self.login("old@example.com", "simplepass").status_code, 200)

    def test_refresh_token_survives_restart_of_session(self):
        self.make_user()
        login = self.login("verified@example.com")
        self.assertEqual(login.status_code, 200)
        r = self.client.post(reverse("login-refresh"), {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("access", r.data)
        self.assertTrue(r.cookies["access_token"]["httponly"])
        self.assertTrue(r.cookies["refresh_token"]["httponly"])
