"""
Code execution — a thin, defensive client for an isolated runner service.

Student code is never run inside Django. It is sent to SANDBOX_URL (see the
/sandbox directory for the reference runner + its container limits).

What THIS layer is responsible for (the runner enforces CPU/memory/time/
network limits; see sandbox/README.md):
  * who may run code: authenticated users; for /test/ students must be
    enrolled in the course and have the module unlocked, instructors must
    teach the course
  * input hygiene: language allowlist, size caps, and ONLY {language, code,
    stdin} are forwarded — a client cannot smuggle extra fields such as
    timeouts or memory limits through to the runner
  * rate limiting (each run costs real CPU)
  * keeping answer keys private: expected outputs stay in Django and never
    reach the runner; students only see pass/fail (plus details for tests an
    instructor explicitly marks "public": true)
  * containing failures: runner errors and internal URLs never reach the client
"""
import json
import logging

import requests
from django.conf import settings
from rest_framework import permissions
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer

from apps.accounts.access import STUDENT, require_student_access, require_teaches, role_of

logger = logging.getLogger(__name__)

ALLOWED_LANGUAGES = {"python", "javascript", "c", "cpp", "java"}
ALLOWED_ACTIVITY_LANGUAGES = ALLOWED_LANGUAGES | {"html"}
MAX_CODE_LENGTH = 20_000
MAX_STDIN_LENGTH = 10_000
MAX_TEST_CASES = 25
MAX_OUTPUT_CHARS = 10_000
CONNECT_TIMEOUT = 3
RUN_READ_TIMEOUT = 15          # runner's own wall clock limit is lower (see sandbox/runner.py)
TEST_READ_TIMEOUT = 60


class CodeRunThrottle(UserRateThrottle):
    scope = "code_run"


def _clean_request(request, allowed_languages=ALLOWED_LANGUAGES):
    code, language = request.data.get("code"), request.data.get("language")
    if not isinstance(language, str) or language not in allowed_languages:
        raise ValidationError({"language": f"Choose one of: {', '.join(sorted(allowed_languages))}."})
    if not isinstance(code, str) or not code.strip():
        raise ValidationError({"code": "Code is required."})
    if len(code) > MAX_CODE_LENGTH:
        raise ValidationError({"code": f"Code exceeds the {MAX_CODE_LENGTH}-character limit."})
    return language, code


def _call_runner(payload, read_timeout):
    """POST to the runner. Returns parsed JSON or raises a generic 503-style error."""
    if not settings.SANDBOX_TOKEN:
        logger.error("Code runner is unavailable: SANDBOX_TOKEN is not configured.")
        return None

    try:
        resp = requests.post(
            f"{settings.SANDBOX_URL}/run",
            json=payload,
            headers={"X-Sandbox-Token": settings.SANDBOX_TOKEN},
            timeout=(CONNECT_TIMEOUT, read_timeout),
        )
        data = resp.json()
        if resp.status_code != 200 or not isinstance(data, dict):
            raise ValueError(f"runner returned HTTP {resp.status_code}")
        return data
    except (requests.RequestException, ValueError) as exc:
        logger.error("Code runner failure: %s", exc)   # detail stays in the logs
        return None


def _trim(text):
    text = text if isinstance(text, str) else ""
    return text[:MAX_OUTPUT_CHARS] + ("\n…output truncated" if len(text) > MAX_OUTPUT_CHARS else "")


def _unavailable():
    return Response({
        "code": "CODE_RUNNER_UNAVAILABLE",
        "error": "Code execution is unavailable. Verify the isolated code runner is running and configured, then try again.",
    }, status=503)


class RunCodeView(APIView):
    """POST /api/execute/run/  {language, code, stdin?}  — free-form scratchpad."""
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        return [CodeRunThrottle()]

    @extend_schema(
        request=inline_serializer(
            name="RunCodeRequest",
            fields={
                "language": serializers.ChoiceField(choices=sorted(ALLOWED_LANGUAGES)),
                "code": serializers.CharField(max_length=MAX_CODE_LENGTH),
                "stdin": serializers.CharField(
                    max_length=MAX_STDIN_LENGTH, required=False, allow_blank=True
                ),
            },
        ),
        responses={
            200: inline_serializer(
                name="RunCodeResponse",
                fields={
                    "stdout": serializers.CharField(allow_blank=True),
                    "stderr": serializers.CharField(allow_blank=True),
                    "exit_code": serializers.IntegerField(allow_null=True),
                    "timed_out": serializers.BooleanField(),
                },
            ),
            503: inline_serializer(
                name="CodeRunnerUnavailable",
                fields={
                    "code": serializers.CharField(),
                    "error": serializers.CharField(),
                },
            ),
        },
    )
    def post(self, request):
        language, code = _clean_request(request)
        stdin = request.data.get("stdin", "")
        if not isinstance(stdin, str) or len(stdin) > MAX_STDIN_LENGTH:
            raise ValidationError({"stdin": f"stdin must be text of at most {MAX_STDIN_LENGTH} characters."})

        result = _call_runner({"language": language, "code": code, "stdin": stdin}, RUN_READ_TIMEOUT)
        if result is None:
            return _unavailable()
        return Response({
            "stdout": _trim(result.get("stdout")),
            "stderr": _trim(result.get("stderr")),
            "exit_code": result.get("exit_code"),
            "timed_out": bool(result.get("timed_out")),
        })


class RunTestsView(APIView):
    """
    POST /api/execute/test/  {language, code, activity_id}
    Runs the code once per test case (input -> stdin) and compares stdout with
    the expected output *here*, not in the runner.

    Response (students): {"passed": 2, "total": 3, "score": 66.7,
      "results": [{"index": 1, "passed": true}, ...]}. Details of a case
    (input/expected/actual) are included only if the instructor set
    "public": true on it, or for staff.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        return [CodeRunThrottle()]

    @extend_schema(
        request=inline_serializer(
            name="RunTestsRequest",
            fields={
                "language": serializers.ChoiceField(
                    choices=sorted(ALLOWED_ACTIVITY_LANGUAGES)
                ),
                "code": serializers.CharField(max_length=MAX_CODE_LENGTH),
                "activity_id": serializers.IntegerField(),
            },
        ),
        responses={
            200: inline_serializer(
                name="RunTestsResponse",
                fields={
                    "passed": serializers.IntegerField(),
                    "total": serializers.IntegerField(),
                    "score": serializers.FloatField(),
                    "results": inline_serializer(
                        name="RunTestCaseResult",
                        many=True,
                        fields={
                            "index": serializers.IntegerField(),
                            "passed": serializers.BooleanField(),
                            "timed_out": serializers.BooleanField(),
                            "error": serializers.CharField(required=False),
                            "input": serializers.CharField(required=False),
                            "expected_output": serializers.CharField(required=False),
                            "actual_output": serializers.CharField(required=False),
                        },
                    ),
                },
            ),
            503: inline_serializer(
                name="CodeTestRunnerUnavailable",
                fields={
                    "code": serializers.CharField(),
                    "error": serializers.CharField(),
                },
            ),
        },
    )
    def post(self, request):
        from apps.courses.models import Activity, ActivityType

        language, code = _clean_request(request, ALLOWED_ACTIVITY_LANGUAGES)
        try:
            activity = Activity.objects.select_related("lesson__module__course").get(pk=request.data.get("activity_id"))
        except (Activity.DoesNotExist, ValueError, TypeError):
            raise NotFound("Activity not found.")

        user = request.user
        course = activity.lesson.module.course
        if role_of(user) == STUDENT:
            try:
                require_student_access(user, activity.lesson.module)
            except PermissionDenied:
                raise NotFound("Activity not found.")   # don't reveal activities in courses they can't reach
        else:
            require_teaches(user, course)
        staff = role_of(user) != STUDENT

        if activity.activity_type not in (ActivityType.EXERCISE, ActivityType.LAB):
            raise ValidationError("This activity has no automated tests.")
        if language != activity.language:
            raise ValidationError({"language": f"This activity uses {activity.language}."})
        if activity.language == "html":
            raise ValidationError("HTML activities use the in-page preview and do not support automated runner tests.")
        cases = activity.test_cases if isinstance(activity.test_cases, list) else []
        if not cases:
            raise ValidationError("This activity has no test cases yet.")
        cases = cases[:MAX_TEST_CASES]

        results, passed = [], 0
        for i, case in enumerate(cases, start=1):
            case = case if isinstance(case, dict) else {}
            stdin = case.get("input", "")
            stdin = stdin if isinstance(stdin, str) else json.dumps(stdin)
            expected = case.get("expected_output", "")
            expected = expected if isinstance(expected, str) else json.dumps(expected)

            run = _call_runner({"language": language, "code": code, "stdin": stdin[:MAX_STDIN_LENGTH]}, TEST_READ_TIMEOUT)
            if run is None:
                return _unavailable()
            actual = (run.get("stdout") or "")
            ok = (not run.get("timed_out")) and run.get("exit_code") == 0 and actual.strip() == expected.strip()
            passed += ok
            row = {"index": i, "passed": ok, "timed_out": bool(run.get("timed_out"))}
            if not ok and run.get("exit_code") not in (0, None):
                row["error"] = _trim(run.get("stderr"))[-1000:]      # the student's own traceback
            if staff or case.get("public") is True:
                row.update({"input": stdin, "expected_output": expected, "actual_output": _trim(actual)})
            results.append(row)

        return Response({
            "passed": passed, "total": len(results),
            "score": round(passed / len(results) * 100, 1),
            "results": results,
        })
