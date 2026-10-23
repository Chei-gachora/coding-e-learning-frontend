"""Turning graded submissions into progress (activity completion).

Rule: an activity is complete for a student if ANY of their graded
submissions scored >= activity.pass_percentage of max_score. Completing an
activity is what unlocks the next module (apps.progress.services), so a
failing grade must not count — previously any grade, even 0, did.
"""
from apps.progress.models import ActivityCompletion
from apps.progress.services import mark_activity_complete
from .models import Submission, SubmissionStatus


def grade_percentage(grade, max_score):
    return (grade / max_score) * 100 if max_score else 0


def passes(submission):
    activity = submission.activity
    return submission.grade is not None and grade_percentage(
        submission.grade, activity.max_score
    ) >= activity.pass_percentage


def sync_completion(student, activity):
    """Recompute completion from the student's graded submissions. Returns True if complete."""
    graded = Submission.objects.filter(student=student, activity=activity, status=SubmissionStatus.GRADED)
    passing = [s for s in graded.select_related("activity") if passes(s)]
    if passing:
        best = max(s.grade for s in passing)
        mark_activity_complete(student, activity, score=best)
        return True
    ActivityCompletion.objects.filter(student=student, activity=activity).delete()
    from apps.engagement.services import sync_course_certificate

    sync_course_certificate(student, activity.lesson.module.course)
    return False
