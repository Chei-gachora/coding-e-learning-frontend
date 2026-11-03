"""
Sanity checks for the mastery-based sequencing logic. Uses real Django
ORM fixtures (not mocks) since the whole point of this engine is how it
reads across several real models — worth testing that wiring directly.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.courses.models import Activity, ActivityType, Course, Lesson, Module
from apps.enrollment.models import Enrollment
from apps.progress.services import mark_activity_complete

from . import services

User = get_user_model()


class SequencingTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(username="instr", email="i@example.com", password="x", role="instructor")
        self.student = User.objects.create_user(username="stu", email="s@example.com", password="x", role="student")
        self.course = Course.objects.create(title="Full-Stack Web Dev", instructor=self.instructor)
        self.module1 = Module.objects.create(course=self.course, title="HTML", order=1)
        self.lesson1 = Lesson.objects.create(module=self.module1, title="HTML Basics", order=1)
        self.activity1 = Activity.objects.create(
            lesson=self.lesson1, activity_type=ActivityType.EXERCISE, title="HTML Exercise", is_required=True
        )
        Enrollment.objects.create(student=self.student, course=self.course)

    def test_no_recommendation_before_any_history_is_still_a_continue_step(self):
        rec = services.recommend_for_course(self.student, self.course)
        self.assertIsNotNone(rec)
        self.assertEqual(rec["recommendation"]["action"], "continue")
        self.assertIsNone(rec["current_module_mastery"])

    def test_low_score_triggers_reinforce_pace(self):
        # A second required activity stays incomplete, so the module isn't
        # "done" yet — this is what makes the weak first score visible in
        # "current module" mastery rather than getting flagged for the
        # (nonexistent) next module.
        Activity.objects.create(
            lesson=self.lesson1, activity_type=ActivityType.EXERCISE, title="HTML Exercise 2", is_required=True
        )
        mark_activity_complete(self.student, self.activity1, score=40)
        rec = services.recommend_for_course(self.student, self.course)
        self.assertEqual(rec["pace"], "reinforce")
        self.assertEqual(rec["recommendation"]["action"], "review")

    def test_high_score_triggers_accelerate_pace(self):
        mark_activity_complete(self.student, self.activity1, score=95)
        # add a second lesson/activity so there's something to accelerate into
        lesson2 = Lesson.objects.create(module=self.module1, title="HTML Forms", order=2)
        Activity.objects.create(lesson=lesson2, activity_type=ActivityType.EXERCISE, title="Forms Exercise")
        rec = services.recommend_for_course(self.student, self.course)
        self.assertEqual(rec["pace"], "accelerate")
