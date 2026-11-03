from rest_framework import serializers

from .models import Quiz, Question, QuizAttempt


class QuestionForStudentSerializer(serializers.ModelSerializer):
    """Hides correct_choice_index — students shouldn't see the answer key."""
    class Meta:
        model = Question
        fields = ["id", "text", "marks", "choices"]


class QuestionForInstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "quiz", "text", "marks", "choices", "correct_choice_index"]

    def validate_choices(self, choices):
        if not isinstance(choices, list) or len(choices) < 2:
            raise serializers.ValidationError("Provide at least two answer choices.")
        if any(not isinstance(choice, dict) or not str(choice.get("text", "")).strip() for choice in choices):
            raise serializers.ValidationError("Each answer choice must have non-empty text.")
        return choices

    def validate(self, attrs):
        choices = attrs.get("choices", self.instance.choices if self.instance else [])
        correct_index = attrs.get(
            "correct_choice_index",
            self.instance.correct_choice_index if self.instance else None,
        )
        if correct_index is not None and correct_index >= len(choices):
            raise serializers.ValidationError({"correct_choice_index": "Select one of the available choices."})
        return attrs


class QuizSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="activity.title", read_only=True)
    questions = QuestionForStudentSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "activity", "title", "time_limit_minutes", "pass_mark_percentage", "questions"]


class SubmitQuizSerializer(serializers.Serializer):
    """body: {"answers": {"<question_id>": <choice_index>, ...}}"""
    answers = serializers.DictField(child=serializers.IntegerField())


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.activity.title", read_only=True)
    course_title = serializers.CharField(
        source="quiz.activity.lesson.module.course.title",
        read_only=True,
    )

    class Meta:
        model = QuizAttempt
        fields = [
            "id", "student", "quiz", "quiz_title", "course_title", "attempt_number", "answers",
            "score", "total_marks", "percentage", "passed", "submitted_at",
        ]
        read_only_fields = fields
