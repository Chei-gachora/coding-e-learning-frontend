"""
Adaptive Sequencing Engine.

The brief's module locking (apps.progress) gives every student the same
fixed path: Module 1 -> Module 2 -> Module 3, unlocked strictly in order.
That's necessary but not personalized — two students who both "complete"
Module 2 can be in very different shape: one barely scraped past every
activity, the other aced everything. This engine sits on top of that
fixed unlock order and answers a narrower question: *within* what's
already unlocked, what should this specific student do right now, and
in what order?

This is a deterministic, rule-based mastery engine — not a trained
model — on purpose. Sequencing decisions need to be explainable to a
17-year-old student in one sentence ("you scored low on the CSS lab,
let's revisit that first"), and the inputs (a handful of recent scores
per module) don't have anywhere near enough volume per student to train
a reliable model on. A rules engine over real mastery data is the more
honest and more maintainable choice here; the risk classifier (a
genuinely trend/volatility-heavy prediction problem over many students)
is where a trained model earns its complexity.

Core idea — mastery-based adaptive sequencing:
  1. Score this student's mastery (0-100) of every module they've
     touched, from real completion/grade/quiz data.
  2. Classify their current pace: reinforce / steady / accelerate.
  3. Recommend a concrete next step with a plain-English reason,
     re-ordering *within* the next unlocked lesson when it helps
     (e.g. skip straight to the exercise instead of re-watching the
     video, for a student who's already demonstrating mastery).
"""
from __future__ import annotations

from statistics import mean

REINFORCE_BELOW = 65   # mastery below this -> recommend reviewing before moving on
ACCELERATE_ABOVE = 88  # mastery at/above this -> recommend skipping straight to practice


def _activity_scores(student, module):
    """Every score this student has for activities in this module, from
    whichever of ActivityCompletion / Submission / QuizAttempt has it —
    a single activity can show up in more than one, so this takes the
    best available score per activity rather than double counting."""
    from apps.courses.models import Activity
    from apps.progress.models import ActivityCompletion
    from apps.submissions.models import Submission, SubmissionStatus
    from apps.quizzes.models import QuizAttempt

    activities = Activity.objects.filter(lesson__module=module)
    scores: dict[int, float] = {}

    for c in ActivityCompletion.objects.filter(student=student, activity__in=activities):
        if c.score is not None:
            scores[c.activity_id] = c.score

    for s in Submission.objects.filter(
        student=student, activity__in=activities, status=SubmissionStatus.GRADED, grade__isnull=False
    ):
        # A graded submission is a more specific signal than a bare
        # completion record — prefer it if both exist for the same activity.
        scores[s.activity_id] = s.grade

    for qa in QuizAttempt.objects.filter(quiz__activity__in=activities, student=student):
        scores[qa.quiz.activity_id] = qa.percentage

    return scores


def module_mastery(student, module) -> dict:
    """{'mastery': float|None, 'attempted': int, 'total': int, 'weakest': (activity_title, score)|None}"""
    from apps.courses.models import Activity

    total = Activity.objects.filter(lesson__module=module).count()
    scores = _activity_scores(student, module)

    if not scores:
        return {"mastery": None, "attempted": 0, "total": total, "weakest": None}

    weakest_id = min(scores, key=scores.get)
    weakest_activity = Activity.objects.get(id=weakest_id)

    return {
        "mastery": round(mean(scores.values()), 1),
        "attempted": len(scores),
        "total": total,
        "weakest": (weakest_activity.title, scores[weakest_id]),
    }


def _next_step_in_module(student, module):
    """The next lesson/activity this student hasn't completed in `module`,
    in the course's defined order — the *default* (non-adaptive) next step,
    before pace-based reordering is applied."""
    from apps.courses.models import Lesson, Activity
    from apps.progress.models import ActivityCompletion

    completed_activity_ids = set(
        ActivityCompletion.objects.filter(student=student).values_list("activity_id", flat=True)
    )
    for lesson in Lesson.objects.filter(module=module).order_by("order"):
        for activity in Activity.objects.filter(lesson=lesson).order_by("id"):
            if activity.id not in completed_activity_ids:
                return lesson, activity
    return None, None


def recommend_for_course(student, course) -> dict | None:
    """The adaptive recommendation for one enrolled course. Returns None
    if the student has no unlocked, incomplete module in this course
    (fully done, or nothing unlocked yet — shouldn't happen given Module 1
    is always unlocked, but guards against an edge case cleanly)."""
    from apps.courses.models import Module
    from apps.progress.services import is_module_unlocked, is_module_complete

    modules = list(Module.objects.filter(course=course).order_by("order"))
    current_module = next(
        (m for m in modules if is_module_unlocked(student, m) and not is_module_complete(student, m)),
        None,
    )
    if current_module is None:
        return None

    mastery_by_module = {
        m.title: module_mastery(student, m)["mastery"]
        for m in modules
        if is_module_unlocked(student, m)
    }

    current = module_mastery(student, current_module)
    lesson, activity = _next_step_in_module(student, current_module)

    if current["mastery"] is not None and current["mastery"] < REINFORCE_BELOW and current["weakest"]:
        weak_title, weak_score = current["weakest"]
        pace = "reinforce"
        reason = (
            f"You scored {weak_score:.0f}% on \"{weak_title}\" — below the {REINFORCE_BELOW}% mastery "
            f"bar for this module. Revisit that before moving on so the next module doesn't compound the gap."
        )
        recommendation = {
            "action": "review",
            "lesson_title": weak_title,
            "reason": reason,
        }
    elif current["mastery"] is not None and current["mastery"] >= ACCELERATE_ABOVE:
        pace = "accelerate"
        if activity is not None:
            reason = (
                f"You're averaging {current['mastery']:.0f}% in {current_module.title} — strong mastery. "
                f"Skipping straight to \"{activity.title}\" instead of re-covering material you've already shown you know."
            )
            recommendation = {
                "action": "practice_first",
                "lesson_title": lesson.title if lesson else None,
                "activity_title": activity.title,
                "reason": reason,
            }
        else:
            reason = f"You're averaging {current['mastery']:.0f}% in {current_module.title} — ready for the next module as soon as it unlocks."
            recommendation = {"action": "advance", "reason": reason}
    else:
        pace = "steady"
        if activity is not None:
            reason = f"Next up in {current_module.title}: \"{activity.title}\", in the order it was designed."
            recommendation = {
                "action": "continue",
                "lesson_title": lesson.title if lesson else None,
                "activity_title": activity.title,
                "reason": reason,
            }
        else:
            reason = f"You're through the available content in {current_module.title} — nice pace, keep it steady."
            recommendation = {"action": "advance", "reason": reason}

    return {
        "course_id": course.id,
        "course_title": course.title,
        "current_module": current_module.title,
        "current_module_mastery": current["mastery"],
        "pace": pace,
        "recommendation": recommendation,
        "mastery_by_module": mastery_by_module,
    }


def recommend_for_student(student) -> list[dict]:
    """One recommendation per enrolled course with an active module. This is
    what the student dashboard's "Recommended for you" card renders."""
    from apps.enrollment.models import Enrollment

    results = []
    for enrollment in Enrollment.objects.filter(student=student).select_related("course"):
        rec = recommend_for_course(student, enrollment.course)
        if rec is not None:
            results.append(rec)
    return results
