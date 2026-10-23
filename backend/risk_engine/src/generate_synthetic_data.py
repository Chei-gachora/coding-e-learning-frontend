"""
Generates a synthetic but internally-consistent dataset that stands in for
your real Django `PerformanceSnapshot` table, so the rest of this package
can be built, tested, and demoed before real production data exists.

Swap this out for real data by writing a loader that pulls
`WeeklySnapshot` rows out of Postgres for `history_weeks` weeks — nothing
downstream (features.py, train.py) cares where the CSV came from.

Labeling approach (avoids leakage): each student is simulated for
`history_weeks + label_weeks` weeks. Only the first `history_weeks` are
written out as features-visible history. The label — "did this student
struggle in the following `label_weeks`" — is derived from the *held-out*
future weeks the model never sees as input. This mirrors the real task:
predict from a student's trailing history whether they're heading for
trouble in the next couple of weeks.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)


def composite_of(quiz_avg: float, assignment_avg: float, exam_avg: float) -> float:
    """Composite academic score for one week. exam_avg is 0 on the ~3 of 4
    weeks with no exam — averaging that 0 straight in would silently drag
    every student's score down by a third, so it's only counted when an
    exam actually happened that week."""
    if exam_avg > 0:
        return 0.4 * quiz_avg + 0.35 * assignment_avg + 0.25 * exam_avg
    return 0.55 * quiz_avg + 0.45 * assignment_avg

COURSES = ["WEB-101", "JS-201", "PY-301"]
TRAJECTORIES = ("stable", "declining", "volatile", "improving")
TRAJECTORY_WEIGHTS = (0.55, 0.20, 0.10, 0.15)


def _clip(x, lo, hi):
    return float(np.clip(x, lo, hi))


def simulate_student(student_id: str, course_id: str, n_weeks: int) -> tuple[list[dict], str]:
    trajectory = RNG.choice(TRAJECTORIES, p=TRAJECTORY_WEIGHTS)

    ability = _clip(RNG.normal(72, 14), 25, 98)
    engagement_baseline = _clip(RNG.normal(0.68, 0.18), 0.15, 1.0)

    # Total drift applied *directly as a function of week index* (not fed
    # back into itself each iteration) so it can't accumulate a biased
    # random walk — clipping a cumulative sum at 0/100 truncates the upside
    # more often than the downside for high-ability students, which was
    # quietly dragging the whole population's scores down over 10 weeks.
    score_slope = {
        "stable": RNG.normal(0, 0.3),
        "declining": RNG.normal(-2.1, 0.5),
        "volatile": RNG.normal(0, 0.3),
        "improving": RNG.normal(1.6, 0.5),
    }[trajectory]
    score_noise_std = 6.5 if trajectory == "volatile" else 3.0

    engagement_slope = {
        "stable": RNG.normal(0, 0.003),
        "declining": RNG.normal(-0.028, 0.01),
        "volatile": RNG.normal(0, 0.006),
        "improving": RNG.normal(0.018, 0.01),
    }[trajectory]
    engagement_noise_std = 0.09 if trajectory == "volatile" else 0.035

    rows = []
    completion = _clip(RNG.normal(0.05, 0.02), 0.0, 0.15)
    inactivity_streak = 0

    for week in range(n_weeks):
        score = _clip(ability + score_slope * week + RNG.normal(0, score_noise_std), 0, 100)
        engagement = _clip(engagement_baseline + engagement_slope * week + RNG.normal(0, engagement_noise_std), 0.02, 1.0)
        completion = _clip(completion + engagement * RNG.uniform(0.03, 0.09), 0.0, 1.0)

        quiz_avg = _clip(score + RNG.normal(0, 4), 0, 100)
        assignment_avg = _clip(score + RNG.normal(0, 5), 0, 100)
        exam_avg = _clip(score + RNG.normal(0, 6), 0, 100) if week % 4 == 3 else 0.0

        active_days = int(round(_clip(engagement * 7 + RNG.normal(0, 0.8), 0, 7)))
        login_count = max(0, int(round(active_days * RNG.uniform(1.0, 2.2))))
        time_spent = max(0.0, engagement * 420 + RNG.normal(0, 40))
        video_watch = max(0.0, time_spent * RNG.uniform(0.25, 0.55))
        content_consumed = _clip(engagement * RNG.uniform(0.85, 1.1), 0, 1)

        deadline_risk = 1 - engagement
        deadlines_missed = RNG.poisson(max(0.0, deadline_risk * 1.4))
        late_submissions = RNG.poisson(max(0.0, deadline_risk * 1.1))
        retries = RNG.poisson(max(0.0, (1 - engagement) * 0.9))
        resources_opened = max(0, int(round(engagement * RNG.uniform(1, 5))))
        skipped_lessons = RNG.poisson(max(0.0, (1 - engagement) * 1.3))
        attendance_rate = _clip(engagement + RNG.normal(0, 0.08), 0, 1)

        inactivity_streak = 0 if active_days > 0 else inactivity_streak + RNG.integers(1, 4)

        rows.append({
            "student_id": student_id,
            "course_id": course_id,
            "week_index": week,
            "quiz_avg": round(quiz_avg, 1),
            "assignment_avg": round(assignment_avg, 1),
            "exam_avg": round(exam_avg, 1),
            "completion_rate": round(completion, 3),
            "retries": int(retries),
            "deadlines_missed": int(deadlines_missed),
            "login_count": int(login_count),
            "active_days": active_days,
            "time_spent_minutes": round(time_spent, 1),
            "video_watch_minutes": round(video_watch, 1),
            "content_consumed_pct": round(content_consumed, 3),
            "attendance_rate": round(attendance_rate, 3),
            "late_submissions": int(late_submissions),
            "inactivity_streak_days": int(inactivity_streak),
            "resources_opened": int(resources_opened),
            "skipped_lessons": int(skipped_lessons),
        })

    return rows, trajectory


def generate(n_students: int = 900, history_weeks: int = 8, label_weeks: int = 2) -> tuple[pd.DataFrame, pd.DataFrame]:
    total_weeks = history_weeks + label_weeks
    history_rows = []
    labels = []

    for i in range(n_students):
        student_id = f"STU-{i:05d}"
        course_id = RNG.choice(COURSES)
        rows, trajectory = simulate_student(student_id, course_id, total_weeks)

        history = rows[:history_weeks]
        future = rows[history_weeks:]
        history_rows.extend(history)

        future_composite = np.mean([composite_of(r["quiz_avg"], r["assignment_avg"], r["exam_avg"]) for r in future])
        future_inactivity = future[-1]["inactivity_streak_days"]
        completion_stall = future[-1]["completion_rate"] - history[-1]["completion_rate"] < 0.03

        # Ground truth: struggled in the held-out following weeks. A little
        # independent noise keeps this from being perfectly separable from
        # the history features alone, same as real students.
        rule_hit = (future_composite < 62) or (future_inactivity > 6) or (completion_stall and future_composite < 72)
        noise_flip = RNG.random() < 0.05
        at_risk = int(rule_hit != noise_flip)

        labels.append({
            "student_id": student_id,
            "course_id": course_id,
            "at_risk": at_risk,
            "_trajectory": trajectory,  # kept for dataset inspection only, not a feature
        })

    return pd.DataFrame(history_rows), pd.DataFrame(labels)


if __name__ == "__main__":
    import pathlib

    out_dir = pathlib.Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(exist_ok=True)

    snapshots_df, labels_df = generate()
    snapshots_df.to_csv(out_dir / "student_snapshots.csv", index=False)
    labels_df.to_csv(out_dir / "labels.csv", index=False)

    print(f"Wrote {len(snapshots_df)} weekly snapshot rows for {labels_df.shape[0]} students to {out_dir}")
    print(f"Base rate: {labels_df['at_risk'].mean():.1%} at-risk")
    print(labels_df.groupby('_trajectory')['at_risk'].mean())
