from django.urls import path

from .views import MySequencingView

urlpatterns = [
    path("me/", MySequencingView.as_view(), name="sequencing-me"),
]
