"""
Early Warning Risk Classifier — service layer.

This is the integration point described in risk_engine/README.md and the
original risk-engine/INTEGRATION.md: a standalone, independently-trained
ML pipeline (XGBoost + SHAP) that scores a student's likelihood of
falling behind from their trailing weekly PerformanceSnapshot history.

Design choices, spelled out because they matter for anyone maintaining
this later:

- The model is loaded once per process (module-level singleton via
  get_engine()), not per-request — loading the joblib + building the
  SHAP explainer is not cheap enough to do on every call.
- Scoring requires >= MIN_HISTORY_WEEKS snapshots (currently 3). A
  student with less history than that is *not* scored — we return None
  rather than a low-confidence guess. Callers must handle None.
- "top_factors" and "recommended_action" come straight out of the model
  package (real SHAP explanations, not a hardcoded rule list) — see
  risk_engine/src/predict.py for exactly how those are derived.
- Per risk_engine/INTEGRATION.md section 6: this model's training labels
  are currently synthetic. It demonstrates the pipeline end-to-end, but
  should not be treated as authoritative for real academic decisions
  until it's retrained on real outcome data and its precision/recall has
  been checked on a held-out real cohort. Surface risk_level to
  instructors as a *prompt to look closer*, not a verdict.
"""
from __future__ import annotations

import sys
from pathlib import Path

RISK_ENGINE_SRC = Path(__file__).resolve().parent.parent.parent / "risk_engine" / "src"
if str(RISK_ENGINE_SRC) not in sys.path:
    sys.path.insert(0, str(RISK_ENGINE_SRC))

from predict import RiskEngine  # noqa: E402  (path must be set up first)
from schema import MIN_HISTORY_WEEKS  # noqa: E402

_engine: RiskEngine | None = None


class RiskModelUnavailable(Exception):
    """The optional risk model artifact cannot be loaded in this process."""


def get_engine() -> RiskEngine:
    global _engine
    if _engine is None:
        try:
            _engine = RiskEngine()
        except Exception as error:
            raise RiskModelUnavailable("The risk model could not be loaded.") from error
    return _engine


def _snapshots_for(student_id: int, course_id: int, weeks: int = 12) -> list[dict]:
    from apps.dashboards.models import PerformanceSnapshot

    rows = list(
        PerformanceSnapshot.objects.filter(student_id=student_id, course_id=course_id)
        .order_by("week_start")
        .values(
            "student_id", "course_id", "week_start",
            "quiz_avg", "assignment_avg", "exam_avg", "completion_rate",
            "retries", "deadlines_missed", "login_count", "active_days",
            "time_spent_minutes", "video_watch_minutes", "content_consumed_pct",
            "attendance_rate", "late_submissions", "inactivity_streak_days",
            "resources_opened", "skipped_lessons",
        )
    )
    return rows[-weeks:]


def score_student(student_id: int, course_id: int) -> dict | None:
    """Score one student in one course. Returns None if there isn't
    enough weekly history yet (fewer than MIN_HISTORY_WEEKS snapshots)."""
    snapshots = _snapshots_for(student_id, course_id)
    if len(snapshots) < MIN_HISTORY_WEEKS:
        return None
    return get_engine().score_student(snapshots)


def score_course_cohort(course_id: int) -> dict:
    """Score every enrolled student in a course. Returns
    {"scored": [...sorted by risk, highest first], "skipped_insufficient_history": [student_id, ...]}."""
    from django.contrib.auth import get_user_model
    from apps.enrollment.models import Enrollment

    User = get_user_model()
    student_ids = list(Enrollment.objects.filter(course_id=course_id).values_list("student_id", flat=True))
    snapshots_by_student = {
        str(sid): _snapshots_for(sid, course_id) for sid in student_ids
    }
    result = get_engine().score_many(snapshots_by_student)

    names = {
        u.id: (u.get_full_name() or u.username)
        for u in User.objects.filter(id__in=student_ids)
    }
    for card in result["scored"]:
        card["student_name"] = names.get(int(card["student_id"]), card["student_id"])

    return result


def score_instructor_cohort(instructor) -> dict:
    """Score every student across every course this instructor teaches.
    Used by the instructor dashboard's cohort-wide risk table."""
    from apps.courses.models import Course

    courses = Course.objects.filter(instructor=instructor)
    scored, skipped = [], []
    for course in courses:
        result = score_course_cohort(course.id)
        for card in result["scored"]:
            card["course_title"] = course.title
        scored.extend(result["scored"])
        skipped.extend(
            {"student_id": sid, "course_id": course.id, "course_title": course.title}
            for sid in result["skipped_insufficient_history"]
        )
    scored.sort(key=lambda r: r["risk_probability"], reverse=True)
    return {"scored": scored, "skipped_insufficient_history": skipped}
