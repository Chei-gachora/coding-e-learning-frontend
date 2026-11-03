"""
The one function Copilot/Django actually needs to call:

    from predict import RiskEngine
    engine = RiskEngine()  # loads the trained model once
    card = engine.score_student(snapshots)

`snapshots` is that one student's trailing weekly history (list of dicts
matching schema.WeeklySnapshot, oldest first — see schema.py). Returns a
dict matching the spec's output contract exactly:

    student_health_score   int, 0-100 (higher = healthier)
    risk_level              "low" | "medium" | "high"
    risk_probability        float, 0-1
    top_factors              list[str], plain-English, ranked by SHAP contribution
    recommended_action       str

Everything here is deterministic given the same model + inputs — no
randomness at inference time.
"""

from __future__ import annotations

import json
import pathlib
from typing import TypedDict

import joblib
import numpy as np
import shap

from features import FEATURE_COLUMNS, build_features, features_to_row
from schema import MIN_HISTORY_WEEKS

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"

# Plain-English explanation for each engineered feature, keyed by direction.
# SHAP tells us *which* feature moved the prediction and *which way*; this
# table turns that into a sentence an instructor can act on without knowing
# what "engagement_dropoff_trend" means.
FEATURE_EXPLANATIONS = {
    "avg_score_last_4_weeks": ("Recent average score is low", "Recent average score is strong"),
    "score_trend": ("Scores are trending downward", "Scores are trending upward"),
    "score_volatility": ("Scores are inconsistent week to week", "Scores are stable week to week"),
    "completion_rate_latest": ("Course completion is behind pace", "Course completion is on pace"),
    "completion_velocity": ("Completion progress has stalled", "Completion progress is steady"),
    "submission_consistency": ("Frequently late or missing submissions", "Submissions are consistently on time"),
    "missed_deadline_rate": ("Missing deadlines regularly", "Rarely misses deadlines"),
    "quiz_improvement_slope": ("Quiz performance is declining", "Quiz performance is improving"),
    "avg_login_frequency": ("Logging in infrequently", "Logging in regularly"),
    "avg_active_days": ("Few active days per week", "Active most days of the week"),
    "engagement_dropoff_trend": ("Time spent on the platform is dropping", "Time spent on the platform is increasing"),
    "content_consumed_pct_avg": ("Not opening most assigned content", "Consistently working through assigned content"),
    "inactivity_streak_days": ("Currently on a multi-day inactivity streak", "No recent inactivity streak"),
    "retries_avg": ("Needing frequent retries on quizzes/assignments", "Rarely needs retries"),
    "relative_score_vs_class": ("Scoring below the class average", "Scoring above the class average"),
}


class CohortRiskScores(TypedDict):
    scored: list[dict]
    skipped_insufficient_history: list[str]


def _validate_feature_contract(model, metadata: dict) -> None:
    metadata_columns = metadata.get("feature_columns")
    if metadata_columns != FEATURE_COLUMNS:
        raise ValueError(
            "Risk model feature order does not match the runtime feature definitions. "
            "Retrain the model and regenerate metadata.json."
        )

    model_feature_counts = {
        classifier.estimator.n_features_in_
        for classifier in model.calibrated_classifiers_
    }
    if model_feature_counts != {len(FEATURE_COLUMNS)}:
        raise ValueError(
            "Risk model feature count does not match the runtime feature definitions. "
            "Retrain the model and regenerate metadata.json."
        )


def _recommend_action(risk_level: str, feat: dict) -> str:
    if risk_level == "high":
        if feat["inactivity_streak_days"] >= 5 or feat["avg_login_frequency"] < 1:
            return "Reach out directly — student has gone quiet. Schedule a 1:1 check-in this week."
        return "Needs intervention — assign a revision task and flag for instructor follow-up."
    if risk_level == "medium":
        return "At risk of falling behind — recommend a revision module and monitor next 2 weeks."
    if feat["avg_score_last_4_weeks"] >= 85 and feat["score_trend"] >= 0:
        return "Top performer — no action needed."
    return "On track — no action needed."


class RiskEngine:
    def __init__(self, model_dir: pathlib.Path = MODEL_DIR):
        self.model = joblib.load(model_dir / "risk_model.joblib")
        with open(model_dir / "metadata.json") as f:
            self.metadata = json.load(f)
        _validate_feature_contract(self.model, self.metadata)
        self.thresholds = self.metadata["thresholds"]
        self.class_avg = self.metadata["class_avg_composite_by_course"]
        # self.model is a CalibratedClassifierCV — its predict_proba is what
        # we actually trust for risk_probability, but SHAP needs a concrete
        # tree model to explain. We pull out one fold's underlying XGBoost
        # estimator just for ranking *which* features drove the prediction
        # and in *which direction* — that ranking is stable across folds
        # even though the calibrated probability itself comes from the
        # full ensemble.
        underlying_model = self.model.calibrated_classifiers_[0].estimator
        self._explainer = shap.TreeExplainer(underlying_model)

    def _risk_level(self, probability: float) -> str:
        if probability >= self.thresholds["high"]:
            return "high"
        if probability >= self.thresholds["medium"]:
            return "medium"
        return "low"

    def _top_factors(self, feat: dict, n: int = 3) -> list[str]:
        row = np.array([features_to_row(feat)])
        shap_values = self._explainer.shap_values(row)[0]
        # positive SHAP = pushed risk up, negative = pushed risk down
        ranked = sorted(zip(FEATURE_COLUMNS, shap_values), key=lambda t: abs(t[1]), reverse=True)
        factors = []
        for col, value in ranked[:n]:
            bad_explanation, good_explanation = FEATURE_EXPLANATIONS[col]
            factors.append(bad_explanation if value > 0 else good_explanation)
        return factors

    def score_student(self, snapshots: list[dict]) -> dict:
        if len(snapshots) < MIN_HISTORY_WEEKS:
            raise ValueError(
                f"Need at least {MIN_HISTORY_WEEKS} weeks of history to score a student "
                f"(got {len(snapshots)}). Not enough data yet — don't show a risk card."
            )

        course_id = snapshots[-1].get("course_id")
        feat = build_features(snapshots, class_avg_composite_score=self.class_avg.get(course_id))

        row = np.array([features_to_row(feat)])
        probability = float(self.model.predict_proba(row)[0, 1])
        risk_level = self._risk_level(probability)
        health_score = int(round((1 - probability) * 100))

        return {
            "student_id": feat["_student_id"],
            "course_id": course_id,
            "student_health_score": health_score,
            "risk_level": risk_level,
            "risk_probability": round(probability, 3),
            "top_factors": self._top_factors(feat),
            "recommended_action": _recommend_action(risk_level, feat),
        }

    def score_many(self, snapshots_by_student: dict[str, list[dict]]) -> CohortRiskScores:
        """Convenience batch wrapper — e.g. for a nightly job that scores
        an entire cohort at once. Students without enough history are
        skipped; errors while scoring valid histories are allowed to surface."""
        results, skipped = [], []
        for student_id, snaps in snapshots_by_student.items():
            if len(snaps) < MIN_HISTORY_WEEKS:
                skipped.append(student_id)
                continue
            results.append(self.score_student(snaps))
        results.sort(key=lambda r: r["risk_probability"], reverse=True)
        return {"scored": results, "skipped_insufficient_history": skipped}


if __name__ == "__main__":
    # Smoke test against a real student from the synthetic dataset.
    import pandas as pd

    snapshots = pd.read_csv(ROOT / "data" / "student_snapshots.csv")
    sample_id = snapshots["student_id"].iloc[0]
    sample = snapshots[snapshots["student_id"] == sample_id].sort_values("week_index").to_dict("records")

    engine = RiskEngine()
    card = engine.score_student(sample)
    print(json.dumps(card, indent=2))
