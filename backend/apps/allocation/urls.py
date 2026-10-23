from django.urls import path

from .views import AllocationRecommendationsView

urlpatterns = [
    path("recommendations/", AllocationRecommendationsView.as_view(), name="allocation-recommendations"),
]
