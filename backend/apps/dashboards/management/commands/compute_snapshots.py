from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Avg, F, Q

from apps.courses.models import Activity, ActivityType, Course, LessonAttachment
from apps.dashboards.models import PerformanceSnapshot
from apps.enrollment.models import Enrollment
from apps.progress.models import ActivityCompletion
from apps.quizzes.models import QuizAttempt
from apps.submissions.models import Submission, SubmissionStatus

User = get_user_model()


def _start_of_week(day: date) -> date:
    return day - timedelta(days=day.weekday())


class Command(BaseCommand):
    help = "Compute one weekly performance snapshot per student/course pair."

    def add_arguments(self, parser):
        parser.add_argument("--week-start", dest="week_start", default=None)
        parser.add_argument("--course-id", dest="course_id", type=int, default=None)
        parser.add_argument("--student-id", dest="student_id", type=int, default=None)

    def handle(self, *args, **options):
        week_start_raw = options["week_start"]
        week_start = (
            date.fromisoformat(week_start_raw)
            if week_start_raw
            else _start_of_week(date.today())
        )

        students = User.objects.filter(role="student")
        if options["student_id"]:
            students = students.filter(id=options["student_id"])

        courses = Course.objects.all()
        if options["course_id"]:
            courses = courses.filter(id=options["course_id"])

        created = 0
        for student in students:
            for course in courses:
                if not Enrollment.objects.filter(student=student, course=course).exists():
                    continue

                snapshot, was_created = PerformanceSnapshot.objects.update_or_create(
                    student=student,
                    course=course,
                    week_start=week_start,
                    defaults=PerformanceSnapshot.snapshot_for_student_course(student, course, week_start),
                )
                created += 1 if was_created else 0

        self.stdout.write(
            self.style.SUCCESS(
                f"Created/updated {created} snapshot rows for week {week_start.isoformat()}."
            )
        )
