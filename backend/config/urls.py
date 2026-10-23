from django.conf import settings  # pyright: ignore[reportMissingModuleSource]
from django.contrib import admin  # pyright: ignore[reportMissingModuleSource]
from django.urls import include, path  # pyright: ignore[reportMissingModuleSource]

admin.site.site_header = "Optimum ERP LMS Administration"
admin.site.site_title = "Optimum ERP LMS Admin"
admin.site.index_title = "Platform Administration"

urlpatterns = [
    path("admin/", admin.site.urls),
]

api_urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.courses.urls")),
    path("", include("apps.enrollment.urls")),
    path("progress/", include("apps.progress.urls")),
    path("", include("apps.submissions.urls")),
    path("", include("apps.quizzes.urls")),
    path("execute/", include("apps.execution.urls")),
    path("dashboard/", include("apps.dashboards.urls")),
    path("engagement/", include("apps.engagement.urls")),
    path("community/", include("apps.community.urls")),
    path("risk/", include("apps.risk.urls")),
    path("sequencing/", include("apps.sequencing.urls")),
    path("allocation/", include("apps.allocation.urls")),
]

if settings.DEBUG:
    from drf_spectacular.views import (
        SpectacularAPIView,
        SpectacularRedocView,
        SpectacularSwaggerView,
    )
    from django.urls import re_path
    from django.views.static import serve

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
        re_path(
            r"^media/(?P<path>course_covers/.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]

urlpatterns.append(path("api/", include(api_urlpatterns)))
