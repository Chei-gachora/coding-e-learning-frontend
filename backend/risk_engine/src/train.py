"""
Trains the risk classifier and saves everything predict.py needs at
inference time (model, feature column order, per-course class averages,
and the probability thresholds that turn a raw score into low/medium/high).

Usage:
    python src/generate_synthetic_data.py   # first time only / to refresh
    python src/train.py
"""

from __future__ import annotations

import json
import pathlib

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, brier_score_loss, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier

from features import FEATURE_COLUMNS, build_features, composite_score

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"


def load_training_table() -> tuple[pd.DataFrame, dict]:
    snapshots = pd.read_csv(DATA_DIR / "student_snapshots.csv")
    labels = pd.read_csv(DATA_DIR / "labels.csv")

    # Class average composite score per course, computed from each
    # student's *last* history week — this is what "relative_score_vs_class"
    # compares each student against. Saved alongside the model so
    # predict.py can use the same reference at inference time.
    last_week = snapshots.sort_values("week_index").groupby("student_id").tail(1).copy()
    last_week["composite"] = last_week.apply(
        lambda r: composite_score(r["quiz_avg"], r["assignment_avg"], r["exam_avg"]), axis=1
    )
    class_avg = last_week.groupby("course_id")["composite"].mean().to_dict()

    rows = []
    for student_id, group in snapshots.groupby("student_id"):
        group = group.sort_values("week_index")
        course_id = group["course_id"].iloc[0]
        feat = build_features(group.to_dict("records"), class_avg_composite_score=class_avg.get(course_id))
        feat["student_id"] = student_id
        rows.append(feat)

    features_df = pd.DataFrame(rows).merge(labels[["student_id", "at_risk"]], on="student_id")
    return features_df, class_avg


def _base_model() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_lambda=1.5,
        eval_metric="logloss",
        random_state=42,
    )


def cross_validate(X: pd.DataFrame, y: pd.Series, n_splits: int = 5) -> dict:
    """5-fold stratified CV instead of one 80/20 split. With ~900 students,
    a single split's metrics can swing several points depending on which
    students happened to land in the test set — CV reports the mean and
    spread so you know how much to trust the numbers."""
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    fold_metrics = {"accuracy": [], "precision": [], "recall": [], "f1": [], "roc_auc": [], "brier": []}

    for train_idx, test_idx in skf.split(X, y):
        model = _base_model()
        model.fit(X.iloc[train_idx], y.iloc[train_idx])
        proba = model.predict_proba(X.iloc[test_idx])[:, 1]
        preds = (proba >= 0.5).astype(int)
        y_test = y.iloc[test_idx]

        fold_metrics["accuracy"].append(accuracy_score(y_test, preds))
        fold_metrics["precision"].append(precision_score(y_test, preds, zero_division=0))
        fold_metrics["recall"].append(recall_score(y_test, preds, zero_division=0))
        fold_metrics["f1"].append(f1_score(y_test, preds, zero_division=0))
        fold_metrics["roc_auc"].append(roc_auc_score(y_test, proba))
        # Brier score: how far predicted probabilities are from reality,
        # i.e. is "0.41 risk" actually meaningful or just a ranking number.
        fold_metrics["brier"].append(brier_score_loss(y_test, proba))

    return {k: {"mean": float(np.mean(v)), "std": float(np.std(v))} for k, v in fold_metrics.items()}


def train():
    print("Loading and engineering features...")
    features_df, class_avg = load_training_table()

    X = features_df[FEATURE_COLUMNS]
    y = features_df["at_risk"]

    print(f"Total: {len(X)}  Base rate: {y.mean():.1%}")

    print("\n=== 5-fold cross-validated metrics (uncalibrated model) ===")
    cv_metrics = cross_validate(X, y)
    for k, v in cv_metrics.items():
        print(f"  {k:10s}: {v['mean']:.3f}  (± {v['std']:.3f})")

    # Hold out a final test set to report calibrated performance on data
    # the calibration step itself never touched.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Calibration: XGBoost's raw predict_proba is a good *ranking* but not
    # a trustworthy *probability* — a batch of predictions at "0.4" won't
    # actually contain ~40% at-risk students without this step. Isotonic
    # regression on 5-fold internal CV fixes that, at the cost of needing
    # slightly more training data per fold.
    base = _base_model()
    calibrated = CalibratedClassifierCV(base, method="isotonic", cv=5)
    calibrated.fit(X_train, y_train)

    proba = calibrated.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    test_metrics = {
        "accuracy": accuracy_score(y_test, preds),
        "precision": precision_score(y_test, preds, zero_division=0),
        "recall": recall_score(y_test, preds, zero_division=0),
        "f1": f1_score(y_test, preds, zero_division=0),
        "roc_auc": roc_auc_score(y_test, proba),
        "brier": brier_score_loss(y_test, proba),
    }
    print("\n=== Held-out test set (calibrated model) ===")
    for k, v in test_metrics.items():
        print(f"  {k:10s}: {v:.3f}")
    print("\n" + classification_report(y_test, preds, target_names=["not at risk", "at risk"]))
    print("Confusion matrix [[TN FP] [FN TP]]:\n", confusion_matrix(y_test, preds))

    # Feature importances come from a plain (uncalibrated) fit on all data —
    # CalibratedClassifierCV wraps multiple internal models and doesn't
    # expose a single clean .feature_importances_.
    importance_model = _base_model()
    importance_model.fit(X, y)
    importances = pd.Series(importance_model.feature_importances_, index=FEATURE_COLUMNS).sort_values(ascending=False)
    print("\n=== Feature importances (fit on full data) ===")
    print(importances.to_string())

    # Final model: refit the calibrated pipeline on *all* available data
    # (train + test) so nothing is held back from what ships. The metrics
    # above already came from a proper held-out set, so this doesn't
    # invalidate them.
    final_model = CalibratedClassifierCV(_base_model(), method="isotonic", cv=5)
    final_model.fit(X, y)

    # Risk-level thresholds off the calibrated probabilities: medium starts
    # at the 60th percentile, high at the 85th. Tune these with real outcome
    # data and an agreed intervention policy.
    full_proba = final_model.predict_proba(X)[:, 1]
    medium_cutoff = float(np.quantile(full_proba, 0.60))
    high_cutoff = float(np.quantile(full_proba, 0.85))

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(final_model, MODEL_DIR / "risk_model.joblib")
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump({
            "feature_columns": FEATURE_COLUMNS,
            "class_avg_composite_by_course": class_avg,
            "thresholds": {"medium": medium_cutoff, "high": high_cutoff},
            "cross_validated_metrics": cv_metrics,
            "held_out_test_metrics": test_metrics,
            "feature_importances": importances.to_dict(),
            "trained_on_rows": len(features_df),
            "calibrated": True,
        }, f, indent=2)

    print(f"\nSaved calibrated model + metadata to {MODEL_DIR}/")
    print(f"Risk thresholds — medium: {medium_cutoff:.3f}, high: {high_cutoff:.3f}")


if __name__ == "__main__":
    train()
