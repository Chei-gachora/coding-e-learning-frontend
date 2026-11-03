from django.conf import settings
from django.db import models

from apps.courses.models import Activity


class ActivityCompletion(models.Model):
    """
    A record that a student has completed a specific activity.
    Created by the submissions/quizzes apps when work is graded as passing —
    this table is the single source of truth that module-locking checks
    against, so completion logic doesn't get duplicated in multiple places.
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_completions"
    )
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)
    score = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "activity")
        indexes = [
            models.Index(fields=["student", "activity"]),
        ]

    def __str__(self):
        return f"{self.student} completed {self.activity}"


class VideoProgress(models.Model):
    """Per-student, per-lesson video watch state, written by the player's heartbeat.

    ``intervals`` holds merged [start, end] second ranges the student genuinely
    *played through* (see video.apply_ping). ``watched_seconds`` is the total
    length of those ranges, so skipping ahead earns nothing and re-watching
    the same part isn't counted twice. ``position_seconds`` is only the resume
    point.
    """
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="video_progress")
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.CASCADE, related_name="video_progress")
    position_seconds = models.FloatField(default=0)
    duration_seconds = models.FloatField(default=0)
    intervals = models.JSONField(default=list)
    watched_seconds = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_ping_at = models.DateTimeField(null=True, blank=True)
    last_playing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("student", "lesson"),)

    @property
    def percent(self):
        return round(min(100.0, self.watched_seconds / self.duration_seconds * 100), 1) if self.duration_seconds else 0.0
