"""Object-level authorization rules — the single source of truth.

Role checks alone ("is this user an instructor?") are NOT enough: an
instructor must only reach courses *they teach*, and a student only content
in courses they are *enrolled in* and have *unlocked*. Every view that
touches course-linked data goes through the helpers below so the rules live
in one place and are covered by apps/accounts/tests_permissions.py.

Rules
-----
admin        : everything.
instructor   : only courses where Course.instructor == the user.
student      : only courses they are enrolled in; inside them only modules
               they've unlocked (previous module complete).
anyone else  : nothing (unknown roles fail closed).

Use ``scope_*`` to filter querysets (rows outside the scope 404 rather than
403, so IDs can't be probed) and ``require_*`` to guard a single object.
"""
from rest_framework.exceptions import NotFound, PermissionDenied

ADMIN, INSTRUCTOR, STUDENT = "admin", "instructor", "student"


def role_of(user):
    return getattr(user, "role", None) if user and user.is_authenticated else None


def teaches(user, course):
    r = role_of(user)
    return r == ADMIN or (r == INSTRUCTOR and course.instructor_id == user.id)


def is_enrolled(user, course):
    from apps.enrollment.models import Enrollment
    return role_of(user) == STUDENT and Enrollment.objects.filter(student=user, course=course).exists()


def can_view_course(user, course):
    """Read access to a course's private content (modules, lessons, ...)."""
    return teaches(user, course) or (
        is_enrolled(user, course) and getattr(course, "status", "published") == "published"
    )


def can_view_module(user, module):
    """Course access, plus the module-locking rule for students."""
    from apps.progress.services import is_module_unlocked
    if teaches(user, module.course):
        return True
    return is_enrolled(user, module.course) and is_module_unlocked(user, module)


def scope_by_course(qs, user, course_lookup):
    """Restrict ``qs`` to rows whose course (found via ``course_lookup``,
    e.g. ``"module__course"``) the user may see. Does not apply locking."""
    r = role_of(user)
    if r == ADMIN:
        return qs
    if r == INSTRUCTOR:
        return qs.filter(**{f"{course_lookup}__instructor": user})
    if r == STUDENT:
        return qs.filter(
            **{
                f"{course_lookup}__enrollments__student": user,
                f"{course_lookup}__status": "published",
            }
        ).distinct()
    return qs.none()


def scope_unlocked(qs, user, module_lookup, course_lookup):
    """``scope_by_course`` + module locking for students."""
    from apps.courses.models import Module
    from apps.progress.services import is_module_unlocked

    qs = scope_by_course(qs, user, course_lookup)
    if role_of(user) != STUDENT:
        return qs
    module_ids = set(qs.values_list(f"{module_lookup}_id", flat=True))
    unlocked = [m.id for m in Module.objects.filter(id__in=module_ids).select_related("course")
                if is_module_unlocked(user, m)]
    return qs.filter(**{f"{module_lookup}_id__in": unlocked})


def require_teaches(user, course, message="You do not teach this course."):
    if not teaches(user, course):
        raise PermissionDenied(message)


def require_student_access(user, module):
    """For a student acting on a module (submit, run tests, take a quiz)."""
    if not is_enrolled(user, module.course):
        raise PermissionDenied("You are not enrolled in this course.")
    if getattr(module.course, "status", "published") != "published":
        raise PermissionDenied("This course is not currently published.")
    from apps.progress.services import is_module_unlocked
    if not is_module_unlocked(user, module):
        raise PermissionDenied("This module is locked — complete the previous module first.")


def require_course_or_404(user, course):
    if not can_view_course(user, course):
        raise NotFound()
