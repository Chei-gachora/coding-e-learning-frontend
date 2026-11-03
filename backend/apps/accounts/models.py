from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models


class Role(models.TextChoices):
    STUDENT = "student", "Student"
    INSTRUCTOR = "instructor", "Instructor"
    ADMIN = "admin", "Admin"


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields["role"] = Role.ADMIN
        extra_fields.setdefault("email_verified", True)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """
    Extends Django's built-in user with a role.
    email is used as the login identifier instead of username.
    """
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    is_approved = models.BooleanField(default=True)
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    bio = models.CharField(max_length=500, blank=True)
    profile_photo = models.ImageField(upload_to="profile_photos/", blank=True, null=True)
    leaderboard_opt_in = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    objects = UserManager()

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class ExternalIdentity(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        MICROSOFT = "microsoft", "Microsoft"
        APPLE = "apple", "Apple"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="external_identities",
    )
    provider = models.CharField(max_length=16, choices=Provider.choices)
    subject = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "subject"),
                name="accounts_ext_provider_subject_uq",
            ),
            models.UniqueConstraint(
                fields=("user", "provider"),
                name="accounts_ext_user_provider_uq",
            ),
        ]

    def __str__(self):
        return f"{self.provider} identity for user {self.user_id}"
