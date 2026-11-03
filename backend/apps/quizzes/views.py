from django.db import transaction
from django.db.models import Max
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from apps.accounts.access import (
    ADMIN, INSTRUCTOR, STUDENT, require_student_access, require_teaches, role_of, scope_unlocked,
)
from apps.accounts.permissions import IsInstructorOrAdmin, ReadOnlyOrInstructorAdmin
from apps.courses.models import Activity, ActivityType, Lesson
from apps.courses.serializers import ActivitySerializer
from apps.progress.services import mark_activity_complete
from .models import Question, Quiz, QuizAttempt, QuestionnaireResponse
from .serializers import (
    QuizAttemptSerializer,
    QuizSerializer,
    QuestionForInstructorSerializer,
    SubmitQuizSerializer,
)


class QuizViewSet(viewsets.ModelViewSet):
    """
    - Read: students see only quizzes in courses they're ENROLLED in whose
      module is UNLOCKED; instructors only quizzes in courses they teach.
      Students never receive `correct_choice_index` (QuestionForStudentSerializer).
    - Write: instructor/admin, and only for quizzes in a course they teach.
    """
    queryset = Quiz.objects.select_related("activity__lesson__module__course")
    serializer_class = QuizSerializer
    permission_classes = [ReadOnlyOrInstructorAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        activity_id = self.request.query_params.get("activity")
        if activity_id:
            qs = qs.filter(activity_id=activity_id)
        return scope_unlocked(qs, self.request.user, "activity__lesson__module", "activity__lesson__module__course")

    def perform_create(self, serializer):
        activity = serializer.validated_data["activity"]
        require_teaches(self.request.user, activity.lesson.module.course)
        if activity.activity_type != ActivityType.QUIZ:
            raise ValidationError({"activity": "A quiz can only be attached to a 'quiz' activity."})
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.activity.lesson.module.course)
        if "activity" in serializer.validated_data and serializer.validated_data["activity"] != serializer.instance.activity:
            raise ValidationError({"activity": "A quiz cannot be moved to a different activity."})
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.activity.lesson.module.course)
        instance.delete()


class QuestionViewSet(viewsets.ModelViewSet):
    """Instructor/admin CRUD for quiz questions and answer keys."""
    queryset = Question.objects.select_related("quiz__activity__lesson__module__course")
    serializer_class = QuestionForInstructorSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = role_of(user)
        if role == INSTRUCTOR:
            qs = qs.filter(quiz__activity__lesson__module__course__instructor=user)
        elif role != ADMIN:
            return qs.none()
        quiz_id = self.request.query_params.get("quiz")
        return qs.filter(quiz_id=quiz_id) if quiz_id else qs

    def perform_create(self, serializer):
        quiz = serializer.validated_data["quiz"]
        require_teaches(self.request.user, quiz.activity.lesson.module.course)
        serializer.save()

    def perform_update(self, serializer):
        require_teaches(self.request.user, serializer.instance.quiz.activity.lesson.module.course)
        if "quiz" in serializer.validated_data and serializer.validated_data["quiz"] != serializer.instance.quiz:
            raise ValidationError({"quiz": "A question cannot be moved to another quiz."})
        serializer.save()

    def perform_destroy(self, instance):
        require_teaches(self.request.user, instance.quiz.activity.lesson.module.course)
        instance.delete()


class SubmitQuizView(APIView):
    """
    POST /api/quizzes/<quiz_id>/submit/
    body: {"answers": {"3": 1, "4": 0}}  — question_id -> chosen choice index

    Students only. Requires enrollment and an unlocked module. Auto-grades
    against Question.correct_choice_index; a pass marks the activity complete
    (which is what can unlock the next module). The attempt limit is enforced
    under a row lock so parallel requests can't exceed it.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=SubmitQuizSerializer,
        responses={200: QuizAttemptSerializer},
    )
    def post(self, request, quiz_id):
        try:
            quiz = Quiz.objects.select_related("activity__lesson__module__course").get(pk=quiz_id)
        except Quiz.DoesNotExist:
            raise NotFound("Quiz not found.")

        student = request.user
        if role_of(student) != STUDENT:
            raise PermissionDenied("Only students can take quizzes.")
        require_student_access(student, quiz.activity.lesson.module)

        serializer = SubmitQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = serializer.validated_data["answers"]

        questions = list(quiz.questions.all())
        total_marks = sum(q.marks for q in questions)
        score = sum(
            q.marks for q in questions
            if answers.get(str(q.id)) is not None and answers.get(str(q.id)) == q.correct_choice_index
        )
        percentage = round((score / total_marks) * 100, 1) if total_marks else 0
        passed = percentage >= quiz.pass_mark_percentage
        max_attempts = quiz.activity.max_attempts

        with transaction.atomic():
            Activity.objects.select_for_update().get(pk=quiz.activity_id)
            mine = QuizAttempt.objects.filter(student=student, quiz=quiz)
            if mine.count() >= max_attempts:
                raise ValidationError(f"Maximum attempts ({max_attempts}) already used for this quiz.")
            attempt = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_number=(mine.aggregate(m=Max("attempt_number"))["m"] or 0) + 1,
                answers=answers,
                score=score,
                total_marks=total_marks,
                percentage=percentage,
                passed=passed,
            )
            if passed:
                mark_activity_complete(student, quiz.activity, score=percentage)
            from apps.engagement.services import create_notification

            create_notification(
                student,
                "quiz_result",
                "Quiz result available",
                f"{quiz.activity.title}: {percentage:g}% ({'passed' if passed else 'not passed'}).",
                "/dashboard/student/grades",
            )

        return Response(QuizAttemptSerializer(attempt).data)


class BuildQuizView(APIView):
    """Atomically create one quiz activity, quiz settings, and its questions."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="BuildQuizRequest",
            fields={
                "lesson": serializers.IntegerField(),
                "activity": inline_serializer(
                    name="BuildQuizActivityOptions",
                    fields={
                        "title": serializers.CharField(max_length=200),
                        "instructions": serializers.CharField(
                            required=False, allow_blank=True
                        ),
                        "max_score": serializers.IntegerField(required=False),
                        "max_attempts": serializers.IntegerField(required=False),
                        "pass_percentage": serializers.IntegerField(required=False),
                        "deadline": serializers.DateTimeField(
                            required=False, allow_null=True
                        ),
                        "is_required": serializers.BooleanField(required=False),
                        "is_final_assessment": serializers.BooleanField(required=False),
                    },
                ),
                "quiz": inline_serializer(
                    name="BuildQuizOptions",
                    fields={
                        "time_limit_minutes": serializers.IntegerField(required=False),
                        "pass_mark_percentage": serializers.IntegerField(
                            required=False
                        ),
                    },
                    required=False,
                ),
                "questions": serializers.ListField(
                    child=inline_serializer(
                        name="BuildQuizQuestion",
                        fields={
                            "text": serializers.CharField(),
                            "marks": serializers.IntegerField(required=False),
                            "choices": serializers.ListField(
                                child=inline_serializer(
                                    name="BuildQuizAnswerChoice",
                                    fields={"text": serializers.CharField()},
                                ),
                                allow_empty=False,
                            ),
                            "correct_choice_index": serializers.IntegerField(),
                        },
                    ),
                    allow_empty=False,
                ),
            },
        ),
        responses={
            201: inline_serializer(
                name="BuildQuizResponse",
                fields={
                    "activity": ActivitySerializer(),
                    "quiz": QuizSerializer(),
                    "questions": QuestionForInstructorSerializer(many=True),
                },
            ),
        },
    )
    @transaction.atomic
    def post(self, request):
        try:
            lesson = Lesson.objects.select_related("module__course").get(pk=request.data.get("lesson"))
        except (Lesson.DoesNotExist, TypeError, ValueError):
            raise NotFound("Lesson not found.")
        require_teaches(request.user, lesson.module.course)

        questions_data = request.data.get("questions")
        if not isinstance(questions_data, list) or not questions_data:
            raise ValidationError({"questions": "Add at least one question."})

        activity_data = request.data.get("activity", {})
        activity_serializer = ActivitySerializer(data={**activity_data, "lesson": lesson.id, "activity_type": ActivityType.QUIZ})
        activity_serializer.is_valid(raise_exception=True)
        activity = activity_serializer.save()

        quiz_data = request.data.get("quiz", {})
        quiz_serializer = QuizSerializer(data={"activity": activity.id, **quiz_data})
        quiz_serializer.is_valid(raise_exception=True)
        quiz = quiz_serializer.save()

        questions = []
        for question_data in questions_data:
            question_serializer = QuestionForInstructorSerializer(
                data={**question_data, "quiz": quiz.id}
            )
            question_serializer.is_valid(raise_exception=True)
            questions.append(question_serializer.save())

        return Response({
            "activity": ActivitySerializer(activity).data,
            "quiz": QuizSerializer(quiz).data,
            "questions": QuestionForInstructorSerializer(questions, many=True).data,
        }, status=status.HTTP_201_CREATED)


class QuestionnaireResponseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _activity(self, request, activity_id, *, allow_course_staff=False):
        try:
            activity = Activity.objects.select_related(
                "lesson__module__course"
            ).get(pk=activity_id, activity_type=ActivityType.QUESTIONNAIRE)
        except Activity.DoesNotExist:
            raise NotFound("Questionnaire not found.")
        role = role_of(request.user)
        if role == STUDENT:
            require_student_access(request.user, activity.lesson.module)
        elif allow_course_staff and role in (INSTRUCTOR, ADMIN):
            require_teaches(request.user, activity.lesson.module.course)
        else:
            raise PermissionDenied("Only enrolled students and the course teaching staff can access this questionnaire.")
        return activity

    @extend_schema(
        responses=inline_serializer(
            name="QuestionnaireResponse",
            fields={
                "answers": serializers.JSONField(),
                "submitted_at": serializers.DateTimeField(allow_null=True),
            },
        )
    )
    def get(self, request, activity_id):
        activity = self._activity(request, activity_id, allow_course_staff=True)
        responses = QuestionnaireResponse.objects.filter(
            activity=activity,
        ).select_related("student")
        if role_of(request.user) in (INSTRUCTOR, ADMIN):
            return Response([{
                "student_id": item.student_id,
                "student_name": item.student.get_full_name() or item.student.username,
                "answers": item.answers,
                "submitted_at": item.submitted_at,
            } for item in responses])
        response = responses.filter(
            student=request.user,
        ).first()
        return Response({
            "answers": response.answers if response else {},
            "submitted_at": response.submitted_at if response else None,
        })

    @extend_schema(
        request=inline_serializer(
            name="QuestionnaireSubmission",
            fields={"answers": serializers.DictField(child=serializers.JSONField())},
        ),
        responses=inline_serializer(
            name="QuestionnaireSubmissionResponse",
            fields={
                "answers": serializers.JSONField(),
                "submitted_at": serializers.DateTimeField(),
            },
        ),
    )
    @transaction.atomic
    def post(self, request, activity_id):
        activity = self._activity(request, activity_id)
        submission = serializers.DictField(child=serializers.JSONField())
        validated = submission.run_validation(request.data.get("answers"))
        questions = activity.questionnaire_questions
        valid_keys = {str(index) for index in range(len(questions))}
        unknown = set(validated) - valid_keys
        if unknown:
            raise ValidationError({"answers": "The response contains an unknown question."})

        normalized = {}
        for index, question in enumerate(questions):
            key = str(index)
            question_type = question["question_type"]
            options = question["options"]
            answer = validated.get(key)
            missing = key not in validated

            if question_type == "text":
                if missing:
                    answer = ""
                if not isinstance(answer, str) or len(answer) > 5000:
                    raise ValidationError({"answers": f"Question {index + 1} must be text of at most 5000 characters."})
                if question["required"] and not answer.strip():
                    raise ValidationError({"answers": f"Question {index + 1} requires an answer."})
                normalized[key] = answer.strip()
                continue

            if question_type == "single_choice":
                if missing and not question["required"]:
                    continue
                if isinstance(answer, bool) or not isinstance(answer, int) or not 0 <= answer < len(options):
                    raise ValidationError({"answers": f"Select a valid option for question {index + 1}."})
                normalized[key] = answer
                continue

            if missing and not question["required"]:
                continue
            if (
                not isinstance(answer, list)
                or any(isinstance(choice, bool) or not isinstance(choice, int) for choice in answer)
                or len(set(answer)) != len(answer)
                or any(choice < 0 or choice >= len(options) for choice in answer)
                or (question["required"] and not answer)
            ):
                raise ValidationError({"answers": f"Select valid options for question {index + 1}."})
            normalized[key] = answer

        response, _ = QuestionnaireResponse.objects.update_or_create(
            student=request.user,
            activity=activity,
            defaults={"answers": normalized},
        )
        mark_activity_complete(request.user, activity)
        return Response({
            "answers": response.answers,
            "submitted_at": response.submitted_at,
        })


class QuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/quiz-attempts/ — students: their own history. Instructors:
    attempts on quizzes in courses THEY teach. Admins: all. The ?student= and
    ?quiz= filters narrow within that scope; they can never widen it.
    """
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = QuizAttempt.objects.select_related("quiz__activity__lesson__module__course")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(student=user)
        elif role == INSTRUCTOR:
            qs = qs.filter(quiz__activity__lesson__module__course__instructor=user)
        elif role != ADMIN:
            qs = qs.none()
        student_id = self.request.query_params.get("student")
        if student_id:
            qs = qs.filter(student_id=student_id)
        quiz_id = self.request.query_params.get("quiz")
        if quiz_id:
            qs = qs.filter(quiz_id=quiz_id)
        return qs
