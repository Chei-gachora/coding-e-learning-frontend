"""
Reusable DRF permission classes, shared by every app.
Usage: permission_classes = [IsInstructor] or [IsInstructorOrAdmin]

All checks below test request.user.is_authenticated before touching
request.user.role. AnonymousUser (any unauthenticated request) has no
.role attribute, so without this guard an anonymous request to a view
using one of these classes alone (not combined with IsAuthenticated)
would raise an unhandled AttributeError -> 500, instead of a clean
401/403. Several views in this codebase use these classes standalone,
so the guard has to live here to cover all of them.
"""
from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "student")


class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "instructor")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsInstructorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("instructor", "admin")
        )


class ReadOnlyOrInstructorAdmin(BasePermission):
    """Anyone authenticated can GET; only instructor/admin can write."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role in ("instructor", "admin")
