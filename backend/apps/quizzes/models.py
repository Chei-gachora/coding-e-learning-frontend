from django.conf import settings
from django.db import models

from apps.courses.models import Activity


class Quiz(models.Model):
    activity = models.OneToOneField(Activity, on_delete=models.CASCADE, related_name="quiz")
    time_limit_minutes = models.PositiveIntegerField(default=30)
    pass_mark_percentage = models.PositiveIntegerField(default=70)

    def __str__(self):
        return f"Quiz: {self.activity.title}"


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    marks = models.PositiveIntegerField(default=1)
    # choices: [{"text": "..."}, ...]  — index in this list is the choice id
    choices = models.JSONField()
    correct_choice_index = models.PositiveIntegerField()

    def __str__(self):
        return self.text[:60]


class QuizAttempt(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    attempt_number = models.PositiveIntegerField(default=1)

    # {"<question_id>": <chosen_choice_index>}
    answers = models.JSONField()

    score = models.FloatField()
    total_marks = models.FloatField()
    percentage = models.FloatField()
    passed = models.BooleanField()

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} — {self.quiz} ({self.percentage}%)"


class QuestionnaireResponse(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="questionnaire_responses",
    )
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name="questionnaire_responses",
    )
    answers = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("student", "activity"),
                name="uniq_student_questionnaire_response",
            )
        ]

    def __str__(self):
        return f"{self.student} — questionnaire {self.activity.title}"
