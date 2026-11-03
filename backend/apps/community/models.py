from django.conf import settings
from django.db import models

from apps.courses.models import Course, Lesson


class StudentBookmark(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lesson_bookmarks",
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="student_bookmarks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=("student", "lesson"), name="uniq_student_lesson_bookmark"
            )
        ]

    def __str__(self):
        return f"{self.student} — {self.lesson}"


class DiscussionThread(models.Model):
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="discussion_threads"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="discussion_threads",
    )
    title = models.CharField(max_length=180)
    body = models.TextField(max_length=10_000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return self.title


class DiscussionReply(models.Model):
    thread = models.ForeignKey(
        DiscussionThread, on_delete=models.CASCADE, related_name="replies"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="discussion_replies",
    )
    body = models.TextField(max_length=10_000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Reply by {self.author} on {self.thread}"
