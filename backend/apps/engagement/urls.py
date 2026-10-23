from django.urls import path

from .views import (
    CertificateDetailView,
    CertificateDownloadView,
    CertificateListView,
    CertificateVerifyView,
    IssueCertificateView,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    RevokeCertificateView,
    StudentEngagementView,
    StudentLeaderboardView,
)

urlpatterns = [
    path("me/", StudentEngagementView.as_view(), name="student-engagement"),
    path("leaderboard/", StudentLeaderboardView.as_view(), name="student-leaderboard"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("notifications/<int:notification_id>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("certificates/issue/", IssueCertificateView.as_view(), name="certificate-issue"),
    path("certificates/", CertificateListView.as_view(), name="certificate-list"),
    path("certificates/<uuid:certificate_number>/", CertificateDetailView.as_view(), name="certificate-detail"),
    path("certificates/<uuid:certificate_number>/download/", CertificateDownloadView.as_view(), name="certificate-download"),
    path("certificates/<uuid:certificate_number>/verify/", CertificateVerifyView.as_view(), name="certificate-verify"),
    path("certificates/<uuid:certificate_number>/revoke/", RevokeCertificateView.as_view(), name="certificate-revoke"),
]