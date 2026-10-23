from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.courses.models import Course
from apps.enrollment.models import Enrollment

from . import services

User = get_user_model()


class AllocationTests(TestCase):
    def setUp(self):
        self.busy = User.objects.create_user(username="busy", email="busy@example.com", password="x", role="instructor")
        self.free = User.objects.create_user(username="free", email="free@example.com", password="x", role="instructor")
        self.big_course = Course.objects.create(title="Popular Course", instructor=self.busy)
        self.small_course = Course.objects.create(title="Quiet Course", instructor=self.free)

        for i in range(45):
            student = User.objects.create_user(username=f"s{i}", email=f"s{i}@example.com", password="x", role="student")
            Enrollment.objects.create(student=student, course=self.big_course)

    def test_single_course_overload_is_flagged(self):
        plan = services.get_allocation_plan()
        types = [r["type"] for r in plan["recommendations"]]
        self.assertIn("single_course_overload", types)

    def test_course_metrics_reflect_real_enrollment(self):
        plan = services.get_allocation_plan()
        big = next(c for c in plan["course_metrics"] if c["course_title"] == "Popular Course")
        self.assertEqual(big["enrolled"], 45)
