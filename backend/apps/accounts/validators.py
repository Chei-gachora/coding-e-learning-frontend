"""Password rules that go beyond Django's built-ins.

The same rules are shown as a live checklist in the React app
(frontend/src/lib/passwordRules.js) — change both together.
"""
import re

from django.core.exceptions import ValidationError


class PasswordComplexityValidator:
    """Require at least one uppercase letter, one lowercase letter and one digit.

    Uses Unicode-aware checks (str.isupper/islower/isdigit) so "É", "ß" or
    Arabic-Indic digits count correctly instead of only ASCII A-Z.
    """

    def validate(self, password, user=None):
        # Login (SimpleJWT) trims stray edge whitespace from what people type.
        # If a password could *start or end* with a space it could never be
        # matched at login, locking the user out — so refuse to create one.
        if password != password.strip():
            raise ValidationError(
                "Password can't start or end with a space.", code="password_edge_whitespace"
            )
        problems = []
        if not any(ch.isupper() for ch in password):
            problems.append("an uppercase letter (A-Z)")
        if not any(ch.islower() for ch in password):
            problems.append("a lowercase letter (a-z)")
        if not re.search(r"\d", password):
            problems.append("a number (0-9)")
        if problems:
            raise ValidationError(
                "Password must include " + ", ".join(problems) + ".",
                code="password_too_simple",
            )

    def get_help_text(self):
        return "Your password must contain an uppercase letter, a lowercase letter and a number."
