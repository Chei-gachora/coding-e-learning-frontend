from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer

from . import services


class MySequencingView(APIView):
    """
    GET /api/sequencing/me/
    The logged-in student's personalized next-step recommendation for
    each enrolled course — see services.py for the mastery-based logic.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="StudentSequencingRecommendations",
            many=True,
            fields={
                "course_id": serializers.IntegerField(),
                "course_title": serializers.CharField(),
                "current_module": serializers.CharField(),
                "current_module_mastery": serializers.FloatField(allow_null=True),
                "pace": serializers.ChoiceField(
                    choices=["reinforce", "steady", "accelerate"]
                ),
                "recommendation": inline_serializer(
                    name="SequencingRecommendation",
                    fields={
                        "action": serializers.ChoiceField(
                            choices=["review", "practice_first", "advance", "continue"]
                        ),
                        "lesson_title": serializers.CharField(
                            required=False, allow_null=True
                        ),
                        "activity_title": serializers.CharField(
                            required=False, allow_null=True
                        ),
                        "reason": serializers.CharField(),
                    },
                ),
                "mastery_by_module": serializers.DictField(
                    child=serializers.FloatField(allow_null=True)
                ),
            },
        )
    )
    def get(self, request):
        return Response({"recommendations": services.recommend_for_student(request.user)})
