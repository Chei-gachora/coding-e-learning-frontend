"""
Sanity checks for the risk app's service layer.

Full model-accuracy testing belongs in risk_engine/tests/ (it already has
its own pytest suite against the standalone package). These tests only
check that the Django-side wiring — snapshot fetching, the "not enough
history" guard, and cohort aggregation — behaves correctly, using mocked
engine output so they don't need a trained model or real DB fixtures to
run in CI.
"""
from unittest.mock import patch

from django.test import TestCase

from . import services


class ScoreStudentTests(TestCase):
    @patch("apps.risk.services._snapshots_for")
    def test_returns_none_when_not_enough_history(self, mock_snapshots):
        mock_snapshots.return_value = [{"week_start": "2026-01-01"}]  # 1 week, below MIN_HISTORY_WEEKS
        result = services.score_student(student_id=1, course_id=1)
        self.assertIsNone(result)

    @patch("apps.risk.services.get_engine")
    @patch("apps.risk.services._snapshots_for")
    def test_scores_when_enough_history(self, mock_snapshots, mock_get_engine):
        mock_snapshots.return_value = [{"week_start": f"2026-01-0{i}"} for i in range(1, 5)]
        mock_get_engine.return_value.score_student.return_value = {
            "student_id": 1, "course_id": 1, "student_health_score": 80,
            "risk_level": "low", "risk_probability": 0.1,
            "top_factors": ["Recent average score is strong"],
            "recommended_action": "On track — no action needed.",
        }
        result = services.score_student(student_id=1, course_id=1)
        self.assertEqual(result["risk_level"], "low")
