from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from apps.accounts.permissions import IsAdmin

from . import services


class AllocationRecommendationsView(APIView):
    """
    GET /api/allocation/recommendations/
    Admin-only. See services.py for the full algorithm write-up.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @extend_schema(
        responses=inline_serializer(
            name="AllocationPlan",
            fields={
                "average_instructor_load": serializers.FloatField(),
                "instructor_loads": inline_serializer(
                    name="InstructorLoad",
                    many=True,
                    fields={
                        "instructor_id": serializers.IntegerField(),
                        "instructor_name": serializers.CharField(),
                        "courses": serializers.ListField(
                            child=serializers.CharField()
                        ),
                        "total_enrolled": serializers.IntegerField(),
                        "total_pending": serializers.IntegerField(),
                        "load": serializers.FloatField(),
                    },
                ),
                "course_metrics": inline_serializer(
                    name="CourseAllocationMetric",
                    many=True,
                    fields={
                        "course_id": serializers.IntegerField(),
                        "course_title": serializers.CharField(),
                        "instructor_id": serializers.IntegerField(),
                        "instructor_name": serializers.CharField(),
                        "enrolled": serializers.IntegerField(),
                        "pending_submissions": serializers.IntegerField(),
                        "load": serializers.FloatField(),
                    },
                ),
                "recommendations": inline_serializer(
                    name="AllocationRecommendation",
                    many=True,
                    fields={
                        "type": serializers.ChoiceField(
                            choices=["single_course_overload", "backlog", "rebalance"]
                        ),
                        "priority": serializers.ChoiceField(
                            choices=["high", "medium", "low"]
                        ),
                        "course_title": serializers.CharField(
                            required=False, allow_null=True
                        ),
                        "instructor_name": serializers.CharField(required=False),
                        "from_instructor": serializers.CharField(required=False),
                        "to_instructor": serializers.CharField(
                            required=False, allow_null=True
                        ),
                        "reason": serializers.CharField(),
                        "metrics": serializers.DictField(
                            child=serializers.FloatField()
                        ),
                    },
                ),
            },
        )
    )
    def get(self, request):
        return Response(services.get_allocation_plan())
