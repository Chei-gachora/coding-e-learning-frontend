from django.conf import settings
from django.db import models

from apps.courses.models import Course


class Enrollment(models.Model):
    class LearningMode(models.TextChoices):
        SELF_PACED = "self_paced", "Self-paced"
        INSTRUCTOR_LED = "instructor_led", "Instructor-led"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    learning_mode = models.CharField(
        max_length=20,
        choices=LearningMode.choices,
        default=LearningMode.SELF_PACED,
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student} enrolled in {self.course}"
