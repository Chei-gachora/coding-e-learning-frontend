from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import (
    ADMIN,
    INSTRUCTOR,
    STUDENT,
    require_student_access,
    role_of,
    scope_unlocked,
)
from apps.courses.models import Lesson
from apps.enrollment.models import Enrollment

from .models import DiscussionReply, DiscussionThread, StudentBookmark
from .serializers import (
    DiscussionReplySerializer,
    DiscussionThreadSerializer,
    StudentBookmarkSerializer,
)


class StudentBookmarkListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=StudentBookmarkSerializer(many=True))
    def get(self, request):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Bookmarks are available to students only.")
        visible_lessons = scope_unlocked(
            Lesson.objects.all(),
            request.user,
            "module",
            "module__course",
        )
        bookmarks = StudentBookmark.objects.filter(
            student=request.user,
            lesson_id__in=visible_lessons.values_list("id", flat=True),
        ).select_related("lesson__module__course")
        return Response(StudentBookmarkSerializer(bookmarks, many=True).data)

    @extend_schema(
        request=StudentBookmarkSerializer,
        responses={201: StudentBookmarkSerializer},
    )
    def post(self, request):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Bookmarks are available to students only.")
        lesson = get_object_or_404(Lesson.objects.select_related("module__course"), pk=request.data.get("lesson"))
        require_student_access(request.user, lesson.module)
        bookmark, _ = StudentBookmark.objects.get_or_create(
            student=request.user,
            lesson=lesson,
        )
        return Response(
            StudentBookmarkSerializer(bookmark).data,
            status=status.HTTP_201_CREATED,
        )


class StudentBookmarkDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={
            204: None,
            404: OpenApiResponse(description="Bookmark not found."),
        }
    )
    def delete(self, request, bookmark_id):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Bookmarks are available to students only.")
        bookmark = get_object_or_404(
            StudentBookmark, pk=bookmark_id, student=request.user
        )
        bookmark.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DiscussionThreadViewSet(viewsets.ModelViewSet):
    serializer_class = DiscussionThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        role = role_of(user)
        threads = DiscussionThread.objects.select_related(
            "author", "course"
        ).prefetch_related("replies__author")
        if role == ADMIN:
            return threads
        if role == INSTRUCTOR:
            threads = threads.filter(course__instructor=user)
        if role == STUDENT:
            enrolled_course_ids = Enrollment.objects.filter(
                student=user,
                course__status="published",
            ).values_list("course_id", flat=True)
            threads = threads.filter(course_id__in=enrolled_course_ids)
        elif role != ADMIN and role != INSTRUCTOR:
            return threads.none()
        course_id = self.request.query_params.get("course")
        if course_id:
            threads = threads.filter(course_id=course_id)
        return threads

    def perform_create(self, serializer):
        user = self.request.user
        role = role_of(user)
        course = serializer.validated_data["course"]
        if role == STUDENT and not Enrollment.objects.filter(
            student=user, course=course
        ).exists():
            raise PermissionDenied("Enroll in this course before posting.")
        if role == INSTRUCTOR and course.instructor_id != user.id:
            raise PermissionDenied("You can only post in courses you teach.")
        if role not in {ADMIN, INSTRUCTOR, STUDENT}:
            raise PermissionDenied("You cannot post in course discussions.")
        serializer.save(author=user)

    def can_moderate_discussion(self, user, thread):
        role = role_of(user)
        return role == ADMIN or (
            role == INSTRUCTOR and thread.course.instructor_id == user.id
        )

    def can_delete_discussion(self, user, thread):
        return (
            thread.author_id == user.id
            or self.can_moderate_discussion(user, thread)
        )

    def perform_destroy(self, instance):
        if not self.can_delete_discussion(self.request.user, instance):
            raise PermissionDenied("You can delete only your own discussions.")
        instance.delete()

    @action(detail=True, methods=["post"], serializer_class=DiscussionReplySerializer)
    def replies(self, request, pk=None):
        thread = self.get_object()
        serializer = DiscussionReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(thread=thread, author=request.user)
        thread.save(update_fields=["updated_at"])
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"replies/(?P<reply_id>[^/.]+)",
        url_name="reply-delete",
    )
    def delete_reply(self, request, pk=None, reply_id=None):
        thread = self.get_object()
        reply = get_object_or_404(DiscussionReply, pk=reply_id, thread=thread)
        if (
            reply.author_id != request.user.id
            and not self.can_moderate_discussion(request.user, thread)
        ):
            raise PermissionDenied("You can delete only your own replies.")
        reply.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
