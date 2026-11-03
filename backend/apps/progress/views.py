from rest_framework import permissions, serializers
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from apps.accounts.access import can_view_course
from apps.courses.models import Course, Module
from .services import is_module_unlocked, is_module_complete


class CourseProgressView(APIView):
    """
    GET /api/progress/course/<course_id>/
    Returns every module in the course with the current student's status:
    'done' | 'active' (unlocked, not yet complete) | 'locked'.
    This is the exact shape the student dashboard's progress card needs.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="CourseModuleProgress",
            many=True,
            fields={
                "module_id": serializers.IntegerField(),
                "title": serializers.CharField(),
                "order": serializers.IntegerField(),
                "status": serializers.ChoiceField(
                    choices=["done", "active", "locked"]
                ),
            },
        )
    )
    def get(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            raise NotFound("Course not found.")
        if not can_view_course(request.user, course):
            raise NotFound("Course not found.")  # same as missing: don't reveal which IDs exist
        modules = Module.objects.filter(course=course).order_by("order")

        result = []
        for module in modules:
            unlocked = is_module_unlocked(request.user, module)
            complete = is_module_complete(request.user, module) if unlocked else False

            if complete:
                status = "done"
            elif unlocked:
                status = "active"
            else:
                status = "locked"

            result.append({
                "module_id": module.id,
                "title": module.title,
                "order": module.order,
                "status": status,
            })

        return Response(result)


class ModuleAccessCheckView(APIView):
    """
    GET /api/progress/can-access/<module_id>/
    The actual enforcement endpoint: lesson/activity views should call
    this (or the is_module_unlocked() function directly) before serving
    content, so a student can't bypass locking by hitting the lesson API
    URL directly.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="ModuleAccessCheck",
            fields={
                "module_id": serializers.IntegerField(),
                "unlocked": serializers.BooleanField(),
            },
        )
    )
    def get(self, request, module_id):
        try:
            module = Module.objects.select_related("course").get(pk=module_id)
        except Module.DoesNotExist:
            raise NotFound("Module not found.")
        if not can_view_course(request.user, module.course):
            raise NotFound("Module not found.")
        unlocked = is_module_unlocked(request.user, module)
        return Response({"module_id": module.id, "unlocked": unlocked})


# ---------------------------------------------------------------------------
# Video progress
# ---------------------------------------------------------------------------
from django.utils import timezone  # noqa: E402
from rest_framework.exceptions import PermissionDenied, ValidationError  # noqa: E402
from rest_framework.throttling import UserRateThrottle  # noqa: E402

from apps.accounts.access import ADMIN, INSTRUCTOR, STUDENT, require_student_access, require_teaches, role_of  # noqa: E402
from apps.courses.models import Lesson  # noqa: E402
from apps.courses.validators import classify_video_url  # noqa: E402
from .models import VideoProgress  # noqa: E402
from .video import apply_ping  # noqa: E402


class VideoHeartbeatThrottle(UserRateThrottle):
    scope = "video_progress"


def _video_payload(vp):
    return {
        "lesson": vp.lesson_id, "position": round(vp.position_seconds, 1),
        "duration": round(vp.duration_seconds, 1), "watched_seconds": round(vp.watched_seconds, 1),
        "percent": vp.percent, "completed": vp.completed,
    }


class LessonVideoProgressView(APIView):
    """
    GET /api/progress/video/<lesson_id>/  -> where to resume + how much is really watched
    PUT /api/progress/video/<lesson_id>/  body {position, duration, playing, rate}

    Students only, and only for lessons in courses they're enrolled in whose
    module is unlocked. Only tracked video types (YouTube / direct files) —
    Vimeo embeds can't report a position.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        return [VideoHeartbeatThrottle()] if self.request.method == "PUT" else []

    def _lesson(self, request, lesson_id):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Video progress is tracked for students only.")
        try:
            lesson = Lesson.objects.select_related("module__course").get(pk=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFound()
        try:
            require_student_access(request.user, lesson.module)
        except PermissionDenied:
            raise NotFound()  # don't reveal lessons in courses/modules the student can't reach
        if not lesson.video_file and classify_video_url(lesson.video_url) not in ("youtube", "file"):
            raise ValidationError("This lesson has no trackable video.")
        return lesson

    @extend_schema(
        responses=inline_serializer(
            name="LessonVideoProgress",
            fields={
                "lesson": serializers.IntegerField(),
                "position": serializers.FloatField(),
                "duration": serializers.FloatField(),
                "watched_seconds": serializers.FloatField(),
                "percent": serializers.FloatField(),
                "completed": serializers.BooleanField(),
            },
        )
    )
    def get(self, request, lesson_id):
        lesson = self._lesson(request, lesson_id)
        vp = VideoProgress.objects.filter(student=request.user, lesson=lesson).first()
        return Response(_video_payload(vp) if vp else {
            "lesson": lesson.id, "position": 0, "duration": 0, "watched_seconds": 0, "percent": 0, "completed": False})

    @extend_schema(
        request=inline_serializer(
            name="LessonVideoProgressUpdate",
            fields={
                "position": serializers.FloatField(),
                "duration": serializers.FloatField(),
                "playing": serializers.BooleanField(required=False),
                "rate": serializers.FloatField(required=False),
            },
        ),
        responses=inline_serializer(
            name="LessonVideoProgressUpdateResponse",
            fields={
                "lesson": serializers.IntegerField(),
                "position": serializers.FloatField(),
                "duration": serializers.FloatField(),
                "watched_seconds": serializers.FloatField(),
                "percent": serializers.FloatField(),
                "completed": serializers.BooleanField(),
            },
        ),
    )
    def put(self, request, lesson_id):
        lesson = self._lesson(request, lesson_id)
        try:
            position = float(request.data.get("position"))
            duration = float(request.data.get("duration"))
        except (TypeError, ValueError):
            raise ValidationError("'position' and 'duration' must be numbers (seconds).")
        import math
        if not (math.isfinite(position) and math.isfinite(duration)) or position < 0 or duration <= 0:
            raise ValidationError("'position' and 'duration' must be finite, positive numbers of seconds.")
        try:
            rate = float(request.data.get("rate", 1.0))
        except (TypeError, ValueError):
            rate = 1.0
        playing = bool(request.data.get("playing", False))

        from django.db import transaction
        with transaction.atomic():
            vp, _ = VideoProgress.objects.select_for_update().get_or_create(student=request.user, lesson=lesson)
            watched_before = vp.watched_seconds
            apply_ping(vp, position, duration, playing, rate, timezone.now())
            vp.save()
            if vp.watched_seconds > watched_before:
                from apps.engagement.services import record_study_activity

                record_study_activity(request.user)
        return Response(_video_payload(vp))


class LessonVideoSummaryView(APIView):
    """GET /api/progress/video/<lesson_id>/summary/ — instructor/admin: how far each
    enrolled student has genuinely watched. Only for lessons in courses they teach."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="LessonVideoProgressSummary",
            fields={
                "lesson": serializers.IntegerField(),
                "has_video": serializers.BooleanField(),
                "students": inline_serializer(
                    name="LessonVideoStudentProgress",
                    many=True,
                    fields={
                        "student_id": serializers.IntegerField(),
                        "student": serializers.CharField(),
                        "percent": serializers.FloatField(),
                        "completed": serializers.BooleanField(),
                    },
                ),
            },
        )
    )
    def get(self, request, lesson_id):
        if role_of(request.user) not in (INSTRUCTOR, ADMIN):
            raise PermissionDenied()
        try:
            lesson = Lesson.objects.select_related("module__course").get(pk=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFound()
        require_teaches(request.user, lesson.module.course)
        from apps.enrollment.models import Enrollment
        progress = {vp.student_id: vp for vp in VideoProgress.objects.filter(lesson=lesson)}
        rows = []
        for e in Enrollment.objects.filter(course=lesson.module.course).select_related("student"):
            vp = progress.get(e.student_id)
            rows.append({
                "student_id": e.student_id,
                "student": e.student.get_full_name() or e.student.username,
                "percent": vp.percent if vp else 0.0,
                "completed": bool(vp and vp.completed),
            })
        return Response({"lesson": lesson.id, "has_video": bool(lesson.video_url), "students": rows})
