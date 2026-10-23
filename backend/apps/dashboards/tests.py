from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.courses.models import Activity, ActivityType, Course, Lesson, Module
from apps.enrollment.models import Enrollment
from apps.progress.models import ActivityCompletion
from apps.quizzes.models import Quiz, QuizAttempt
from apps.dashboards.models import PerformanceSnapshot

User = get_user_model()


class PerformanceSnapshotTests(TestCase):
    def test_compute_snapshots_creates_weekly_student_course_rows(self):
        instructor = User.objects.create_user(
            username="ins-1",
            email="ins1@example.com",
            password="Pass123!",
            role="instructor",
        )
        student = User.objects.create_user(
            username="stu-1",
            email="stu1@example.com",
            password="Pass123!",
            role="student",
        )

        course = Course.objects.create(title="Risk Course", instructor=instructor)
        module = Module.objects.create(course=course, title="Week 1", order=1)
        lesson = Lesson.objects.create(module=module, title="Introduction", order=1)
        activity = Activity.objects.create(
            lesson=lesson,
            activity_type=ActivityType.QUIZ,
            title="Knowledge check",
            max_score=100,
            is_required=True,
        )
        quiz = Quiz.objects.create(activity=activity, time_limit_minutes=20, pass_mark_percentage=70)

        Enrollment.objects.create(student=student, course=course)
        QuizAttempt.objects.create(
            student=student,
            quiz=quiz,
            attempt_number=1,
            answers={"1": 0},
            score=80,
            total_marks=100,
            percentage=80,
            passed=True,
            submitted_at=date.today() - timedelta(days=2),
        )

        week_start = date.today() - timedelta(days=date.today().weekday())
        call_command("compute_snapshots", week_start=week_start.isoformat(), course_id=course.id)

        snapshot = PerformanceSnapshot.objects.filter(
            student=student,
            course=course,
            week_start=week_start,
        ).first()

        self.assertIsNotNone(snapshot)
        self.assertGreater(snapshot.quiz_avg, 0)
        self.assertGreaterEqual(snapshot.completion_rate, 0)


class AdminDashboardStudentListTests(TestCase):
    def test_admin_dashboard_lists_all_registered_students_even_without_enrollment(self):
        admin = User.objects.create_user(
            username="admin-1",
            email="admin1@example.com",
            password="Pass123!",
            role="admin",
        )
        instructor = User.objects.create_user(
            username="ins-2",
            email="ins2@example.com",
            password="Pass123!",
            role="instructor",
        )
        enrolled_student = User.objects.create_user(
            username="stu-enrolled",
            email="enrolled@example.com",
            password="Pass123!",
            role="student",
        )
        unassigned_student = User.objects.create_user(
            username="stu-unassigned",
            email="unassigned@example.com",
            password="Pass123!",
            role="student",
        )
        course = Course.objects.create(title="Intro to LMS", instructor=instructor)
        Enrollment.objects.create(student=enrolled_student, course=course)

        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get('/api/dashboard/admin/')

        self.assertEqual(response.status_code, 200)
        students = response.data["registered_students"]
        self.assertEqual(len(students), 2)
        student_emails = {student["email"] for student in students}
        self.assertIn(enrolled_student.email, student_emails)
        self.assertIn(unassigned_student.email, student_emails)
        self.assertIn("enrolled_courses", students[0])

    def test_admin_can_review_and_approve_pending_learners(self):
        admin = User.objects.create_user(
            username="admin-approval",
            email="admin-approval@example.com",
            password="Test-password-123!",
            role="admin",
        )
        pending = User.objects.create_user(
            username="pending-learner",
            email="pending-learner@example.com",
            password="Test-password-123!",
            role="student",
            email_verified=True,
            is_approved=False,
            is_active=False,
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        dashboard = client.get("/api/dashboard/admin/")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data["total_students"], 0)
        self.assertEqual(dashboard.data["pending_learner_approval_count"], 1)
        self.assertEqual(
            dashboard.data["pending_learner_approvals"][0]["id"], pending.id
        )

        pending_list = client.get("/api/dashboard/admin/learner-approvals/")
        self.assertEqual(pending_list.status_code, 200)
        self.assertEqual([item["id"] for item in pending_list.data], [pending.id])

        approved = client.post(
            f"/api/dashboard/admin/learner-approvals/{pending.id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)
        pending.refresh_from_db()
        self.assertTrue(pending.is_approved)
        self.assertTrue(pending.is_active)

        dashboard_after_approval = client.get("/api/dashboard/admin/")
        self.assertEqual(dashboard_after_approval.data["total_students"], 1)
        self.assertEqual(dashboard_after_approval.data["pending_learner_approval_count"], 0)

    def test_admin_cannot_approve_learner_before_email_verification(self):
        admin = User.objects.create_user(
            username="admin-unverified-approval",
            email="admin-unverified-approval@example.com",
            password="Admin-Strong-Pass-123!",
            role="admin",
        )
        pending = User.objects.create_user(
            username="unverified-learner",
            email="unverified-learner@example.com",
            password="Learner-Strong-Pass-123!",
            role="student",
            is_approved=False,
            is_active=False,
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.post(
            f"/api/dashboard/admin/learner-approvals/{pending.id}/approve/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("verify their email", response.data["detail"])
        pending.refresh_from_db()
        self.assertFalse(pending.is_approved)
        self.assertFalse(pending.is_active)

    def test_non_admin_cannot_list_or_approve_pending_learners(self):
        learner = User.objects.create_user(
            username="learner-no-approve",
            email="learner-no-approve@example.com",
            password="Test-password-123!",
            role="student",
        )
        pending = User.objects.create_user(
            username="pending-no-approve",
            email="pending-no-approve@example.com",
            password="Test-password-123!",
            role="student",
            is_approved=False,
            is_active=False,
        )
        client = APIClient()
        client.force_authenticate(user=learner)
        self.assertEqual(client.get("/api/dashboard/admin/learner-approvals/").status_code, 403)
        self.assertEqual(
            client.post(
                f"/api/dashboard/admin/learner-approvals/{pending.id}/approve/",
                {},
                format="json",
            ).status_code,
            403,
        )


class InstructorDashboardCourseScopeTests(TestCase):
    def test_instructor_sees_owned_courses_and_admin_sees_all_courses(self):
        from apps.accounts.testing import World

        world = World()
        instructor_client = APIClient()
        instructor_client.force_authenticate(user=world.instructor_a)
        admin_client = APIClient()
        admin_client.force_authenticate(user=world.admin)

        instructor_response = instructor_client.get("/api/dashboard/instructor/")
        admin_response = admin_client.get("/api/dashboard/instructor/")

        self.assertEqual(instructor_response.status_code, 200)
        self.assertEqual(
            {course["id"] for course in instructor_response.data["my_courses"]},
            {world.course_a.id},
        )
        self.assertEqual(admin_response.status_code, 200)
        self.assertEqual(
            {course["id"] for course in admin_response.data["my_courses"]},
            {world.course_a.id, world.course_b.id},
        )


class StudentDashboardLearningPathTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="path-student",
            email="path-student@example.com",
            password="Pass123!",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.student)

    def test_empty_enrollment_returns_no_current_course(self):
        response = self.client.get("/api/dashboard/student/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["enrolled_courses"], [])
        self.assertIsNone(response.data["current_course"])

    def test_path_is_built_from_course_modules_and_progress(self):
        instructor = User.objects.create_user(
            username="path-instructor",
            email="path-instructor@example.com",
            password="Pass123!",
            role="instructor",
        )
        course = Course.objects.create(title="Database Course", instructor=instructor)
        modules = [
            Module.objects.create(course=course, title=f"Database Topic {index}", order=index)
            for index in range(1, 4)
        ]
        lessons = [
            Lesson.objects.create(module=module, title=f"Lesson {index}", order=1)
            for index, module in enumerate(modules, start=1)
        ]
        completed_activity = Activity.objects.create(
            lesson=lessons[0], activity_type=ActivityType.LAB, title="Completed lab"
        )
        Activity.objects.create(
            lesson=lessons[1], activity_type=ActivityType.LAB, title="Current lab"
        )
        Activity.objects.create(
            lesson=lessons[2], activity_type=ActivityType.LAB, title="Locked lab"
        )
        ActivityCompletion.objects.create(student=self.student, activity=completed_activity)
        Enrollment.objects.create(student=self.student, course=course)

        response = self.client.get("/api/dashboard/student/")

        self.assertEqual(response.status_code, 200)
        course_data = response.data["current_course"]
        self.assertEqual(course_data["course_id"], course.id)
        self.assertEqual(course_data["current_lesson_id"], lessons[1].id)
        self.assertEqual(
            [module["status"] for module in course_data["modules"]],
            ["done", "active", "locked"],
        )
        self.assertEqual(
            [module["title"] for module in course_data["modules"]],
            [module.title for module in modules],
        )

    def test_upcoming_deadlines_exclude_completed_and_locked_activities(self):
        instructor = User.objects.create_user(
            username="deadline-instructor",
            email="deadline-instructor@example.com",
            password="Pass123!",
            role="instructor",
        )
        course = Course.objects.create(title="Deadline Course", instructor=instructor)
        first_module = Module.objects.create(course=course, title="Open module", order=1)
        locked_module = Module.objects.create(course=course, title="Locked module", order=2)
        first_lesson = Lesson.objects.create(module=first_module, title="Open lesson", order=1)
        locked_lesson = Lesson.objects.create(module=locked_module, title="Locked lesson", order=1)
        completed = Activity.objects.create(
            lesson=first_lesson,
            activity_type=ActivityType.LAB,
            title="Completed work",
            deadline=timezone.now() + timedelta(days=1),
        )
        upcoming = Activity.objects.create(
            lesson=first_lesson,
            activity_type=ActivityType.ASSIGNMENT,
            title="Upcoming work",
            deadline=timezone.now() + timedelta(days=2),
        )
        Activity.objects.create(
            lesson=locked_lesson,
            activity_type=ActivityType.LAB,
            title="Locked work",
            deadline=timezone.now() + timedelta(days=3),
        )
        ActivityCompletion.objects.create(student=self.student, activity=completed)
        Enrollment.objects.create(student=self.student, course=course)

        response = self.client.get("/api/dashboard/student/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["activity_id"] for item in response.data["upcoming_deadlines"]],
            [upcoming.id],
        )
