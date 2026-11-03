from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BuildQuizView,
    QuizViewSet,
    QuestionViewSet,
    SubmitQuizView,
    QuizAttemptViewSet,
    QuestionnaireResponseView,
)

router = DefaultRouter()
router.register("quizzes", QuizViewSet, basename="quiz")
router.register("quiz-questions", QuestionViewSet, basename="quiz-question")
router.register("quiz-attempts", QuizAttemptViewSet, basename="quiz-attempt")

urlpatterns = [path("quizzes/build/", BuildQuizView.as_view(), name="quiz-build")] + router.urls + [
    path("quizzes/<int:quiz_id>/submit/", SubmitQuizView.as_view(), name="quiz-submit"),
    path(
        "questionnaires/<int:activity_id>/response/",
        QuestionnaireResponseView.as_view(),
        name="questionnaire-response",
    ),
]
