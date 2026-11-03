"""Authorization boundary tests.

These call the API directly with different users. A React route guard proves
nothing about security; each case below asserts what the SERVER does when the
wrong person asks. Convention: reading something you may not see -> 404 (the
ID is not confirmed to exist) or an empty list; acting on it -> 403/404.
"""
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.progress.models import ActivityCompletion
from apps.submissions.models import Submission
from .testing import World, client_for


def ids(response):
    data = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
    return {row["id"] for row in data}


class Base(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.w = World()

    def as_(self, user=None):
        return client_for(user)


class AnonymousTests(Base):
    def test_every_endpoint_rejects_anonymous_users(self):
        w = self.w
        urls = [
            "/api/courses/", f"/api/courses/{w.course_a.id}/", "/api/modules/", "/api/lessons/", f"/api/lessons/{w.l1.id}/",
            "/api/activities/", "/api/lesson-attachments/", "/api/enrollments/", "/api/submissions/", "/api/quizzes/",
            f"/api/quizzes/{w.quiz.id}/", "/api/quiz-attempts/", f"/api/progress/course/{w.course_a.id}/",
            f"/api/progress/can-access/{w.m1.id}/", f"/api/progress/video/{w.l1.id}/",
            f"/api/progress/video/{w.l1.id}/summary/", "/api/dashboard/student/", "/api/dashboard/instructor/",
            "/api/dashboard/admin/", "/api/risk/cohort/", f"/api/risk/student/{w.student_1.id}/course/{w.course_a.id}/",
            "/api/sequencing/me/", "/api/allocation/recommendations/",
        ]
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(self.as_().get(url).status_code, 401)
        self.assertEqual(self.as_().get("/api/auth/me/").status_code, 204)
        self.assertEqual(
            self.as_().patch("/api/auth/me/", {"bio": "anonymous"}, format="json").status_code,
            401,
        )
        for url in ("/api/execute/run/", "/api/execute/test/", "/api/submissions/", "/api/enrollments/", "/api/courses/"):
            with self.subTest(post=url):
                self.assertEqual(self.as_().post(url, {}, format="json").status_code, 401)


class RoleGateTests(Base):
    def test_admin_only_endpoints(self):
        w = self.w
        for user in (w.student_1, w.instructor_a):
            self.assertEqual(self.as_(user).get("/api/dashboard/admin/").status_code, 403)
            self.assertEqual(self.as_(user).get("/api/allocation/recommendations/").status_code, 403)
        self.assertEqual(self.as_(w.admin).get("/api/dashboard/admin/").status_code, 200)

    def test_students_cannot_use_instructor_endpoints(self):
        s = self.as_(self.w.student_1)
        self.assertEqual(s.get("/api/dashboard/instructor/").status_code, 403)
        self.assertEqual(s.get("/api/risk/cohort/").status_code, 403)
        self.assertEqual(s.get(f"/api/risk/student/{self.w.student_1.id}/course/{self.w.course_a.id}/").status_code, 403)
        self.assertEqual(s.post("/api/courses/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(s.post("/api/modules/", {"course": self.w.course_a.id, "title": "x", "order": 9}, format="json").status_code, 403)

    def test_registration_cannot_create_privileged_accounts(self):
        r = self.as_().post("/api/auth/register/", {
            "username": "sneaky", "email": "s@example.com", "password": "Str0ng-pass-word", "role": "admin", "is_staff": True,
        }, format="json")
        self.assertEqual(r.status_code, 201)
        from apps.accounts.models import User
        u = User.objects.get(username="sneaky")
        self.assertEqual(u.role, "student")
        self.assertFalse(u.is_staff or u.is_superuser)


class InstructorOwnershipTests(Base):
    """Being 'an instructor' must not grant access to another instructor's course."""

    def test_instructor_cannot_edit_or_delete_another_instructors_course(self):
        b, w = self.as_(self.w.instructor_b), self.w
        self.assertEqual(b.patch(f"/api/courses/{w.course_a.id}/", {"title": "hijacked"}, format="json").status_code, 403)
        self.assertEqual(b.delete(f"/api/courses/{w.course_a.id}/").status_code, 403)
        self.assertEqual(b.post(f"/api/courses/{w.course_a.id}/publish/").status_code, 403)
        w.course_a.refresh_from_db()
        self.assertEqual(w.course_a.title, "Course A")

    def test_instructor_cannot_add_content_to_another_instructors_course(self):
        b, w = self.as_(self.w.instructor_b), self.w
        self.assertEqual(b.post("/api/modules/", {"course": w.course_a.id, "title": "evil", "order": 9}, format="json").status_code, 403)
        self.assertEqual(b.post("/api/lessons/", {"module": w.m1.id, "title": "evil", "order": 9}, format="json").status_code, 403)
        self.assertEqual(b.post("/api/activities/", {
            "lesson": w.l1.id, "activity_type": "assignment", "title": "evil", "max_score": 1, "max_attempts": 1}, format="json").status_code, 403)
        pdf = SimpleUploadedFile("x.pdf", b"%PDF-1.4 x", content_type="application/pdf")
        self.assertEqual(b.post("/api/lesson-attachments/", {"lesson": w.l1.id, "title": "evil", "file": pdf}, format="multipart").status_code, 403)

    def test_instructor_cannot_modify_or_delete_foreign_module_lesson_activity(self):
        b, w = self.as_(self.w.instructor_b), self.w
        # they can't even *see* these, so the API answers 404 rather than 403
        for url in (f"/api/modules/{w.m1.id}/", f"/api/lessons/{w.l1.id}/", f"/api/activities/{w.exercise.id}/"):
            self.assertEqual(b.patch(url, {"title": "x"}, format="json").status_code, 404, url)
            self.assertEqual(b.delete(url).status_code, 404, url)

    def test_instructor_cannot_move_own_content_into_foreign_course(self):
        b, w = self.as_(self.w.instructor_b), self.w
        self.assertEqual(b.patch(f"/api/modules/{w.b1.id}/", {"course": w.course_a.id, "order": 7}, format="json").status_code, 403)
        self.assertEqual(b.patch(f"/api/lessons/{w.bl1.id}/", {"module": w.m1.id, "order": 7}, format="json").status_code, 403)

    def test_instructor_lists_only_their_own_content(self):
        b, w = self.as_(self.w.instructor_b), self.w
        self.assertEqual(ids(b.get("/api/modules/")), {w.b1.id})
        self.assertEqual(ids(b.get("/api/lessons/")), {w.bl1.id})
        self.assertEqual(ids(b.get("/api/activities/")), {w.b_act.id})
        self.assertEqual(ids(b.get("/api/quizzes/")), set())
        self.assertEqual(ids(b.get(f"/api/modules/?course={w.course_a.id}")), set())

    def test_owner_and_admin_can_edit(self):
        w = self.w
        self.assertEqual(self.as_(w.instructor_a).patch(f"/api/courses/{w.course_a.id}/", {"title": "A2"}, format="json").status_code, 200)
        self.assertEqual(self.as_(w.admin).patch(f"/api/courses/{w.course_a.id}/", {"title": "A3"}, format="json").status_code, 200)

    def test_instructor_cannot_attach_quiz_to_foreign_or_non_quiz_activity(self):
        b, a, w = self.as_(self.w.instructor_b), self.as_(self.w.instructor_a), self.w
        self.assertEqual(b.post("/api/quizzes/", {"activity": w.assignment.id}, format="json").status_code, 403)
        self.assertEqual(a.post("/api/quizzes/", {"activity": w.assignment.id}, format="json").status_code, 400)

    def test_lesson_video_url_must_be_an_allowed_provider(self):
        a, w = self.as_(self.w.instructor_a), self.w
        for bad in ("https://youtube.com/watch?v=abc123", "https://vimeo.com/abc", "javascript:alert(1)", "https://evil.example.com/page", "ftp://x.com/a.mp4", "http://x.com/a.mp4"):
            r = a.patch(f"/api/lessons/{w.l1.id}/", {"video_url": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        for good in ("https://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/123456789", "https://cdn.example.com/v/lesson.mp4"):
            self.assertEqual(a.patch(f"/api/lessons/{w.l1.id}/", {"video_url": good}, format="json").status_code, 200, good)


class StudentContentAccessTests(Base):
    def test_student_sees_only_enrolled_unlocked_lessons(self):
        w = self.w
        s1 = self.as_(w.student_1)
        self.assertEqual(ids(s1.get("/api/lessons/")), {w.l1.id})            # not l2 (locked) and not bl1 (not enrolled)
        self.assertEqual(s1.get(f"/api/lessons/{w.l1.id}/").status_code, 200)
        self.assertEqual(s1.get(f"/api/lessons/{w.l2.id}/").status_code, 404)  # locked
        self.assertEqual(s1.get(f"/api/lessons/{w.bl1.id}/").status_code, 404)  # other course

    def test_unenrolled_student_gets_nothing(self):
        w, o = self.w, self.as_(self.w.outsider)
        self.assertEqual(ids(o.get("/api/lessons/")), set())
        self.assertEqual(ids(o.get("/api/activities/")), set())
        self.assertEqual(ids(o.get("/api/modules/")), set())
        self.assertEqual(ids(o.get("/api/quizzes/")), set())
        self.assertEqual(o.get(f"/api/lessons/{w.l1.id}/").status_code, 404)
        self.assertEqual(o.get(f"/api/progress/course/{w.course_a.id}/").status_code, 404)
        self.assertEqual(o.get(f"/api/progress/can-access/{w.m1.id}/").status_code, 404)

    def test_modules_endpoint_never_leaks_lesson_content_to_students(self):
        w = self.w
        r = self.as_(w.student_1).get("/api/modules/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(ids(r), {w.m1.id, w.m2.id})       # titles of enrolled course visible...
        for row in r.data:
            self.assertNotIn("lessons", row)                  # ...content is not
        self.assertNotIn("secret-m2-locked", r.content.decode())

    def test_course_catalog_is_visible_but_reveals_no_content(self):
        r = self.as_(self.w.outsider).get(f"/api/courses/{self.w.course_a.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("secret", r.content.decode())

    def test_answer_key_is_never_sent_to_students(self):
        w = self.w
        for url in (f"/api/activities/{w.exercise.id}/", f"/api/lessons/{w.l1.id}/", "/api/activities/", "/api/lessons/"):
            body = self.as_(w.student_1).get(url).content.decode()
            self.assertNotIn("SECRET-ANSWER", body, url)
            self.assertNotIn("test_cases", body, url)
        self.assertIn("SECRET-ANSWER", self.as_(w.instructor_a).get(f"/api/activities/{w.exercise.id}/").content.decode())
        self.assertNotIn("correct_choice_index", self.as_(w.student_1).get(f"/api/quizzes/{w.quiz.id}/").content.decode())

    def test_students_cannot_write_content(self):
        s, w = self.as_(self.w.student_1), self.w
        self.assertEqual(s.patch(f"/api/lessons/{w.l1.id}/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(s.delete(f"/api/courses/{w.course_a.id}/").status_code, 403)

    def test_completing_module_one_unlocks_module_two_content(self):
        w = self.w
        s1 = self.as_(w.student_1)
        self.assertEqual(s1.get(f"/api/lessons/{w.l2.id}/").status_code, 404)
        ActivityCompletion.objects.create(student=w.student_1, activity=w.exercise)
        self.assertEqual(s1.get(f"/api/lessons/{w.l2.id}/").status_code, 200)
        self.assertEqual(self.as_(w.student_2).get(f"/api/lessons/{w.l2.id}/").status_code, 404)  # per-student, not global


class EnrollmentBoundaryTests(Base):
    def test_student_sees_only_own_enrollments(self):
        r = self.as_(self.w.student_1).get("/api/enrollments/")
        self.assertEqual({e["student"] for e in r.data}, {self.w.student_1.id})
        self.assertEqual(len(r.data), 1)

    def test_instructor_sees_only_enrollments_in_own_courses(self):
        w = self.w
        a, b = self.as_(w.instructor_a), self.as_(w.instructor_b)
        self.assertEqual({e["course"] for e in a.get("/api/enrollments/").data}, {w.course_a.id})
        self.assertEqual({e["course"] for e in b.get("/api/enrollments/").data}, {w.course_b.id})
        self.assertEqual(b.get(f"/api/enrollments/?course={w.course_a.id}").data, [])   # filter can't widen scope

    def test_student_can_remove_only_their_own_enrollment_and_work_is_retained(self):
        w, s = self.w, self.as_(self.w.student_1)
        enrollment = w.student_1.enrollments.get()
        self.assertEqual(s.patch(f"/api/enrollments/{enrollment.id}/", {"course": w.course_b.id}, format="json").status_code, 405)

        completion = ActivityCompletion.objects.create(student=w.student_1, activity=w.exercise)
        response = s.delete(f"/api/enrollments/{enrollment.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(w.student_1.enrollments.filter(pk=enrollment.id).exists())
        self.assertTrue(ActivityCompletion.objects.filter(pk=completion.pk).exists())

    def test_student_cannot_remove_another_students_enrollment(self):
        w = self.w
        enrollment = w.student_2.enrollments.get(course=w.course_a)

        self.assertEqual(
            self.as_(w.student_1).delete(f"/api/enrollments/{enrollment.id}/").status_code,
            404,
        )
        self.assertTrue(w.student_2.enrollments.filter(pk=enrollment.id).exists())

    def test_non_students_cannot_remove_enrollments(self):
        w = self.w
        enrollment = w.student_1.enrollments.get()

        for user in (w.instructor_a, w.admin):
            with self.subTest(role=user.role):
                self.assertEqual(
                    self.as_(user).delete(f"/api/enrollments/{enrollment.id}/").status_code,
                    403,
                )
        self.assertTrue(w.student_1.enrollments.filter(pk=enrollment.id).exists())

    def test_non_students_cannot_enroll_and_double_enroll_is_rejected(self):
        w = self.w
        self.assertEqual(self.as_(w.instructor_a).post("/api/enrollments/", {"course": w.course_a.id}, format="json").status_code, 403)
        self.assertEqual(self.as_(w.student_1).post("/api/enrollments/", {"course": w.course_a.id}, format="json").status_code, 400)
        response = self.as_(w.student_1).post(
            "/api/enrollments/", {"course": w.course_b.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["learning_mode"], "self_paced")

    def test_student_can_choose_learning_mode_when_enrolling(self):
        w = self.w
        response = self.as_(w.outsider).post(
            "/api/enrollments/",
            {"course": w.course_b.id, "learning_mode": "instructor_led"},
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["learning_mode"], "instructor_led")

    def test_student_cannot_enroll_with_unknown_learning_mode(self):
        w = self.w
        response = self.as_(w.outsider).post(
            "/api/enrollments/",
            {"course": w.course_b.id, "learning_mode": "self-directed"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(w.outsider.enrollments.filter(course=w.course_b).exists())

    def test_student_cannot_spoof_the_student_field(self):
        w = self.w
        r = self.as_(w.outsider).post("/api/enrollments/", {"course": w.course_b.id, "student": w.student_1.id}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["student"], w.outsider.id)


class SubmissionOwnershipTests(Base):
    def setUp(self):
        w = self.w
        self.sub_1 = w.make_submission(w.student_1, w.assignment)
        self.sub_2 = w.make_submission(w.student_2, w.assignment)
        self.sub_b = w.make_submission(w.student_2, w.b_act)

    def test_student_lists_and_reads_only_own_submissions(self):
        s1 = self.as_(self.w.student_1)
        self.assertEqual(ids(s1.get("/api/submissions/")), {self.sub_1.id})
        self.assertEqual(s1.get(f"/api/submissions/{self.sub_1.id}/").status_code, 200)
        self.assertEqual(s1.get(f"/api/submissions/{self.sub_2.id}/").status_code, 404)
        self.assertEqual(ids(s1.get(f"/api/submissions/?activity={self.w.assignment.id}")), {self.sub_1.id})

    def test_student_cannot_edit_delete_or_regrade(self):
        s1 = self.as_(self.w.student_1)
        for method in ("patch", "put", "delete"):
            r = getattr(s1, method)(f"/api/submissions/{self.sub_1.id}/", {"content": "changed"}, format="json")
            self.assertEqual(r.status_code, 405, method)
        self.assertEqual(s1.patch(f"/api/submissions/{self.sub_1.id}/grade/", {"grade": 10}, format="json").status_code, 403)
        self.sub_1.refresh_from_db()
        self.assertIsNone(self.sub_1.grade)
        self.assertEqual(self.sub_1.content, "x")

    def test_deleting_cannot_be_used_to_reset_attempt_limit(self):
        w, s1 = self.w, self.as_(self.w.student_1)   # assignment allows 2 attempts; one used
        self.assertEqual(s1.post("/api/submissions/", {"activity": w.assignment.id, "content": "2"}, format="json").status_code, 201)
        self.assertEqual(s1.delete(f"/api/submissions/{self.sub_1.id}/").status_code, 405)
        self.assertEqual(s1.post("/api/submissions/", {"activity": w.assignment.id, "content": "3"}, format="json").status_code, 400)

    def test_instructor_sees_and_grades_only_own_courses(self):
        w = self.w
        a, b = self.as_(w.instructor_a), self.as_(w.instructor_b)
        self.assertEqual(ids(a.get("/api/submissions/")), {self.sub_1.id, self.sub_2.id})
        self.assertEqual(ids(b.get("/api/submissions/")), {self.sub_b.id})
        self.assertEqual(b.get(f"/api/submissions/{self.sub_1.id}/").status_code, 404)
        r = b.patch(f"/api/submissions/{self.sub_1.id}/grade/", {"grade": 10, "feedback": "x"}, format="json")
        self.assertEqual(r.status_code, 404)
        self.sub_1.refresh_from_db()
        self.assertIsNone(self.sub_1.grade)
        self.assertEqual(a.patch(f"/api/submissions/{self.sub_1.id}/grade/", {"grade": 9}, format="json").status_code, 200)

    def test_admin_sees_everything(self):
        self.assertEqual(len(ids(self.as_(self.w.admin).get("/api/submissions/"))), 3)

    def test_submission_file_download_follows_the_same_rules(self):
        w = self.w
        f = SimpleUploadedFile("answer.txt", b"my private answer", content_type="text/plain")
        r = self.as_(w.student_1).post("/api/submissions/", {"activity": w.assignment.id, "file": f}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        sid = r.data["id"]
        self.assertEqual(r.data["course_title"], w.course_a.title)
        self.assertNotIn("file", r.data)                         # raw storage path never exposed
        url = f"/api/submissions/{sid}/download/"
        self.assertEqual(self.as_(w.student_1).get(url).status_code, 200)
        self.assertEqual(self.as_(w.instructor_a).get(url).status_code, 200)
        self.assertEqual(self.as_(w.admin).get(url).status_code, 200)
        self.assertEqual(self.as_(w.student_2).get(url).status_code, 404)
        self.assertEqual(self.as_(w.instructor_b).get(url).status_code, 404)
        self.assertEqual(self.as_().get(url).status_code, 401)
        resp = self.as_(w.student_1).get(url)
        self.assertIn("attachment", resp["Content-Disposition"])
        self.assertEqual(resp["X-Content-Type-Options"], "nosniff")

    def test_private_files_are_not_served_from_public_media_urls(self):
        r = self.as_().get("/media/submissions/activity_1/student_1/answer.txt")
        self.assertEqual(r.status_code, 404)
        r = self.as_().get("/media/lesson_resources/course_1/module_1/lesson_1/handout.pdf")
        self.assertEqual(r.status_code, 404)


class SubmitRulesTests(Base):
    def post(self, user, activity, **body):
        return self.as_(user).post("/api/submissions/", {"activity": activity.id, "content": "work", **body}, format="json")

    def test_must_be_enrolled(self):
        self.assertEqual(self.post(self.w.outsider, self.w.assignment).status_code, 403)
        self.assertEqual(self.post(self.w.student_1, self.w.b_act).status_code, 403)   # enrolled elsewhere only

    def test_locked_module_blocks_submission(self):
        self.assertEqual(self.post(self.w.student_1, self.w.locked_activity).status_code, 403)

    def test_staff_cannot_submit(self):
        self.assertEqual(self.post(self.w.instructor_a, self.w.assignment).status_code, 403)
        self.assertEqual(self.post(self.w.admin, self.w.assignment).status_code, 403)

    def test_cannot_submit_after_deadline_or_to_a_quiz(self):
        from datetime import timedelta
        from django.utils import timezone
        w = self.w
        w.assignment.deadline = timezone.now() - timedelta(minutes=1)
        w.assignment.save()
        r = self.post(w.student_1, w.assignment)
        self.assertEqual(r.status_code, 400)
        self.assertIn("deadline", str(r.data).lower())
        self.assertEqual(self.post(w.student_1, w.quiz.activity).status_code, 400)

    def test_empty_submission_rejected(self):
        r = self.as_(self.w.student_1).post("/api/submissions/", {"activity": self.w.assignment.id}, format="json")
        self.assertEqual(r.status_code, 400)


class QuizBoundaryTests(Base):
    def submit(self, user, quiz=None, choice=1):
        quiz = quiz or self.w.quiz
        return self.as_(user).post(f"/api/quizzes/{quiz.id}/submit/", {"answers": {str(self.w.question.id): choice}}, format="json")

    def test_only_enrolled_students_can_take_quizzes(self):
        self.assertEqual(self.submit(self.w.outsider).status_code, 403)
        self.assertEqual(self.submit(self.w.instructor_a).status_code, 403)
        self.assertEqual(self.submit(self.w.student_1).status_code, 200)

    def test_attempts_only_visible_to_owner_and_course_instructor(self):
        w = self.w
        result = self.submit(w.student_1)
        self.assertEqual(result.data["quiz_title"], w.quiz.activity.title)
        self.assertEqual(result.data["course_title"], w.course_a.title)
        self.submit(w.student_2)
        self.assertEqual(len(self.as_(w.student_1).get("/api/quiz-attempts/").data), 1)
        self.assertEqual(len(self.as_(w.instructor_a).get("/api/quiz-attempts/").data), 2)
        self.assertEqual(len(self.as_(w.instructor_b).get("/api/quiz-attempts/").data), 0)
        # ?student= must not let a student peek at someone else
        r = self.as_(w.student_1).get(f"/api/quiz-attempts/?student={w.student_2.id}")
        self.assertEqual(len(r.data), 0)

    def test_quiz_attempt_limit_and_completion(self):
        w = self.w   # 2 attempts allowed
        self.assertFalse(self.submit(w.student_1, choice=0).data["passed"])
        self.assertFalse(ActivityCompletion.objects.filter(student=w.student_1, activity=w.quiz.activity).exists())
        self.assertTrue(self.submit(w.student_1, choice=1).data["passed"])
        self.assertEqual(self.submit(w.student_1).status_code, 400)
        self.assertTrue(ActivityCompletion.objects.filter(student=w.student_1, activity=w.quiz.activity).exists())


class RiskAndDashboardBoundaryTests(Base):
    def test_instructor_cannot_score_students_in_courses_they_dont_teach(self):
        w = self.w
        url = f"/api/risk/student/{w.student_2.id}/course/{w.course_a.id}/"
        self.assertEqual(self.as_(w.instructor_b).get(url).status_code, 403)
        # student not enrolled in that course (even for the owning instructor)
        self.assertEqual(self.as_(w.instructor_a).get(f"/api/risk/student/{w.outsider.id}/course/{w.course_a.id}/").status_code, 404)
        self.assertIn(self.as_(w.instructor_a).get(url).status_code, (200, 204))

    def test_instructor_dashboard_is_scoped(self):
        w = self.w
        w.make_submission(w.student_1, w.assignment)
        w.make_submission(w.student_2, w.b_act)
        a = self.as_(w.instructor_a).get("/api/dashboard/instructor/").data
        self.assertEqual({c["id"] for c in a["my_courses"]}, {w.course_a.id})
        self.assertEqual(a["pending_submission_count"], 1)

    def test_student_dashboard_only_shows_own_data(self):
        w = self.w
        s = w.make_submission(w.student_2, w.assignment)
        s.status, s.grade = "graded", 9
        s.save()
        r = self.as_(w.student_1).get("/api/dashboard/student/")
        self.assertEqual(r.data["recent_grades"], [])
        self.assertEqual({c["course_id"] for c in r.data["enrolled_courses"]}, {w.course_a.id})


class AttachmentAccessTests(Base):
    def setUp(self):
        from apps.courses.models import LessonAttachment
        self.att = LessonAttachment.objects.create(
            lesson=self.w.l1, title="Handout", uploaded_by=self.w.instructor_a,
            file=SimpleUploadedFile("h.pdf", b"%PDF-1.4 hello"))
        self.att_locked = LessonAttachment.objects.create(
            lesson=self.w.l2, title="Locked", uploaded_by=self.w.instructor_a,
            file=SimpleUploadedFile("l.pdf", b"%PDF-1.4 locked"))

    def test_download_requires_enrollment_and_unlock(self):
        w = self.w
        url, locked = f"/api/lesson-attachments/{self.att.id}/download/", f"/api/lesson-attachments/{self.att_locked.id}/download/"
        self.assertEqual(self.as_(w.student_1).get(url).status_code, 200)
        self.assertEqual(self.as_(w.student_1).get(locked).status_code, 404)     # module locked
        self.assertEqual(self.as_(w.outsider).get(url).status_code, 404)          # not enrolled
        self.assertEqual(self.as_(w.instructor_b).get(url).status_code, 404)      # other instructor
        self.assertEqual(self.as_(w.instructor_a).get(locked).status_code, 200)
        self.assertEqual(self.as_().get(url).status_code, 401)

    def test_listing_never_exposes_raw_file_path(self):
        body = self.as_(self.w.student_1).get(f"/api/lessons/{self.w.l1.id}/").content.decode()
        self.assertIn("download_url", body)
        self.assertNotIn("lesson_resources/", body)

    def test_upload_must_really_be_a_pdf(self):
        r = self.as_(self.w.instructor_a).post("/api/lesson-attachments/", {
            "lesson": self.w.l1.id, "title": "fake", "file": SimpleUploadedFile("evil.pdf", b"<html><script>alert(1)</script>")}, format="multipart")
        self.assertEqual(r.status_code, 400)
