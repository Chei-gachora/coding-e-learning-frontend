from rest_framework import serializers

from apps.courses.serializers import CourseSerializer
from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    course_detail = CourseSerializer(source="course", read_only=True)
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_email = serializers.CharField(source="student.email", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id", "student", "student_name", "student_email", "course",
            "course_detail", "learning_mode", "enrolled_at",
        ]
        read_only_fields = ["student", "student_name", "student_email", "course_detail", "enrolled_at"]
