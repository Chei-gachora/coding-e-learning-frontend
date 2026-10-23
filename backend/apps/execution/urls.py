from django.urls import path

from .views import RunCodeView, RunTestsView

urlpatterns = [
    path("run/", RunCodeView.as_view(), name="execute-run"),
    path("test/", RunTestsView.as_view(), name="execute-test"),
]
