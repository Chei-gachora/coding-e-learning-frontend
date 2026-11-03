from django.db import transaction
from django.db.models import Max
from django.http import FileResponse
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.accounts.access import ADMIN, INSTRUCTOR, STUDENT, require_student_access, role_of
from apps.accounts.permissions import IsInstructorOrAdmin
from apps.courses.models import Activity, ActivityType
from .models import Submission, SubmissionStatus
from .serializers import GradeSubmissionSerializer, SubmissionSerializer
from .services import sync_completion


class SubmissionUploadThrottle(UserRateThrottle):
    scope = "upload"


class SubmissionViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                        mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    - Students: create submissions and read THEIR OWN. Nothing else — there
      is no update or delete, because deleting a submission used to reset the
      attempt counter and editing one after grading would change a graded record.
    - Instructors: read and grade submissions for courses THEY teach.
    - Admins: everything.
    """
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_throttles(self):
        # Only the expensive write is rate-limited (see THROTTLE_RATES["upload"]).
        return [SubmissionUploadThrottle()] if self.action == "create" else []

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("student", "activity__lesson__module__course")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(student=user)
        elif role == INSTRUCTOR:
            qs = qs.filter(activity__lesson__module__course__instructor=user)
        elif role != ADMIN:
            qs = qs.none()
        activity_id = self.request.query_params.get("activity")
        if activity_id:
            qs = qs.filter(activity_id=activity_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        student = self.request.user
        if role_of(student) != STUDENT:
            raise PermissionDenied("Only students can submit work.")

        activity = serializer.validated_data["activity"]
        module = activity.lesson.module

        # Enrollment + module locking (server-side; the UI hiding a page proves nothing).
        require_student_access(student, module)

        if activity.activity_type == ActivityType.QUIZ:
            raise ValidationError("Quizzes are answered in the quiz, not submitted as files.")
        if activity.activity_type == ActivityType.QUESTIONNAIRE:
            raise ValidationError("Questionnaires must be submitted through the questionnaire response endpoint.")
        if activity.deadline and timezone.now() > activity.deadline:
            raise ValidationError("The deadline for this activity has passed.")

        with transaction.atomic():
            # Serialise concurrent submits for the same activity so two parallel
            # requests can't both squeeze under the attempt limit.
            Activity.objects.select_for_update().get(pk=activity.pk)
            mine = Submission.objects.filter(student=student, activity=activity)
            if mine.count() >= activity.max_attempts:
                raise ValidationError(f"Maximum attempts ({activity.max_attempts}) already used for this activity.")
            next_attempt = (mine.aggregate(m=Max("attempt_number"))["m"] or 0) + 1
            serializer.save(student=student, attempt_number=next_attempt)

    @action(detail=True, methods=["patch"], permission_classes=[IsInstructorOrAdmin], parser_classes=[JSONParser])
    def grade(self, request, pk=None):
        """
        PATCH /api/submissions/<id>/grade/  body: {"grade": 8, "feedback": "..."}
        `get_object` is scoped to courses the instructor teaches, so grading
        someone else's course 404s. A passing grade (>= activity.pass_percentage
        of max_score) completes the activity, which can unlock the next module.
        """
        submission = self.get_object()
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        activity = submission.activity
        grade = serializer.validated_data["grade"]
        if grade > activity.max_score:
            raise ValidationError({"grade": f"Grade cannot exceed the activity's maximum score ({activity.max_score})."})

        with transaction.atomic():
            submission.grade = grade
            submission.feedback = serializer.validated_data.get("feedback", "")
            submission.status = SubmissionStatus.GRADED
            submission.graded_at = timezone.now()
            submission.save()
            completed = sync_completion(submission.student, activity)
            from apps.engagement.services import create_notification

            create_notification(
                submission.student,
                "submission_graded",
                "Submission graded",
                f"{activity.title} was graded: {grade:g} / {activity.max_score}.",
                "/dashboard/student/grades",
            )

        data = SubmissionSerializer(submission, context={"request": request}).data
        data["activity_completed"] = completed
        return Response(data)

    @action(detail=True, methods=["get"], parser_classes=[JSONParser])
    def download(self, request, pk=None):
        """Authenticated file download — same visibility rules as the record."""
        submission = self.get_object()
        if not submission.file:
            raise NotFound()
        response = FileResponse(
            submission.file.open("rb"), as_attachment=True,
            filename=submission.file.name.rsplit("/", 1)[-1],
            content_type="application/octet-stream",
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
