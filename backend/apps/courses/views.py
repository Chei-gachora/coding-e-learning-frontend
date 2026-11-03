import mimetypes

from django.db import transaction
from django.db.models import Max, Prefetch, Q
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.access import (
    ADMIN, INSTRUCTOR, STUDENT, require_teaches, role_of, scope_by_course, scope_unlocked,
)
from apps.accounts.permissions import ReadOnlyOrInstructorAdmin
from apps.engagement.models import Notification
from apps.enrollment.models import Enrollment
from apps.progress.models import ActivityCompletion
from .models import Activity, Course, Lesson, LessonAttachment, LiveSession, Module
from .serializers import (
    ActivitySerializer, ActivityStudentSerializer, CourseDetailSerializer, CourseSerializer,
    LessonAttachmentSerializer, LessonSerializer, LessonStudentSerializer, LiveSessionSerializer,
    ModuleListSerializer, ModuleSerializer,
)


def _is_student(request):
    return role_of(request.user) == STUDENT


class LiveSessionViewSet(viewsets.ModelViewSet):
    serializer_class = LiveSessionSerializer
    permission_classes = [ReadOnlyOrInstructorAdmin]

    def get_queryset(self):
        user = self.request.user
        role = role_of(user)
        qs = LiveSession.objects.select_related("course", "course__instructor")
        if role == STUDENT:
            qs = qs.filter(
                course__enrollments__student=user,
                course__enrollments__learning_mode=Enrollment.LearningMode.INSTRUCTOR_LED,
                starts_at__gte=timezone.now(),
            ).distinct()
        elif role == INSTRUCTOR:
            qs = qs.filter(course__instructor=user)
        elif role != ADMIN:
            return qs.none()
        course_id = self.request.query_params.get("course")
        return qs.filter(course_id=course_id) if course_id else qs

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        require_teaches(self.request.user, course)
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.course)
        course = serializer.validated_data.get("course", serializer.instance.course)
        require_teaches(self.request.user, course)
        if (
            "starts_at" in serializer.validated_data
            and serializer.validated_data["starts_at"] != serializer.instance.starts_at
        ):
            Notification.objects.filter(
                dedupe_key__startswith=f"live-session:{serializer.instance.pk}:"
            ).delete()
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.course)
        Notification.objects.filter(
            dedupe_key__startswith=f"live-session:{instance.pk}:"
        ).delete()
        instance.delete()


class CourseViewSet(viewsets.ModelViewSet):
    """
    Catalog: every authenticated user can list/retrieve course *metadata*
    (title, description, instructor, module titles) so students can browse and
    enroll. Writes require owning the course (or being an admin) — being "an
    instructor" is not enough to edit somebody else's course.
    """
    queryset = Course.objects.select_related("instructor").prefetch_related("modules")
    permission_classes = [ReadOnlyOrInstructorAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        qs = super().get_queryset()
        role = role_of(self.request.user)
        if self.request.query_params.get("manage") == "true":
            if role == ADMIN:
                return qs
            if role == INSTRUCTOR:
                return qs.filter(instructor=self.request.user)
            return qs.none()
        if role == STUDENT:
            return qs.filter(status=Course.Status.PUBLISHED)
        if role != "admin":
            return qs.filter(Q(status=Course.Status.PUBLISHED) | Q(instructor=self.request.user))
        return qs

    def get_serializer_class(self):
        return CourseDetailSerializer if self.action == "retrieve" else CourseSerializer

    def perform_create(self, serializer):
        status_value = self.request.data.get("status", Course.Status.DRAFT)
        if status_value != Course.Status.DRAFT:
            raise ValidationError({
                "status": "New courses start as drafts. Add course content, then use the publish action."
            })
        serializer.save(instructor=self.request.user, status=Course.Status.DRAFT)

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def save_draft(self, request, pk=None):
        course = self.get_object()
        require_teaches(request.user, course)
        course.status = Course.Status.DRAFT
        course.save(update_fields=["status"])
        return Response(CourseSerializer(course, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def publish(self, request, pk=None):
        course = Course.objects.select_for_update().get(pk=self.get_object().pk)
        require_teaches(request.user, course)
        if not course.title.strip() or not course.description.strip():
            raise ValidationError({"course": "Add a course title and description before publishing."})
        modules = list(course.modules.prefetch_related("lessons__activities__quiz__questions").order_by("order"))
        if not modules:
            raise ValidationError({"course": "Add at least one module before publishing."})
        empty_modules = [module.title for module in modules if not module.lessons.all()]
        if empty_modules:
            raise ValidationError({"modules": "Every module needs at least one lesson before publishing."})
        quiz_activities = [
            activity
            for module in modules
            for lesson in module.lessons.all()
            for activity in lesson.activities.all()
            if activity.activity_type == "quiz"
        ]
        if not quiz_activities:
            raise ValidationError({"quizzes": "Add at least one quiz with a question before publishing."})
        incomplete_quizzes = [
            activity.title
            for activity in quiz_activities
            if not hasattr(activity, "quiz") or not activity.quiz.questions.exists()
        ]
        if incomplete_quizzes:
            raise ValidationError({"quizzes": "Add at least one question to each quiz before publishing: " + ", ".join(incomplete_quizzes)})
        course.status = Course.Status.PUBLISHED
        course.save(update_fields=["status"])
        return Response(CourseSerializer(course, context=self.get_serializer_context()).data)


class ModuleViewSet(viewsets.ModelViewSet):
    """Students: titles/order of modules in courses they're enrolled in
    (no lesson content). Instructors: modules of courses they teach."""
    queryset = Module.objects.select_related("course")
    permission_classes = [ReadOnlyOrInstructorAdmin]

    def get_serializer_class(self):
        return ModuleListSerializer if _is_student(self.request) else ModuleSerializer

    def get_queryset(self):
        qs = scope_by_course(super().get_queryset(), self.request.user, "course")
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        require_teaches(self.request.user, serializer.validated_data["course"])
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.course)
        if "course" in serializer.validated_data:  # don't allow moving into someone else's course
            require_teaches(self.request.user, serializer.validated_data["course"])
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.course)
        instance.delete()

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        course_id = request.data.get("course")
        ordered_ids = request.data.get("module_ids")
        try:
            course = Course.objects.get(pk=course_id)
        except (Course.DoesNotExist, TypeError, ValueError):
            raise NotFound("Course not found.")
        require_teaches(request.user, course)
        modules = list(Module.objects.select_for_update().filter(course=course).order_by("order"))
        self._validate_order(ordered_ids, modules, "module_ids")
        if ordered_ids:
            offset = (max(module.order for module in modules) + len(modules) + 1)
            for module in modules:
                module.order += offset
            Module.objects.bulk_update(modules, ["order"])
            by_id = {module.id: module for module in modules}
            for index, module_id in enumerate(ordered_ids, start=1):
                by_id[module_id].order = index
            Module.objects.bulk_update(modules, ["order"])
        return Response(ModuleListSerializer(Module.objects.filter(course=course).order_by("order"), many=True).data)

    @action(detail=True, methods=["post"], url_path="reorder-lessons")
    def reorder_lessons(self, request, pk=None):
        module = self.get_object()
        require_teaches(request.user, module.course)
        lessons = list(Lesson.objects.select_for_update().filter(module=module).order_by("order"))
        ordered_ids = request.data.get("lesson_ids")
        self._validate_order(ordered_ids, lessons, "lesson_ids")
        if ordered_ids:
            offset = max(lesson.order for lesson in lessons) + len(lessons) + 1
            for lesson in lessons:
                lesson.order += offset
            Lesson.objects.bulk_update(lessons, ["order"])
            by_id = {lesson.id: lesson for lesson in lessons}
            for index, lesson_id in enumerate(ordered_ids, start=1):
                by_id[lesson_id].order = index
            Lesson.objects.bulk_update(lessons, ["order"])
        return Response(LessonSerializer(Lesson.objects.filter(module=module).order_by("order"), many=True).data)

    @staticmethod
    def _validate_order(ordered_ids, objects, field):
        if not isinstance(ordered_ids, list) or len(ordered_ids) != len(objects):
            raise ValidationError({field: "Provide every item in this course/module exactly once."})
        existing_ids = {obj.id for obj in objects}
        if len(set(ordered_ids)) != len(ordered_ids) or set(ordered_ids) != existing_ids:
            raise ValidationError({field: "IDs must match the existing items exactly, without duplicates."})


class LessonViewSet(viewsets.ModelViewSet):
    """
    SECURITY: the enforcement point for lesson content. A student sees only
    lessons in courses they're ENROLLED in whose module is UNLOCKED; anything
    else 404s (doesn't confirm the ID exists). Instructors see only courses
    they teach.
    """
    queryset = Lesson.objects.select_related("module__course")
    permission_classes = [ReadOnlyOrInstructorAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        return LessonStudentSerializer if _is_student(self.request) else LessonSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        module_id = self.request.query_params.get("module")
        if module_id:
            qs = qs.filter(module_id=module_id)
        qs = scope_unlocked(qs, self.request.user, "module", "module__course")
        if _is_student(self.request):
            qs = qs.prefetch_related(Prefetch(
                "activities__completions",
                queryset=ActivityCompletion.objects.filter(student=self.request.user),
                to_attr="_student_completions",
            ))
        return qs

    def perform_create(self, serializer):
        require_teaches(self.request.user, serializer.validated_data["module"].course)
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.module.course)
        if "module" in serializer.validated_data:
            require_teaches(self.request.user, serializer.validated_data["module"].course)
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.module.course)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="video")
    def video(self, request, pk=None):
        lesson = self.get_object()
        if not lesson.video_file:
            raise NotFound("This lesson does not have an uploaded video.")
        video = lesson.video_file.open("rb")
        size = lesson.video_file.size
        start, end = 0, size - 1
        status_code = 200
        range_header = request.headers.get("Range")
        if range_header:
            try:
                unit, requested = range_header.split("=", 1)
                if unit != "bytes" or "," in requested:
                    raise ValueError
                first, _, last = requested.partition("-")
                if not first:
                    length = int(last)
                    start = max(0, size - length)
                else:
                    start = int(first)
                    if last:
                        end = min(int(last), end)
                if start < 0 or start >= size or end < start:
                    raise ValueError
                status_code = 206
            except (ValueError, TypeError):
                video.close()
                response = HttpResponse(status=416)
                response["Content-Range"] = f"bytes */{size}"
                return response

        video.seek(start)
        remaining = end - start + 1

        def chunks():
            try:
                while remaining_bytes[0] > 0:
                    chunk = video.read(min(1024 * 1024, remaining_bytes[0]))
                    if not chunk:
                        break
                    remaining_bytes[0] -= len(chunk)
                    yield chunk
            finally:
                video.close()

        remaining_bytes = [remaining]
        content_type = mimetypes.guess_type(lesson.video_file.name)[0] or "application/octet-stream"
        response = StreamingHttpResponse(chunks(), status=status_code, content_type=content_type)
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(remaining)
        response["Content-Disposition"] = "inline"
        response["X-Content-Type-Options"] = "nosniff"
        if status_code == 206:
            response["Content-Range"] = f"bytes {start}-{end}/{size}"
        return response


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.select_related("lesson__module__course")
    permission_classes = [ReadOnlyOrInstructorAdmin]

    def get_serializer_class(self):
        return ActivityStudentSerializer if _is_student(self.request) else ActivitySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        activity_type = self.request.query_params.get("activity_type")
        if activity_type:
            valid_types = Activity._meta.get_field("activity_type").choices
            if activity_type not in dict(valid_types):
                raise ValidationError({"activity_type": "Choose a valid activity type."})
            qs = qs.filter(activity_type=activity_type)
        qs = scope_unlocked(qs, self.request.user, "lesson__module", "lesson__module__course")
        if _is_student(self.request):
            qs = qs.prefetch_related(Prefetch(
                "completions",
                queryset=ActivityCompletion.objects.filter(student=self.request.user),
                to_attr="_student_completions",
            ))
        return qs

    def perform_create(self, serializer):
        require_teaches(self.request.user, serializer.validated_data["lesson"].module.course)
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.lesson.module.course)
        if "lesson" in serializer.validated_data:
            require_teaches(self.request.user, serializer.validated_data["lesson"].module.course)
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.lesson.module.course)
        instance.delete()


class LessonAttachmentViewSet(viewsets.ModelViewSet):
    """
    Downloadable files and external links attached to a lesson (same visibility as the lesson).
    Files are downloaded via GET /lesson-attachments/<id>/download/ — an
    authenticated endpoint — never via a public /media/ URL.
    """
    queryset = LessonAttachment.objects.select_related("lesson__module__course", "uploaded_by")
    serializer_class = LessonAttachmentSerializer
    permission_classes = [ReadOnlyOrInstructorAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return scope_unlocked(qs, self.request.user, "lesson__module", "lesson__module__course")

    def perform_create(self, serializer):
        require_teaches(self.request.user, serializer.validated_data["lesson"].module.course)
        serializer.save(uploaded_by=self.request.user)

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.lesson.module.course)
        if "lesson" in serializer.validated_data:
            require_teaches(self.request.user, serializer.validated_data["lesson"].module.course)
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.lesson.module.course)
        instance.delete()

    @action(detail=True, methods=["get"], parser_classes=[JSONParser])
    def download(self, request, pk=None):
        attachment = self.get_object()  # goes through get_queryset -> enrollment + locking
        if not attachment.file:
            raise NotFound()
        content_type = mimetypes.guess_type(attachment.file.name)[0] or "application/octet-stream"
        response = FileResponse(
            attachment.file.open("rb"),
            as_attachment=True,
            filename=attachment.file.name.rsplit("/", 1)[-1],
            content_type=content_type,
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
