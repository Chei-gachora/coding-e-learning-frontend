from django.urls import path

from .views import CourseProgressView, LessonVideoProgressView, LessonVideoSummaryView, ModuleAccessCheckView

urlpatterns = [
    path("course/<int:course_id>/", CourseProgressView.as_view(), name="course-progress"),
    path("can-access/<int:module_id>/", ModuleAccessCheckView.as_view(), name="module-access-check"),
    path("video/<int:lesson_id>/", LessonVideoProgressView.as_view(), name="video-progress"),
    path("video/<int:lesson_id>/summary/", LessonVideoSummaryView.as_view(), name="video-progress-summary"),
]
