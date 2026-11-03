from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Certificate, Notification


class NotificationSerializer(serializers.ModelSerializer):
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "kind", "title", "message", "url", "created_at", "read_at", "unread")

    @extend_schema_field(serializers.BooleanField())
    def get_unread(self, obj):
        return obj.read_at is None


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()
    certificate_number = serializers.UUIDField(format="hex_verbose", read_only=True)
    revoked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = (
            "certificate_number", "course_id", "course_title", "student_id", "student_name",
            "status", "completed_at", "issued_at", "revoked_at", "revocation_reason", "revoked_by_name",
        )

    @extend_schema_field(serializers.CharField())
    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_revoked_by_name(self, obj):
        if not obj.revoked_by:
            return None
        return obj.revoked_by.get_full_name() or obj.revoked_by.username