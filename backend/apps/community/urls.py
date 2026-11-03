from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    DiscussionThreadViewSet,
    StudentBookmarkDeleteView,
    StudentBookmarkListCreateView,
)

router = SimpleRouter()
router.register("discussions", DiscussionThreadViewSet, basename="discussion")

urlpatterns = [
    path("bookmarks/", StudentBookmarkListCreateView.as_view(), name="student-bookmarks"),
    path("bookmarks/<int:bookmark_id>/", StudentBookmarkDeleteView.as_view(), name="student-bookmark-delete"),
    path("", include(router.urls)),
]
