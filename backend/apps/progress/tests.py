"""The learning loop, end to end through the REST API:

  instructor builds course -> student enrolls -> module 2 locked -> student
  submits (attempt limit) -> instructor grades (pass mark) -> completion ->
  module 2 unlocks -> regrade below pass -> locks again.

Plus video-progress accounting (seek / fast-forward / rewatch / resume).
"""
from datetime import datetime, timedelta, timezone as dt_tz
from types import SimpleNamespace

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.accounts.testing import PASSWORD, World, client_for, make_user
from apps.courses.models import Activity, Course, Lesson, Module
from apps.progress import video
from apps.progress.models import ActivityCompletion, VideoProgress


def login(email):
    """Real JWT login (not force_authenticate) so the auth path is exercised too."""
    c = APIClient()
    r = c.post("/api/auth/login/", {"email": email, "password": PASSWORD}, format="json")
    assert r.status_code == 200, r.data
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return c


class LearningLoopTests(APITestCase):
    def setUp(self):
        cache.clear()
        make_user("teacher", "instructor")
        make_user("learner", "student")
        self.teacher, self.learner = login("teacher@example.com"), login("learner@example.com")

    def build_course(self):
        t = self.teacher
        self.course_id = t.post("/api/courses/", {"title": "Python", "description": "d"}, format="json").data["id"]
        self.mod1 = t.post("/api/modules/", {"course": self.course_id, "title": "Basics", "order": 1}, format="json").data["id"]
        self.mod2 = t.post("/api/modules/", {"course": self.course_id, "title": "Functions", "order": 2}, format="json").data["id"]
        self.lesson1 = t.post("/api/lessons/", {"module": self.mod1, "title": "Variables", "order": 1,
                                                "video_url": "https://youtu.be/dQw4w9WgXcQ"}, format="json").data["id"]
        self.lesson2 = t.post("/api/lessons/", {"module": self.mod2, "title": "def", "order": 1}, format="json").data["id"]
        r = t.post("/api/activities/", {"lesson": self.lesson1, "activity_type": "assignment", "title": "Essay",
                                        "max_score": 100, "max_attempts": 2, "pass_percentage": 50, "is_required": True}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.act = r.data["id"]
        published = t.post(f"/api/courses/{self.course_id}/publish/")
        self.assertEqual(published.status_code, 200, published.data)

    def module_statuses(self):
        return {m["module_id"]: m["status"] for m in self.learner.get(f"/api/progress/course/{self.course_id}/").data}

    def submit(self, text="answer"):
        return self.learner.post("/api/submissions/", {"activity": self.act, "content": text}, format="json")

    def grade(self, sub_id, grade):
        return self.teacher.patch(f"/api/submissions/{sub_id}/grade/", {"grade": grade, "feedback": "ok"}, format="json")

    def test_full_learning_loop(self):
        self.build_course()
        # enroll -> module 1 active, module 2 locked
        self.assertEqual(self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json").status_code, 201)
        self.assertEqual(self.module_statuses(), {self.mod1: "active", self.mod2: "locked"})
        self.assertEqual(self.learner.get(f"/api/lessons/{self.lesson2}/").status_code, 404)
        self.assertEqual(self.learner.get(f"/api/progress/can-access/{self.mod2}/").data["unlocked"], False)

        # two attempts allowed, the third refused
        first, second = self.submit("first try"), self.submit("second try")
        self.assertEqual((first.status_code, first.data["attempt_number"]), (201, 1))
        self.assertEqual((second.status_code, second.data["attempt_number"]), (201, 2))
        third = self.submit("third try")
        self.assertEqual(third.status_code, 400)
        self.assertIn("Maximum attempts", str(third.data))

        # a failing grade does NOT complete the activity or unlock module 2
        r = self.grade(first.data["id"], 30)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["activity_completed"])
        self.assertEqual(self.module_statuses(), {self.mod1: "active", self.mod2: "locked"})
        self.assertEqual(self.learner.get(f"/api/lessons/{self.lesson2}/").status_code, 404)

        # a passing grade completes it and unlocks module 2
        r = self.grade(second.data["id"], 80)
        self.assertTrue(r.data["activity_completed"])
        self.assertEqual(ActivityCompletion.objects.get().score, 80)
        self.assertEqual(self.module_statuses()[self.mod1], "done")
        self.assertNotEqual(self.module_statuses()[self.mod2], "locked")
        self.assertEqual(self.learner.get(f"/api/lessons/{self.lesson2}/").status_code, 200)
        self.assertEqual(self.learner.get(f"/api/progress/can-access/{self.mod2}/").data["unlocked"], True)

        # student dashboard reflects it
        dash = self.learner.get("/api/dashboard/student/").data
        self.assertEqual(dash["enrolled_courses"][0]["course_id"], self.course_id)
        self.assertEqual(dash["recent_grades"][0]["grade"], 80)

        # a later, lower grade on ANOTHER submission doesn't undo an existing pass
        self.grade(first.data["id"], 10)
        self.assertEqual(self.module_statuses()[self.mod1], "done")

        # but downgrading the only passing submission re-locks module 2
        r = self.grade(second.data["id"], 20)
        self.assertFalse(r.data["activity_completed"])
        self.assertFalse(ActivityCompletion.objects.exists())
        self.assertEqual(self.module_statuses(), {self.mod1: "active", self.mod2: "locked"})

    def test_pass_boundary_is_inclusive(self):
        self.build_course()
        self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json")
        sub = self.submit()
        self.assertFalse(self.grade(sub.data["id"], 49.9).data["activity_completed"])
        self.assertTrue(self.grade(sub.data["id"], 50).data["activity_completed"])

    def test_grade_bounds(self):
        self.build_course()
        self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json")
        sid = self.submit().data["id"]
        for bad in (101, -1, "abc", None):
            self.assertEqual(self.grade(sid, bad).status_code, 400, bad)
        self.assertEqual(self.grade(sid, 100).status_code, 200)

    def test_module_needs_every_required_activity(self):
        self.build_course()
        self.teacher.post("/api/activities/", {"lesson": self.lesson1, "activity_type": "assignment", "title": "Second",
                                               "max_score": 10, "max_attempts": 1, "is_required": True}, format="json")
        self.teacher.post("/api/activities/", {"lesson": self.lesson1, "activity_type": "assignment", "title": "Bonus",
                                               "max_score": 10, "max_attempts": 1, "is_required": False}, format="json")
        second_id = Activity.objects.get(title="Second").id
        self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json")
        self.grade(self.submit().data["id"], 100)
        self.assertEqual(self.module_statuses()[self.mod2], "locked")         # one of two required done
        sub = self.learner.post("/api/submissions/", {"activity": second_id, "content": "x"}, format="json")
        self.grade(sub.data["id"], 10)
        self.assertNotEqual(self.module_statuses()[self.mod2], "locked")      # optional Bonus not needed

    def test_quiz_pass_unlocks_next_module_and_fail_does_not(self):
        from apps.quizzes.models import Question
        self.build_course()
        self.teacher.patch(f"/api/activities/{self.act}/", {"is_required": False}, format="json")
        qa = self.teacher.post("/api/activities/", {"lesson": self.lesson1, "activity_type": "quiz", "title": "Quiz",
                                                    "max_score": 10, "max_attempts": 2, "is_required": True}, format="json").data["id"]
        quiz = self.teacher.post("/api/quizzes/", {"activity": qa, "pass_mark_percentage": 70}, format="json").data["id"]
        q = Question.objects.create(quiz_id=quiz, text="?", marks=10, choices=[{"text": "a"}, {"text": "b"}], correct_choice_index=1)
        self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json")
        bad = self.learner.post(f"/api/quizzes/{quiz}/submit/", {"answers": {str(q.id): 0}}, format="json")
        self.assertFalse(bad.data["passed"])
        self.assertEqual(self.module_statuses()[self.mod2], "locked")
        good = self.learner.post(f"/api/quizzes/{quiz}/submit/", {"answers": {str(q.id): 1}}, format="json")
        self.assertTrue(good.data["passed"])
        self.assertEqual(good.data["attempt_number"], 2)
        self.assertNotEqual(self.module_statuses()[self.mod2], "locked")

    def test_completing_every_module_completes_the_course(self):
        self.build_course()
        self.learner.post("/api/enrollments/", {"course": self.course_id}, format="json")
        self.grade(self.submit().data["id"], 100)
        dash = self.learner.get("/api/dashboard/student/").data["enrolled_courses"][0]
        self.assertTrue(dash["completed"])
        self.assertEqual(dash["progress_percent"], 100)


class VideoMath(SimpleTestCase):
    T0 = datetime(2026, 1, 1, tzinfo=dt_tz.utc)

    def vp(self):
        return SimpleNamespace(position_seconds=0.0, duration_seconds=0.0, intervals=[], watched_seconds=0.0,
                               completed=False, completed_at=None, last_ping_at=None, last_playing=False)

    def ping(self, vp, at, pos, playing=True, dur=100, rate=1.0):
        return video.apply_ping(vp, pos, dur, playing, rate, self.T0 + timedelta(seconds=at))

    def test_normal_playback_is_credited(self):
        vp = self.vp()
        for t in (0, 10, 20, 30):
            self.ping(vp, t, t)
        self.assertAlmostEqual(vp.watched_seconds, 30, delta=0.1)

    def test_seeking_to_the_end_earns_nothing_and_never_completes(self):
        vp = self.vp()
        self.ping(vp, 0, 0)
        self.ping(vp, 10, 10)
        self.ping(vp, 20, 100)             # dragged the bar to the end
        self.assertAlmostEqual(vp.watched_seconds, 10, delta=0.1)
        self.assertFalse(vp.completed)
        self.assertEqual(vp.position_seconds, 100)   # resume point still follows the player

    def test_fast_forward_faster_than_allowed_rate_is_not_credited(self):
        vp = self.vp()
        self.ping(vp, 0, 0)
        self.ping(vp, 10, 40, rate=1.0)    # 30 s of video in 10 s at "1x"
        self.assertEqual(vp.watched_seconds, 0)

    def test_2x_playback_is_credited_only_when_declared(self):
        vp = self.vp()
        self.ping(vp, 0, 0, rate=2.0)
        self.ping(vp, 10, 20, rate=2.0)
        self.assertAlmostEqual(vp.watched_seconds, 20, delta=0.1)
        vp2 = self.vp()
        self.ping(vp2, 0, 0, rate=1.0)
        self.ping(vp2, 10, 20, rate=1.0)   # claims 1x but moved 2x
        self.assertEqual(vp2.watched_seconds, 0)

    def test_rate_above_maximum_is_clamped(self):
        vp = self.vp()
        self.ping(vp, 0, 0, rate=16.0)
        self.ping(vp, 10, 90, rate=16.0)   # 8x
        self.assertEqual(vp.watched_seconds, 0)

    def test_rewatching_does_not_double_count(self):
        vp = self.vp()
        for t in (0, 10, 20):
            self.ping(vp, t, t)            # watched 0-20
        self.ping(vp, 30, 0)               # jump back (no credit)
        for t in (40, 50):
            self.ping(vp, t, t - 30)       # watches 0-20 again
        self.assertAlmostEqual(vp.watched_seconds, 20, delta=0.5)

    def test_paused_time_and_sleeping_tabs_earn_nothing(self):
        vp = self.vp()
        self.ping(vp, 0, 0)
        self.ping(vp, 10, 10, playing=False)     # paused at 10
        self.ping(vp, 600, 11)                   # 10 min later, moved 1 s
        self.assertAlmostEqual(vp.watched_seconds, 10, delta=0.1)
        self.ping(vp, 700, 60)                   # 100 s gap while "playing" -> laptop asleep, no credit
        self.assertAlmostEqual(vp.watched_seconds, 10, delta=0.1)

    def test_completion_at_ninety_percent_of_real_watch_time(self):
        vp = self.vp()
        t = 0
        while t <= 85:
            self.ping(vp, t, t); t += 10
        self.assertFalse(vp.completed)
        self.ping(vp, 91, 91)
        self.assertTrue(vp.completed)
        watched = vp.watched_seconds
        self.ping(vp, 95, 0)                     # later rewind never un-completes
        self.assertTrue(vp.completed)
        self.assertGreaterEqual(vp.watched_seconds, watched)

    def test_position_and_duration_are_sanitised(self):
        vp = self.vp()
        self.ping(vp, 0, 500, dur=100)           # position beyond duration is clamped
        self.assertEqual(vp.position_seconds, 100)
        self.ping(vp, 5, 10, dur=100)
        self.ping(vp, 6, 10, dur=1)              # absurd duration change ignored
        self.assertEqual(vp.duration_seconds, 100)
        self.assertEqual(self.ping(self.vp(), 0, 5, dur=0.5).duration_seconds, 0)   # too short to trust

    def test_merge_intervals(self):
        self.assertEqual(video.merge_intervals([[10, 20], [0, 5], [4, 12], [30, 40]]), [[0, 20], [30, 40]])
        self.assertEqual(video.merge_intervals([[5, 5], [7, 3]]), [])


class VideoApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.w = World()

    def setUp(self):
        cache.clear()

    def put(self, user, lesson, **body):
        body = {"position": 0, "duration": 100, "playing": True, "rate": 1, **body}
        return client_for(user).put(f"/api/progress/video/{lesson.id}/", body, format="json")

    def test_progress_is_saved_and_resumable(self):
        w = self.w
        r = self.put(w.student_1, w.l1, position=0)
        self.assertEqual(r.status_code, 200)
        vp = VideoProgress.objects.get()
        vp.last_ping_at -= timedelta(seconds=10)
        vp.save()
        r = self.put(w.student_1, w.l1, position=10)
        self.assertAlmostEqual(r.data["watched_seconds"], 10, delta=0.5)
        got = client_for(w.student_1).get(f"/api/progress/video/{w.l1.id}/")
        self.assertEqual((got.data["position"], got.data["duration"]), (10.0, 100.0))

    def test_progress_is_per_student(self):
        w = self.w
        self.put(w.student_1, w.l1, position=30)
        self.assertEqual(client_for(w.student_2).get(f"/api/progress/video/{w.l1.id}/").data["position"], 0)

    def test_access_rules(self):
        w = self.w
        self.assertEqual(self.put(w.outsider, w.l1).status_code, 404)          # not enrolled
        self.assertEqual(self.put(w.student_1, w.l2).status_code, 404)         # locked module
        self.assertEqual(self.put(w.student_1, w.bl1).status_code, 404)        # other course
        self.assertEqual(self.put(w.instructor_a, w.l1).status_code, 403)      # students only
        self.assertEqual(client_for().put(f"/api/progress/video/{w.l1.id}/", {}, format="json").status_code, 401)

    def test_lesson_without_trackable_video_is_rejected(self):
        w = self.w
        w.l1.video_url = "https://vimeo.com/123456789"      # embeddable but no position API
        w.l1.save()
        self.assertEqual(self.put(w.student_1, w.l1).status_code, 400)
        w.l1.video_url = ""
        w.l1.save()
        self.assertEqual(self.put(w.student_1, w.l1).status_code, 400)

    def test_bad_payloads(self):
        w = self.w
        for body in ({"position": "abc"}, {"duration": None}, {"position": -5}, {"position": "nan"}, {"duration": "inf"}, {"position": "inf"}, {"position": "1e999"}, {"duration": 0}):
            with self.subTest(body):
                r = self.put(w.student_1, w.l1, **body)
                self.assertEqual(r.status_code, 400)

    def test_instructor_summary_scoped_to_own_course(self):
        w = self.w
        self.put(w.student_1, w.l1, position=0)
        r = client_for(w.instructor_a).get(f"/api/progress/video/{w.l1.id}/summary/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual({s["student_id"] for s in r.data["students"]}, {w.student_1.id, w.student_2.id})
        self.assertEqual(client_for(w.instructor_b).get(f"/api/progress/video/{w.l1.id}/summary/").status_code, 403)
        self.assertEqual(client_for(w.student_1).get(f"/api/progress/video/{w.l1.id}/summary/").status_code, 403)

    def test_heartbeats_are_rate_limited(self):
        codes = [self.put(self.w.student_1, self.w.l1).status_code for _ in range(125)]
        self.assertIn(429, codes)

    def test_watch_time_feeds_the_risk_snapshot(self):
        from django.utils import timezone
        from apps.dashboards.models import PerformanceSnapshot
        w = self.w
        VideoProgress.objects.create(student=w.student_1, lesson=w.l1, watched_seconds=600, duration_seconds=1000)
        week = timezone.now().date() - timedelta(days=timezone.now().weekday())
        snap = PerformanceSnapshot.snapshot_for_student_course(w.student_1, w.course_a, week)
        self.assertAlmostEqual(snap["video_watch_minutes"], 10.0, places=3)
