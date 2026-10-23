from django.urls import reverse
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Submission


class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    activity_title = serializers.CharField(source="activity.title", read_only=True)
    course_title = serializers.CharField(source="activity.lesson.module.course.title", read_only=True)
    activity_type = serializers.CharField(source="activity.activity_type", read_only=True)
    activity_language = serializers.CharField(source="activity.language", read_only=True)
    max_score = serializers.IntegerField(source="activity.max_score", read_only=True)
    file_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            "id", "student", "student_name", "activity", "activity_title", "course_title", "activity_type",
            "activity_language", "max_score",
            "content", "file", "file_name", "download_url", "github_url", "attempt_number", "status",
            "submitted_at", "grade", "feedback", "graded_at",
        ]
        read_only_fields = [
            "student", "attempt_number", "status", "grade", "feedback", "graded_at",
            "file_name", "download_url", "max_score", "activity_type", "activity_language",
        ]
        extra_kwargs = {"file": {"write_only": True}, "content": {"max_length": 50_000}}

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_download_url(self, obj):
        return reverse("submission-download", args=[obj.pk]) if obj.file else None

    def validate_github_url(self, value):
        if value and not value.lower().startswith(("https://", "http://")):
            raise serializers.ValidationError("Enter a web link starting with https://")
        return value

    def validate(self, attrs):
        if not (attrs.get("content", "").strip() or attrs.get("file") or attrs.get("github_url")):
            raise serializers.ValidationError(
                "Provide an answer, a file, or a GitHub link — the submission is empty."
            )
        return attrs


class GradeSubmissionSerializer(serializers.Serializer):
    """Used only by the instructor grading endpoint. The upper bound
    (activity.max_score) depends on the submission, so the view checks it."""
    grade = serializers.FloatField(min_value=0)
    feedback = serializers.CharField(allow_blank=True, required=False, max_length=5000)
