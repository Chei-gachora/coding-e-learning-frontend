"""Code-execution client: authorization, input hygiene, answer-key privacy, failure handling.
The runner itself is tested by sandbox/test_runner.py; here it is mocked."""
from unittest.mock import MagicMock, patch

import requests
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.testing import World, client_for


def runner(stdout="", exit_code=0, timed_out=False, stderr="", status=200):
    m = MagicMock()
    m.status_code = status
    m.json.return_value = {"stdout": stdout, "stderr": stderr, "exit_code": exit_code, "timed_out": timed_out}
    return m


@override_settings(SANDBOX_TOKEN="test-runner-token")
class ExecutionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.w = World()

    def setUp(self):
        cache.clear()

    def run_code(self, user, **body):
        body.setdefault("language", "python")
        body.setdefault("code", "print(1)")
        return client_for(user).post("/api/execute/run/", body, format="json")

    def run_tests(self, user, activity=None, **body):
        activity = activity or self.w.exercise
        body.setdefault("language", activity.language)
        body.setdefault("code", "print(input())")
        body.setdefault("activity_id", activity.id)
        return client_for(user).post("/api/execute/test/", body, format="json")

    # ---- /run/ ----
    @patch("apps.execution.views.requests.post")
    def test_run_forwards_only_whitelisted_fields(self, post):
        post.return_value = runner("1\n")
        r = self.run_code(self.w.student_1, stdin="in", timeout=9999, memory_mb=99999, network=True, cmd="rm -rf /")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(set(post.call_args.kwargs["json"]), {"language", "code", "stdin"})

    @patch("apps.execution.views.requests.post")
    def test_run_sends_shared_secret_and_uses_timeouts(self, post):
        post.return_value = runner()
        with self.settings(SANDBOX_TOKEN="tok"):
            self.run_code(self.w.student_1)
        self.assertEqual(post.call_args.kwargs["headers"]["X-Sandbox-Token"], "tok")
        self.assertIsInstance(post.call_args.kwargs["timeout"], tuple)

    def test_run_input_validation(self):
        u = self.w.student_1
        self.assertEqual(self.run_code(u, language="ruby").status_code, 400)
        self.assertEqual(self.run_code(u, language="html").status_code, 400)
        self.assertEqual(self.run_code(u, language=["python"]).status_code, 400)
        self.assertEqual(self.run_code(u, code="").status_code, 400)
        self.assertEqual(self.run_code(u, code=123).status_code, 400)
        self.assertEqual(self.run_code(u, code="x" * 20_001).status_code, 400)
        self.assertEqual(self.run_code(u, stdin="x" * 10_001).status_code, 400)

    @patch("apps.execution.views.requests.post")
    def test_run_accepts_compiled_languages(self, post):
        post.return_value = runner("42\n")

        for language in ("c", "cpp", "java"):
            response = self.run_code(self.w.student_1, language=language)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(post.call_args.kwargs["json"]["language"], language)

    @patch("apps.execution.views.requests.post")
    def test_activity_tests_accept_compiled_languages(self, post):
        post.return_value = runner("hi\n")
        activity = self.w.exercise

        for language in ("c", "cpp", "java"):
            activity.language = language
            activity.save(update_fields=["language"])
            response = self.run_tests(
                self.w.student_1,
                activity=activity,
                language=language,
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(post.call_args.kwargs["json"]["language"], language)

    @patch("apps.execution.views.requests.post")
    def test_runner_down_gives_generic_503_without_internal_details(self, post):
        post.side_effect = requests.ConnectionError("HTTPConnectionPool(host='sandbox', port=9000): refused")
        r = self.run_code(self.w.student_1)
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.data["code"], "CODE_RUNNER_UNAVAILABLE")
        self.assertNotIn("sandbox", r.content.decode().lower().replace("code runner", ""))
        self.assertNotIn("9000", r.content.decode())

    @patch("apps.execution.views.requests.post")
    def test_missing_runner_token_is_reported_without_making_a_request(self, post):
        with self.settings(SANDBOX_TOKEN=""):
            response = self.run_code(self.w.student_1)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "CODE_RUNNER_UNAVAILABLE")
        post.assert_not_called()

    @patch("apps.execution.views.requests.post")
    def test_runner_garbage_response_is_handled(self, post):
        bad = MagicMock(status_code=200)
        bad.json.side_effect = ValueError("not json")
        post.return_value = bad
        self.assertEqual(self.run_code(self.w.student_1).status_code, 503)
        post.return_value = runner(status=500)
        self.assertEqual(self.run_code(self.w.student_1).status_code, 503)

    @patch("apps.execution.views.requests.post")
    def test_huge_output_is_truncated(self, post):
        post.return_value = runner("A" * 500_000)
        r = self.run_code(self.w.student_1)
        self.assertLess(len(r.data["stdout"]), 10_100)

    @patch("apps.execution.views.requests.post")
    def test_run_is_rate_limited(self, post):
        post.return_value = runner()
        codes = [self.run_code(self.w.student_1).status_code for _ in range(32)]
        self.assertIn(429, codes)
        self.assertEqual(codes[:30], [200] * 30)

    # ---- /test/ ----
    @patch("apps.execution.views.requests.post")
    def test_expected_outputs_never_reach_the_runner_or_the_student(self, post):
        post.side_effect = [runner("hi\n"), runner("wrong\n")]
        r = self.run_tests(self.w.student_1)
        self.assertEqual(r.status_code, 200)
        for call in post.call_args_list:
            self.assertNotIn("SECRET-ANSWER", str(call))
            self.assertEqual(set(call.kwargs["json"]), {"language", "code", "stdin"})
        body = r.content.decode()
        self.assertNotIn("SECRET-ANSWER", body)
        self.assertNotIn("SECRET-INPUT", body)
        self.assertEqual((r.data["passed"], r.data["total"]), (1, 2))
        self.assertEqual([x["passed"] for x in r.data["results"]], [True, False])
        self.assertEqual(r.data["results"][0]["expected_output"], "hi")          # public case: details shown
        self.assertNotIn("expected_output", r.data["results"][1])                 # hidden case: pass/fail only

    @patch("apps.execution.views.requests.post")
    def test_staff_see_full_details_and_must_own_the_course(self, post):
        post.side_effect = [runner("hi"), runner("nope")]
        r = self.run_tests(self.w.instructor_a)
        self.assertEqual(r.data["results"][1]["expected_output"], "SECRET-ANSWER")
        self.assertEqual(self.run_tests(self.w.instructor_b).status_code, 403)

    @patch("apps.execution.views.requests.post")
    def test_students_cannot_test_against_locked_or_foreign_activities(self, post):
        post.return_value = runner()
        self.assertEqual(self.run_tests(self.w.outsider).status_code, 404)
        self.assertEqual(self.run_tests(self.w.student_1, activity=self.w.b_act).status_code, 404)
        post.assert_not_called()

    @patch("apps.execution.views.requests.post")
    def test_timeouts_and_crashes_fail_the_case(self, post):
        post.side_effect = [runner("hi", timed_out=True, exit_code=None), runner("hi", exit_code=1, stderr="Traceback...\nNameError")]
        r = self.run_tests(self.w.student_1)
        self.assertEqual(r.data["passed"], 0)
        self.assertTrue(r.data["results"][0]["timed_out"])
        self.assertIn("NameError", r.data["results"][1]["error"])

    def test_activity_without_tests_or_of_wrong_type(self):
        self.assertEqual(self.run_tests(self.w.student_1, activity=self.w.assignment).status_code, 400)
        self.assertEqual(self.run_tests(self.w.student_1, activity_id="abc").status_code, 404)

    def test_activity_rejects_code_in_a_different_language(self):
        activity = self.w.exercise
        other_language = "python" if activity.language == "javascript" else "javascript"
        response = self.run_tests(self.w.student_1, activity=activity, language=other_language)
        self.assertEqual(response.status_code, 400)

    @patch("apps.execution.views.requests.post")
    def test_html_activity_does_not_use_the_code_runner_for_tests(self, post):
        activity = self.w.exercise
        activity.language = "html"
        activity.save(update_fields=["language"])

        response = self.run_tests(self.w.student_1, activity=activity)

        self.assertEqual(response.status_code, 400)
        self.assertIn("HTML activities", str(response.data))
        post.assert_not_called()
