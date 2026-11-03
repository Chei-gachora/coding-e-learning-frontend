from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class CaseInsensitiveEmailBackend(ModelBackend):
    """Authenticate by email regardless of letter case or stray whitespace.

    User.save() lower-cases emails, but rows created by fixtures, raw SQL or
    an old import may not be normalised, so we match with ``iexact`` too.
    Passwords stay strictly case-sensitive and are never trimmed.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        identifier = username if username is not None else kwargs.get(User.USERNAME_FIELD)
        if identifier is None or password is None:
            return None
        identifier = str(identifier).strip()
        field = User.USERNAME_FIELD
        # 1) exact match always wins, so legacy accounts that differ only by case still work;
        # 2) otherwise accept a single case-insensitive match.
        users = list(User.objects.filter(**{field: identifier})[:2]) or \
            list(User.objects.filter(**{f"{field}__iexact": identifier})[:2])
        if len(users) != 1:
            User().set_password(password)  # constant-ish timing
            return None
        user = users[0]
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
