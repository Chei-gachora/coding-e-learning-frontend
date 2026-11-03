from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Course, LiveSession, Module, Lesson, Activity, LessonAttachment, validate_video_file
from .validators import validate_video_url

ACTIVITY_PUBLIC_FIELDS = [
    "id", "lesson", "activity_type", "title", "instructions",
    "max_score", "max_attempts", "pass_percentage", "deadline", "is_required",
    "is_final_assessment", "questionnaire_questions", "language", "starter_code", "quiz_id",
]


class LessonAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)
    # The raw media URL is never exposed: files are served only through an
    # authenticated endpoint that re-checks enrollment and module locking.
    download_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = LessonAttachment
        fields = [
            "id", "lesson", "title", "file", "file_name", "external_url",
            "download_url", "uploaded_by_name", "uploaded_at",
        ]
        read_only_fields = ["uploaded_by_name", "uploaded_at", "download_url"]
        extra_kwargs = {"file": {"write_only": True, "required": False}}

    @extend_schema_field(serializers.CharField())
    def get_download_url(self, obj):
        if not obj.file:
            return None
        return reverse("lesson-attachment-download", args=[obj.pk])

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else None

    def validate_external_url(self, value):
        if value and not value.lower().startswith("https://"):
            raise serializers.ValidationError("Use a secure external link starting with https://.")
        return value

    def validate(self, attrs):
        file = attrs.get("file", self.instance.file if self.instance else None)
        external_url = attrs.get("external_url", self.instance.external_url if self.instance else "")
        if bool(file) == bool(external_url):
            raise serializers.ValidationError("Provide exactly one uploaded file or external link.")
        return attrs


class _ActivityBase(serializers.ModelSerializer):
    quiz_id = serializers.SerializerMethodField()

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_quiz_id(self, obj):
        quiz = getattr(obj, "quiz", None)
        return quiz.id if quiz else None

    def validate_max_attempts(self, value):
        if value < 1:
            raise serializers.ValidationError("Must allow at least one attempt.")
        return value

    def validate_max_score(self, value):
        if value < 1:
            raise serializers.ValidationError("Must be at least 1.")
        return value


class ActivitySerializer(_ActivityBase):
    """Staff view: includes the answer key (test_cases)."""
    class Meta:
        model = Activity
        fields = ACTIVITY_PUBLIC_FIELDS + ["test_cases"]

    def validate(self, attrs):
        activity_type = attrs.get(
            "activity_type",
            self.instance.activity_type if self.instance else None,
        )
        questions = attrs.get(
            "questionnaire_questions",
            self.instance.questionnaire_questions if self.instance else [],
        )
        is_final_assessment = attrs.get(
            "is_final_assessment",
            self.instance.is_final_assessment if self.instance else False,
        )

        if is_final_assessment and activity_type != "quiz":
            raise serializers.ValidationError({
                "is_final_assessment": "Only a quiz can be marked as the final assessment."
            })
        if is_final_assessment:
            lesson = attrs.get(
                "lesson",
                self.instance.lesson if self.instance else None,
            )
            if lesson:
                existing = Activity.objects.filter(
                    lesson__module__course=lesson.module.course,
                    is_final_assessment=True,
                )
                if self.instance:
                    existing = existing.exclude(pk=self.instance.pk)
                if existing.exists():
                    raise serializers.ValidationError({
                        "is_final_assessment": "A course can have only one final assessment."
                    })

        if activity_type != "questionnaire":
            if questions:
                raise serializers.ValidationError({
                    "questionnaire_questions": "Questions are only valid for questionnaire activities."
                })
            return attrs

        if not isinstance(questions, list) or not questions or len(questions) > 50:
            raise serializers.ValidationError({
                "questionnaire_questions": "Add between 1 and 50 questionnaire questions."
            })

        normalized = []
        for index, question in enumerate(questions, start=1):
            if not isinstance(question, dict):
                raise serializers.ValidationError({
                    "questionnaire_questions": f"Question {index} must be an object."
                })
            text = question.get("text")
            question_type = question.get("question_type")
            required = question.get("required", True)
            options = question.get("options", [])
            if not isinstance(text, str) or not text.strip() or len(text) > 1000:
                raise serializers.ValidationError({
                    "questionnaire_questions": f"Question {index} needs text of at most 1000 characters."
                })
            if not isinstance(question_type, str) or question_type not in {"text", "single_choice", "multiple_choice"}:
                raise serializers.ValidationError({
                    "questionnaire_questions": f"Question {index} has an unsupported response type."
                })
            if not isinstance(required, bool):
                raise serializers.ValidationError({
                    "questionnaire_questions": f"Question {index} must set required to true or false."
                })
            if question_type == "text":
                options = []
            elif (
                not isinstance(options, list)
                or not 2 <= len(options) <= 10
                or any(not isinstance(option, str) or not option.strip() or len(option) > 200 for option in options)
                or len({option.strip().casefold() for option in options}) != len(options)
            ):
                raise serializers.ValidationError({
                    "questionnaire_questions": f"Question {index} needs 2 to 10 unique, non-empty options."
                })
            normalized.append({
                "text": text.strip(),
                "question_type": question_type,
                "options": [option.strip() for option in options],
                "required": required,
            })
        attrs["questionnaire_questions"] = normalized
        return attrs


class ActivityStudentSerializer(_ActivityBase):
    """Student view: `test_cases` (expected outputs) are never sent."""
    completion_status = serializers.SerializerMethodField()

    def get_completion_status(self, obj):
        completions = getattr(obj, "_student_completions", None)
        if completions is None:
            request = self.context.get("request")
            is_completed = bool(
                request
                and request.user.is_authenticated
                and obj.completions.filter(student=request.user).exists()
            )
        else:
            is_completed = bool(completions)

        if is_completed:
            return "completed"
        if obj.deadline and obj.deadline <= timezone.now():
            return "overdue"
        return "not_completed"

    class Meta:
        model = Activity
        fields = ACTIVITY_PUBLIC_FIELDS + ["completion_status"]
        read_only_fields = fields


class LessonSerializer(serializers.ModelSerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    attachments = LessonAttachmentSerializer(many=True, read_only=True)
    video_url = serializers.CharField(required=False, allow_blank=True, validators=[validate_video_url])
    video_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    video_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "module", "title", "order", "learning_objectives",
            "video_url", "video_file", "video_file_url", "tutorial_content", "activities", "attachments",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_video_file_url(self, obj):
        if not obj.video_file:
            return None
        return reverse("lesson-video", args=[obj.pk])

    def validate_video_file(self, value):
        validate_video_file(value)
        return value

    def validate(self, attrs):
        video_url = attrs.get("video_url", self.instance.video_url if self.instance else "")
        video_file = attrs.get("video_file", self.instance.video_file if self.instance else None)
        if video_url and video_file:
            raise serializers.ValidationError({
                "video_url": "Choose a video link or an uploaded video, not both."
            })
        return attrs


class LessonStudentSerializer(LessonSerializer):
    activities = ActivityStudentSerializer(many=True, read_only=True)

    class Meta(LessonSerializer.Meta):
        read_only_fields = LessonSerializer.Meta.fields


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "course", "title", "order", "lessons"]


class ModuleListSerializer(serializers.ModelSerializer):
    """Titles/order only — no lesson content. This is all a student gets from
    /modules/ (lesson content comes from /lessons/, which enforces locking)."""
    class Meta:
        model = Module
        fields = ["id", "course", "title", "order"]


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source="instructor.get_full_name", read_only=True)
    module_count = serializers.IntegerField(source="modules.count", read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "title", "description", "category", "tags", "difficulty",
            "estimated_duration_minutes", "learning_outcomes", "prerequisites",
            "instructor", "instructor_name",
            "module_count", "thumbnail", "thumbnail_url", "status", "created_at"
        ]
        read_only_fields = ["instructor", "thumbnail_url", "status"]

    def validate_tags(self, value):
        if not isinstance(value, list) or any(not isinstance(tag, str) for tag in value):
            raise serializers.ValidationError("Tags must be a list of text values.")
        normalized = [tag.strip() for tag in value if tag.strip()]
        if len(normalized) > 20 or any(len(tag) > 50 for tag in normalized):
            raise serializers.ValidationError("Use at most 20 tags, each 50 characters or fewer.")
        return normalized

    def validate_learning_outcomes(self, value):
        if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
            raise serializers.ValidationError("Learning outcomes must be a list of text values.")
        normalized = [item.strip() for item in value if item.strip()]
        if len(normalized) > 20 or any(len(item) > 300 for item in normalized):
            raise serializers.ValidationError("Use at most 20 learning outcomes, each 300 characters or fewer.")
        return normalized

    def validate_estimated_duration_minutes(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("Estimated duration must be at least one minute.")
        return value

    def validate_thumbnail(self, value):
        if value is not None and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Cover image must be smaller than 5MB.")
        return value

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return None

        url = obj.thumbnail.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)

        if url.startswith("http"):
            return url

        base_url = "http://localhost:8000"
        return f"{base_url}{url if url.startswith('/') else '/' + url}"


class CourseDetailSerializer(CourseSerializer):
    modules = ModuleListSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ["modules"]


class LiveSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveSession
        fields = ["id", "course", "title", "starts_at", "meeting_url", "created_at"]
        read_only_fields = ["created_at"]

    def validate_meeting_url(self, value):
        if not value.lower().startswith("https://"):
            raise serializers.ValidationError("Use a secure meeting link starting with https://.")
        return value

    def validate_starts_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Schedule the session for a future date and time.")
        return value
