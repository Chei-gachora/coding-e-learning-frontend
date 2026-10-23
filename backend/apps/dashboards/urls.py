from django.urls import path

from .views import (
    AdminDashboardView,
    ApproveLearnerView,
    PendingLearnerApprovalsView,
    InstructorDashboardView,
    StudentDashboardView,
)

urlpatterns = [
    path("student/", StudentDashboardView.as_view(), name="dashboard-student"),
    path("instructor/", InstructorDashboardView.as_view(), name="dashboard-instructor"),
    path("admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
    path("admin/learner-approvals/", PendingLearnerApprovalsView.as_view(), name="dashboard-learner-approvals"),
    path("admin/learner-approvals/<int:learner_id>/approve/", ApproveLearnerView.as_view(), name="dashboard-learner-approve"),
]
