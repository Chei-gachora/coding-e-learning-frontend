from rest_framework.routers import DefaultRouter

from .views import (
    ActivityViewSet,
    CourseViewSet,
    LessonAttachmentViewSet,
    LessonViewSet,
    LiveSessionViewSet,
    ModuleViewSet,
)

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("modules", ModuleViewSet, basename="module")
router.register("lessons", LessonViewSet, basename="lesson")
router.register("activities", ActivityViewSet, basename="activity")
router.register("lesson-attachments", LessonAttachmentViewSet, basename="lesson-attachment")
router.register("live-sessions", LiveSessionViewSet, basename="live-session")

urlpatterns = router.urls
