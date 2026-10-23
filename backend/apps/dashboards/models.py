from __future__ import annotations

from datetime import date, timedelta

from django.conf import settings
from django.db import models

from apps.courses.models import Course


class PerformanceSnapshot(models.Model):
    """One row per student/course/week, matching the risk-engine contract."""

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="performance_snapshots")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="performance_snapshots")
    week_start = models.DateField()

    quiz_avg = models.FloatField(default=0)
    assignment_avg = models.FloatField(default=0)
    exam_avg = models.FloatField(default=0)
    completion_rate = models.FloatField(default=0)
    retries = models.IntegerField(default=0)
    deadlines_missed = models.IntegerField(default=0)

    login_count = models.IntegerField(default=0)
    active_days = models.IntegerField(default=0)
    time_spent_minutes = models.FloatField(default=0)
    video_watch_minutes = models.FloatField(default=0)
    content_consumed_pct = models.FloatField(default=0)

    attendance_rate = models.FloatField(default=0)
    late_submissions = models.IntegerField(default=0)
    inactivity_streak_days = models.IntegerField(default=0)
    resources_opened = models.IntegerField(default=0)
    skipped_lessons = models.IntegerField(default=0)

    class Meta:
        unique_together = ("student", "course", "week_start")
        indexes = [models.Index(fields=["student", "course", "week_start"])]

    @staticmethod
    def _week_bounds(week_start: date):
        return week_start, week_start + timedelta(days=7)

    @classmethod
    def snapshot_for_student_course(cls, student, course, week_start):
        from apps.quizzes.models import QuizAttempt
        from apps.submissions.models import Submission, SubmissionStatus
        from apps.progress.models import ActivityCompletion
        from apps.courses.models import Activity, Module, Lesson

        start, end = cls._week_bounds(week_start)

        quiz_attempts = QuizAttempt.objects.filter(
            student=student,
            quiz__activity__lesson__module__course=course,
            submitted_at__gte=start,
            submitted_at__lt=end,
        )
        assignment_submissions = Submission.objects.filter(
            student=student,
            activity__lesson__module__course=course,
            submitted_at__gte=start,
            submitted_at__lt=end,
        )

        quiz_avg = quiz_attempts.aggregate(avg=models.Avg("percentage"))["avg"] or 0
        assignment_avg = assignment_submissions.filter(status=SubmissionStatus.GRADED).aggregate(avg=models.Avg("grade"))["avg"] or 0
        completed_activity_count = ActivityCompletion.objects.filter(
            student=student,
            activity__lesson__module__course=course,
            completed_at__gte=start,
            completed_at__lt=end,
        ).count()
        total_activities = Activity.objects.filter(lesson__module__course=course).count() or 1
        completion_rate = min(1.0, max(0.0, completed_activity_count / total_activities))

        retries = quiz_attempts.count() + assignment_submissions.filter(status=SubmissionStatus.SUBMITTED).count()
        deadlines_missed = (
            assignment_submissions.filter(status=SubmissionStatus.SUBMITTED)
            .exclude(activity__deadline__isnull=True)
            .filter(submitted_at__gt=models.F("activity__deadline"))
            .count()
        )

        # Heuristic defaults for engagement fields until real telemetry exists.
        login_count = max(1, quiz_attempts.count() + assignment_submissions.count())
        active_days = min(7, max(1, (quiz_attempts.count() + assignment_submissions.count())))
        time_spent_minutes = float(login_count * 18)
        from django.db.models import Sum
        from apps.progress.models import VideoProgress
        video_seconds = VideoProgress.objects.filter(
            student=student, lesson__module__course=course,
            updated_at__gte=start, updated_at__lt=end,  # approximation: lessons watched this week
        ).aggregate(t=Sum("watched_seconds"))["t"] or 0.0
        video_watch_minutes = video_seconds / 60.0
        content_consumed_pct = completion_rate

        total_modules = Module.objects.filter(course=course).count() or 1
        resources_opened = Lesson.objects.filter(module__course=course).count()
        skipped_lessons = max(0, total_modules - completed_activity_count)

        return {
            "quiz_avg": float(quiz_avg),
            "assignment_avg": float(assignment_avg),
            "exam_avg": 0.0,
            "completion_rate": float(completion_rate),
            "retries": int(retries),
            "deadlines_missed": int(deadlines_missed),
            "login_count": int(login_count),
            "active_days": int(active_days),
            "time_spent_minutes": float(time_spent_minutes),
            "video_watch_minutes": float(video_watch_minutes),
            "content_consumed_pct": float(content_consumed_pct),
            "attendance_rate": 1.0 if login_count > 0 else 0.0,
            "late_submissions": int(assignment_submissions.filter(status=SubmissionStatus.SUBMITTED).count()),
            "inactivity_streak_days": 0,
            "resources_opened": int(resources_opened),
            "skipped_lessons": int(skipped_lessons),
        }

    def __str__(self):
        return f"{self.student} — {self.course} — {self.week_start}"
