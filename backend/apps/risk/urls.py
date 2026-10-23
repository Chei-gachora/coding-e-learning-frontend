from django.urls import path

from .views import CohortRiskView, StudentCourseRiskView

urlpatterns = [
    path("cohort/", CohortRiskView.as_view(), name="risk-cohort"),
    path("student/<int:student_id>/course/<int:course_id>/", StudentCourseRiskView.as_view(), name="risk-student-course"),
]
