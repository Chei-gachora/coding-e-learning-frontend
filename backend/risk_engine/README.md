# Optimum LMS — Student Risk Engine

Standalone ML pipeline that scores a student's likelihood of falling
behind in the next 2 weeks, from their trailing weekly activity —
implements the "Student Performance Intelligence Engine" spec. Built and
tested independently of the Django backend; see `INTEGRATION.md` for how
to wire it in.

## What it does

Given a student's last several weeks of activity (quiz scores, completion
rate, logins, deadlines missed, etc.), it returns:

```json
{
  "student_id": "STU-00005",
  "course_id": "JS-201",
  "student_health_score": 1,
  "risk_level": "high",
  "risk_probability": 0.988,
  "top_factors": [
    "Recent average score is low",
    "Scoring below the class average",
    "Quiz performance is declining"
  ],
  "recommended_action": "Needs intervention — assign a revision task and flag for instructor follow-up."
}
```

`top_factors` comes from real SHAP values on the trained model, not a
hardcoded rule list — it explains *this student's* prediction, not a
generic description of the risk_level.

## Quickstart

```bash
pip install -r requirements.txt

python src/generate_synthetic_data.py   # synthetic data until real data exists
python src/train.py                     # trains + saves the model
python src/predict.py                   # smoke-tests inference on a real record
pytest tests/                           # sanity checks on the feature pipeline
```

## Layout

```
src/
  schema.py                  # the WeeklySnapshot data contract
  features.py                 # raw snapshots -> engineered feature vector
  generate_synthetic_data.py  # synthetic dataset (swap for real data later)
  train.py                    # trains + saves the XGBoost model
  predict.py                  # RiskEngine — the class Django/Copilot calls
models/                        # trained model + metadata (gitignore the .joblib if it's large)
data/                           # synthetic training data
tests/                          # pytest sanity checks
INTEGRATION.md                 # how to wire this into your Django backend
```

## Model

XGBoost binary classifier, **probability-calibrated** with isotonic
regression (`CalibratedClassifierCV`), predicting probability of needing
support in the next 2 weeks from 15 engineered trend/consistency features
(not raw counters — see `features.py`). Calibration matters here because
the product literally shows `risk_probability` to instructors as a
percentage — an uncalibrated model's "0.4" doesn't reliably mean "40%
chance," a calibrated one does (checked via Brier score in training output).

Evaluated with 5-fold stratified cross-validation (more reliable than a
single train/test split on ~900 students) plus a final held-out test set:
**ROC-AUC ~0.90-0.92, precision ~0.87-0.91, recall ~0.66-0.78** depending
on split. Full numbers are in `models/metadata.json` after training.
Risk-level cutoffs (`low`/`medium`/`high`) are data-derived from the
calibrated training probabilities: medium begins at the 60th percentile
and high at the 85th percentile. Because the checked-in training labels
are synthetic, these cutoffs are provisional and should be reviewed
against real outcomes and the intervention policy before production use.

At startup, the predictor checks that the ordered `feature_columns` in
`models/metadata.json` match the runtime feature definitions and that
every calibrated model estimator expects that feature count. A mismatch
raises an explicit error; regenerate the model and metadata together with
`python src/train.py` rather than deploying incompatible artifacts.

**This ships trained on synthetic data.** It proves the pipeline works
end-to-end (schema → features → model → explainable output). It is *not*
validated against real student outcomes yet — see the "what's simplified"
section in `INTEGRATION.md` before treating its output as authoritative.

## Extending

- Swap `XGBClassifier` for `LightGBM`/`CatBoost` in `train.py` if you want
  to compare — `features.py`/`predict.py` don't care which one produced
  `risk_model.joblib`.
- To predict a different target (e.g. final grade bucket instead of
  binary at-risk), relabel in `generate_synthetic_data.py` (or your real
  data export) and adjust `train.py`'s objective — the feature pipeline
  doesn't need to change.
- `inactivity_streak_days` had ~0 importance on synthetic data — expect
  that to change once trained on real activity data, where inactivity
  streaks are a much stronger real-world signal than this generator
  produces.
