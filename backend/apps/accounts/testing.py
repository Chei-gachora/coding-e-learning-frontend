"""Shared test fixture: two courses owned by two different instructors.

    admin
    instructor_a  teaches course_a  (modules m1 -> m2, lesson l1/l2, activities)
    instructor_b  teaches course_b  (module b1, lesson bl1, activity b_act)
    student_1     enrolled in course_a
    student_2     enrolled in course_a AND course_b
    outsider      a student enrolled nowhere

Everything a permission test needs to say "X must NOT be able to touch Y".
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.courses.models import Activity, Course, Lesson, Module
from apps.enrollment.models import Enrollment
from apps.quizzes.models import Question, Quiz

User = get_user_model()
PASSWORD = "Test-pass-word-1A"


def make_user(username, role):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password=PASSWORD, role=role, email_verified=True,
    )


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


class World:
    def __init__(self):
        self.admin = make_user("admin1", "admin")
        self.instructor_a = make_user("inst_a", "instructor")
        self.instructor_b = make_user("inst_b", "instructor")
        self.student_1 = make_user("stud_1", "student")
        self.student_2 = make_user("stud_2", "student")
        self.outsider = make_user("outsider", "student")

        # ---- Course A: two modules so we can test locking ----
        self.course_a = Course.objects.create(title="Course A", instructor=self.instructor_a)
        self.m1 = Module.objects.create(course=self.course_a, title="M1", order=1)
        self.m2 = Module.objects.create(course=self.course_a, title="M2", order=2)
        self.l1 = Lesson.objects.create(
            module=self.m1, title="Lesson 1", order=1, tutorial_content="secret-m1",
            video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        )
        self.l2 = Lesson.objects.create(module=self.m2, title="Lesson 2", order=1, tutorial_content="secret-m2-locked")
        self.exercise = Activity.objects.create(
            lesson=self.l1, activity_type="exercise", title="Echo", max_score=100, max_attempts=2,
            pass_percentage=50, is_required=True, starter_code="",
            test_cases=[{"input": "hi", "expected_output": "hi", "public": True},
                        {"input": "SECRET-INPUT", "expected_output": "SECRET-ANSWER"}],
        )
        self.assignment = Activity.objects.create(
            lesson=self.l1, activity_type="assignment", title="Essay", max_score=10, max_attempts=2,
            pass_percentage=60, is_required=False,
        )
        self.locked_activity = Activity.objects.create(
            lesson=self.l2, activity_type="assignment", title="Locked work", max_score=10, max_attempts=1,
        )
        quiz_act = Activity.objects.create(
            lesson=self.l1, activity_type="quiz", title="Quiz", max_score=10, max_attempts=2, is_required=False,
        )
        self.quiz = Quiz.objects.create(activity=quiz_act, pass_mark_percentage=50)
        self.question = Question.objects.create(
            quiz=self.quiz, text="2+2?", marks=10, choices=[{"text": "3"}, {"text": "4"}], correct_choice_index=1,
        )

        # ---- Course B ----
        self.course_b = Course.objects.create(title="Course B", instructor=self.instructor_b)
        self.b1 = Module.objects.create(course=self.course_b, title="B1", order=1)
        self.bl1 = Lesson.objects.create(module=self.b1, title="B Lesson", order=1, tutorial_content="secret-b")
        self.b_act = Activity.objects.create(
            lesson=self.bl1, activity_type="assignment", title="B work", max_score=10, max_attempts=3,
        )

        Enrollment.objects.create(student=self.student_1, course=self.course_a)
        Enrollment.objects.create(student=self.student_2, course=self.course_a)
        Enrollment.objects.create(student=self.student_2, course=self.course_b)

    def make_submission(self, student, activity, **kw):
        from apps.submissions.models import Submission
        return Submission.objects.create(student=student, activity=activity, content=kw.pop("content", "x"), **kw)
