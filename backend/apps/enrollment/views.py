from django.db import IntegrityError
from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.access import ADMIN, INSTRUCTOR, STUDENT, role_of
from .models import Enrollment
from .serializers import EnrollmentSerializer


class EnrollmentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                        mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    Students enroll themselves (POST {"course": id}) and see only their own
    enrollments. Instructors see enrollments for courses THEY teach; admins
    see all. There is deliberately no update/delete: a student must not be
    able to re-point an enrollment at another course. Students may remove only
    their own enrollment; their course work remains attached to their account.
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrollment.objects.select_related("student", "course", "course__instructor")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(student=user)
        elif role == INSTRUCTOR:
            qs = qs.filter(course__instructor=user)
        elif role != ADMIN:
            qs = qs.none()
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if role_of(user) != STUDENT:
            raise PermissionDenied("Only students can enroll in courses.")
        course = serializer.validated_data["course"]
        if Enrollment.objects.filter(student=user, course=course).exists():
            raise ValidationError("You are already enrolled in this course.")
        try:
            serializer.save(student=user)
        except IntegrityError:  # double-click / concurrent request
            raise ValidationError("You are already enrolled in this course.")

    def perform_destroy(self, instance):
        if role_of(self.request.user) != STUDENT:
            raise PermissionDenied("Only students can remove their own enrollment.")
        instance.delete()
