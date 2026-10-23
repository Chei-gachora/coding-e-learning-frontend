"""
Turns a student's trailing weekly snapshots into the feature vector the
model actually trains/predicts on. Raw counters (logins, minutes, scores)
are weak signals on their own — trend, volatility and consistency across
weeks are what carry the signal, per the spec's "feature engineering"
section.

`build_features` is the single function both training and inference call,
so the two can never silently drift out of sync with each other.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from schema import MIN_HISTORY_WEEKS

# The ordered list of engineered feature columns the model is trained on.
# Keep this in sync with what `build_features` returns — `train.py` and
# `predict.py` both import this list rather than hardcoding column names.
FEATURE_COLUMNS = [
    "avg_score_last_4_weeks",
    "score_trend",
    "score_volatility",
    "completion_rate_latest",
    "completion_velocity",
    "submission_consistency",
    "missed_deadline_rate",
    "quiz_improvement_slope",
    "avg_login_frequency",
    "avg_active_days",
    "engagement_dropoff_trend",
    "content_consumed_pct_avg",
    "inactivity_streak_days",
    "retries_avg",
    "relative_score_vs_class",
]


def _slope(y: np.ndarray) -> float:
    """Linear trend per week. Positive = improving, negative = declining."""
    if len(y) < 2:
        return 0.0
    x = np.arange(len(y))
    # polyfit is fine at this scale (a handful of points); guards against
    # a degenerate all-equal series raising a rank warning.
    if np.all(y == y[0]):
        return 0.0
    slope, _ = np.polyfit(x, y, 1)
    return float(slope)


def build_features(snapshots: list[dict], class_avg_composite_score: float | None = None) -> dict:
    """
    snapshots: this one student's weekly snapshots, in *chronological*
    order (oldest first), each a dict matching schema.WeeklySnapshot's
    fields. Only the trailing history matters — callers typically pass the
    last 8-12 weeks.

    class_avg_composite_score: optional, that course's current average
    composite score (see `composite_score` below) across all students,
    for the "compared to class average" feature. Pass None if you don't
    have it computed yet — the feature falls back to 0 (neutral) rather
    than guessing.

    Raises ValueError if there's fewer than MIN_HISTORY_WEEKS of history —
    there isn't enough signal yet to say anything about trend/direction,
    and returning a confident-looking risk score anyway would be worse
    than declining to score.
    """
    if len(snapshots) < MIN_HISTORY_WEEKS:
        raise ValueError(
            f"Need at least {MIN_HISTORY_WEEKS} weekly snapshots to score a student, "
            f"got {len(snapshots)}."
        )

    df = pd.DataFrame(snapshots)
    composite = df.apply(lambda r: composite_score(r["quiz_avg"], r["assignment_avg"], r["exam_avg"]), axis=1)
    recent = composite.tail(4)

    latest = df.iloc[-1]
    n_weeks = len(df)

    relative_vs_class = 0.0
    if class_avg_composite_score is not None:
        relative_vs_class = float(composite.iloc[-1] - class_avg_composite_score)

    return {
        "avg_score_last_4_weeks": float(recent.mean()),
        "score_trend": _slope(composite.to_numpy()),
        "score_volatility": float(composite.std(ddof=0)),
        "completion_rate_latest": float(latest["completion_rate"]),
        "completion_velocity": _slope(df["completion_rate"].to_numpy()),
        "submission_consistency": 1.0 - float((df["late_submissions"] + df["deadlines_missed"]).mean()) / 5.0,
        "missed_deadline_rate": float(df["deadlines_missed"].mean()),
        "quiz_improvement_slope": _slope(df["quiz_avg"].to_numpy()),
        "avg_login_frequency": float(df["login_count"].mean()),
        "avg_active_days": float(df["active_days"].mean()),
        "engagement_dropoff_trend": _slope(df["time_spent_minutes"].to_numpy()),
        "content_consumed_pct_avg": float(df["content_consumed_pct"].mean()),
        "inactivity_streak_days": float(latest["inactivity_streak_days"]),
        "retries_avg": float(df["retries"].mean()),
        "relative_score_vs_class": relative_vs_class,
        # carried through for reporting/explanation, not fed to the model
        "_student_id": latest.get("student_id"),
        "_course_id": latest.get("course_id"),
        "_n_weeks_history": n_weeks,
    }


def composite_score(quiz_avg: float, assignment_avg: float, exam_avg: float) -> float:
    """Single 0-100 "how well are they doing academically" number, used
    both for labeling training data and for class-average comparisons.
    exam_avg is 0 on weeks with no exam, so it's only folded in on weeks
    it's actually present — otherwise it drags every score down by a third."""
    if exam_avg and exam_avg > 0:
        return 0.4 * quiz_avg + 0.35 * assignment_avg + 0.25 * exam_avg
    return 0.55 * quiz_avg + 0.45 * assignment_avg


def features_to_row(feat: dict) -> list[float]:
    """Model-ready ordered feature vector (drops the metadata keys)."""
    return [feat[c] for c in FEATURE_COLUMNS]
