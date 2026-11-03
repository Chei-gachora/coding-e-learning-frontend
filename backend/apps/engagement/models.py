import uuid

from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Achievement(models.Model):
    class Category(models.TextChoices):
        BADGE = "badge", "Badge"
        MILESTONE = "milestone", "Milestone"
        STREAK = "streak", "Streak"

    class Metric(models.TextChoices):
        ACTIVITIES = "activities", "Completed activities"
        COURSES = "courses", "Completed courses"
        STREAK_DAYS = "streak_days", "Consecutive study days"

    code = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=16, choices=Category.choices)
    metric = models.CharField(max_length=20, choices=Metric.choices)
    threshold = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category", "threshold", "name"]

    def __str__(self):
        return self.name


class StudentStreak(models.Model):
    student = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_streak"
    )
    current_days = models.PositiveIntegerField(default=0)
    longest_days = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class Certificate(models.Model):
    class Status(models.TextChoices):
        ISSUED = "issued", "Issued"
        REVOKED = "revoked", "Revoked"

    certificate_number = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates"
    )
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="certificates")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ISSUED)
    completed_at = models.DateTimeField()
    issued_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.CharField(max_length=500, blank=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revoked_certificates",
    )

    class Meta:
        ordering = ["-issued_at"]


class LearningActivityDay(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_activity_days"
    )
    activity_date = models.DateField()

    class Meta:
        ordering = ["-activity_date"]
        constraints = [
            models.UniqueConstraint(fields=("student", "activity_date"), name="uniq_student_activity_day")
        ]


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=40)
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=500)
    url = models.CharField(max_length=255, blank=True)
    dedupe_key = models.CharField(max_length=150, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=("recipient", "read_at", "created_at"),
                name="engagement__recipie_3d3b6f_idx",
            )
        ]


class StudentAchievement(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="awards")
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-earned_at"]
        constraints = [
            models.UniqueConstraint(fields=("student", "achievement"), name="uniq_student_achievement")
        ]


class Organization(models.Model):
    name = models.CharField(max_length=160, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Team(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="teams"
    )
    name = models.CharField(max_length=120)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["organization__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "name"), name="uniq_team_name_per_org"
            )
        ]

    def __str__(self):
        return f"{self.organization}: {self.name}"


class TeamMembership(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
        limit_choices_to={"role": "student"},
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("student",), name="uniq_student_team_membership")
        ]

    def __str__(self):
        return f"{self.student} — {self.team}"