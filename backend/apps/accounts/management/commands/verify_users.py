"""Break-glass for account access.

    python manage.py verify_users --all                # mark every account's email verified
    python manage.py verify_users a@x.com b@y.com      # only these
    python manage.py verify_users a@x.com --set-password   # also prompt for a new password

Use when verification/reset emails can't be delivered (SMTP not configured yet, provider
outage) so nobody is locked out. Matching is case-insensitive.
"""
import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Mark user emails as verified (and optionally set a password) without sending email."

    def add_arguments(self, parser):
        parser.add_argument("emails", nargs="*")
        parser.add_argument("--all", action="store_true", help="verify every account")
        parser.add_argument("--set-password", action="store_true", help="prompt for a new password (single user only)")

    def handle(self, *args, emails, all, set_password, **opts):
        User = get_user_model()
        if not emails and not all:
            raise CommandError("Give one or more emails, or --all.")
        qs = User.objects.all() if all else User.objects.none()
        for email in emails:
            found = User.objects.filter(email__iexact=email.strip())
            if not found.exists():
                self.stderr.write(self.style.WARNING(f"No account for {email}"))
            qs = qs | found
        users = list(qs.distinct())
        if set_password:
            if len(users) != 1:
                raise CommandError("--set-password needs exactly one matching account.")
            pw = getpass.getpass("New password: ")
            try:
                validate_password(pw, users[0])
            except ValidationError as exc:
                raise CommandError("; ".join(exc.messages))
            users[0].set_password(pw)
            users[0].save()
        updated = User.objects.filter(pk__in=[u.pk for u in users], email_verified=False).update(email_verified=True)
        self.stdout.write(self.style.SUCCESS(f"{len(users)} account(s) matched, {updated} newly verified."))
