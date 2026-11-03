"""
Module-locking and completion logic.

This is the one place these rules live. Views in this app expose them
over HTTP; the submissions/quizzes apps import mark_activity_complete
directly (not over HTTP) when a student's work is graded as passing.

Per the brief (section 4): this must be enforced server-side, not just
hidden in the UI — every view that serves module/lesson content should
call is_module_unlocked() before returning anything.
"""
from apps.courses.models import Activity, Module

from .models import ActivityCompletion


def required_activities_for_module(module: Module):
    return Activity.objects.filter(lesson__module=module, is_required=True)


def is_module_complete(student, module: Module) -> bool:
    """A module is complete only when every required activity in it is complete."""
    required = required_activities_for_module(module)
    if not required.exists():
        # A module with no required activities is trivially complete —
        # avoids permanently locking students out of a course an instructor
        # is still building.
        return True

    completed_count = ActivityCompletion.objects.filter(
        student=student, activity__in=required
    ).values("activity_id").distinct().count()

    return completed_count >= required.count()


def is_module_unlocked(student, module: Module) -> bool:
    """
    Module 1 (lowest order) in a course is always unlocked.
    Any later module is unlocked only if the previous module is complete.
    """
    previous_module = (
        Module.objects.filter(course=module.course, order__lt=module.order)
        .order_by("-order")
        .first()
    )
    if previous_module is None:
        return True
    return is_module_complete(student, previous_module)


def is_course_complete(student, course) -> bool:
    """Mirrors module completion, per brief section 12: a course is complete
    only when every module in it is complete."""
    modules = Module.objects.filter(course=course)
    return all(is_module_complete(student, m) for m in modules)


def mark_activity_complete(student, activity: Activity, score: float | None = None):
    """
    Called by submissions/quizzes apps when a student's work passes.
    Idempotent — calling it twice for the same student+activity just
    updates the score, it doesn't create a duplicate record.
    """
    was_complete = ActivityCompletion.objects.filter(student=student, activity=activity).exists()
    completion, _ = ActivityCompletion.objects.update_or_create(
        student=student, activity=activity, defaults={"score": score}
    )
    from apps.engagement.services import record_activity_completion, sync_course_certificate

    if not was_complete:
        record_activity_completion(student, activity)
    sync_course_certificate(student, activity.lesson.module.course)
    return completion
