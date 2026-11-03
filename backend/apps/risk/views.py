"""
Early Warning Risk Classifier — endpoints.

GET /api/risk/cohort/                     instructor's whole cohort, scored + ranked
GET /api/risk/student/<id>/course/<id>/   one student's risk card (instructor/admin)

Both are read-only and require IsInstructorOrAdmin — this is a tool for
instructors to decide who to check in on, not something exposed to
students directly (seeing your own "risk_probability" without the
context an instructor has is more likely to demoralize than help).
"""
import logging

from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from rest_framework.exceptions import NotFound

from apps.accounts.access import require_teaches
from apps.accounts.permissions import IsInstructorOrAdmin
from apps.courses.models import Course
from apps.enrollment.models import Enrollment

from . import services

logger = logging.getLogger(__name__)


class CohortRiskView(APIView):
    """
    GET /api/risk/cohort/
    Every student across every course the requesting instructor teaches,
    scored and sorted highest-risk first. Admins get every course.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstructorOrAdmin]

    @extend_schema(
        responses=inline_serializer(
            name="CohortRiskReport",
            fields={
                "scored": inline_serializer(
                    name="CohortStudentRisk",
                    many=True,
                    fields={
                        "student_id": serializers.IntegerField(),
                        "course_id": serializers.IntegerField(),
                        "student_name": serializers.CharField(required=False),
                        "course_title": serializers.CharField(required=False),
                        "student_health_score": serializers.IntegerField(),
                        "risk_level": serializers.ChoiceField(
                            choices=["low", "medium", "high"]
                        ),
                        "risk_probability": serializers.FloatField(),
                        "top_factors": serializers.ListField(
                            child=serializers.CharField()
                        ),
                        "recommended_action": serializers.CharField(),
                    },
                ),
                "skipped_insufficient_history": inline_serializer(
                    name="SkippedStudentRisk",
                    many=True,
                    fields={
                        "student_id": serializers.IntegerField(),
                        "course_id": serializers.IntegerField(),
                        "course_title": serializers.CharField(),
                    },
                ),
            },
        )
    )
    def get(self, request):
        if request.user.role == "admin":
            from apps.courses.models import Course

            scored, skipped = [], []
            for course in Course.objects.all():
                result = services.score_course_cohort(course.id)
                for card in result["scored"]:
                    card["course_title"] = course.title
                scored.extend(result["scored"])
                skipped.extend(
                    {"student_id": sid, "course_id": course.id, "course_title": course.title}
                    for sid in result["skipped_insufficient_history"]
                )
            scored.sort(key=lambda r: r["risk_probability"], reverse=True)
            return Response({"scored": scored, "skipped_insufficient_history": skipped})

        try:
            return Response(services.score_instructor_cohort(request.user))
        except services.RiskModelUnavailable:
            logger.exception("Instructor risk panel is unavailable because its model failed to load.")
            return Response(
                {"detail": "Risk insights are temporarily unavailable. Course management and grading are unaffected."},
                status=503,
            )


class StudentCourseRiskView(APIView):
    """
    GET /api/risk/student/<student_id>/course/<course_id>/
    One student's risk card. 204 (no body) if there isn't enough weekly
    history yet — that's a real, expected state, not an error.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstructorOrAdmin]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="StudentCourseRisk",
                fields={
                    "student_id": serializers.IntegerField(),
                    "course_id": serializers.IntegerField(),
                    "student_health_score": serializers.IntegerField(),
                    "risk_level": serializers.ChoiceField(
                        choices=["low", "medium", "high"]
                    ),
                    "risk_probability": serializers.FloatField(),
                    "top_factors": serializers.ListField(
                        child=serializers.CharField()
                    ),
                    "recommended_action": serializers.CharField(),
                },
            ),
            204: None,
        }
    )
    def get(self, request, student_id, course_id):
        # An instructor may only look at students enrolled in a course THEY teach.
        # (Previously any instructor could score any student in any course.)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            raise NotFound()
        require_teaches(request.user, course)
        if not Enrollment.objects.filter(student_id=student_id, course=course).exists():
            raise NotFound()
        card = services.score_student(student_id, course_id)
        if card is None:
            return Response(
                {"detail": "Not enough weekly history to score this student yet."},
                status=204,
            )
        return Response(card)
