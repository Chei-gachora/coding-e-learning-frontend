"""
Data contract for the risk engine.

`WeeklySnapshot` is the one row-shape everything else in this package is
built on. Your Django backend needs to produce one of these per
student, per course, per week (e.g. a nightly/weekly management command
that aggregates that week's activity into a `PerformanceSnapshot` model
and writes it to Postgres). The risk engine only ever consumes a
student's last N snapshots — it never needs your raw event logs.

Field names here match the "Core / Academic / Engagement / Behavioral"
categories from the spec:
  - Core:       student_id, course_id, week_start
  - Academic:   quiz_avg, assignment_avg, exam_avg, completion_rate,
                retries, deadlines_missed
  - Engagement: login_count, active_days, time_spent_minutes,
                video_watch_minutes, content_consumed_pct
  - Behavioral: attendance_rate, late_submissions, inactivity_streak_days,
                resources_opened, skipped_lessons
"""

from dataclasses import dataclass, fields
from datetime import date


@dataclass
class WeeklySnapshot:
    student_id: str
    course_id: str
    week_start: date

    # Academic
    quiz_avg: float              # 0-100, mean quiz score that week
    assignment_avg: float        # 0-100
    exam_avg: float              # 0-100 (0 if no exam that week)
    completion_rate: float       # 0-1, modules completed / modules assigned so far
    retries: int                 # count of quiz/assignment retries that week
    deadlines_missed: int        # count that week

    # Engagement
    login_count: int             # logins that week
    active_days: int             # 0-7, distinct days with any activity
    time_spent_minutes: float    # total time in-platform that week
    video_watch_minutes: float   # lesson video time that week
    content_consumed_pct: float  # 0-1, fraction of assigned content opened

    # Behavioral
    attendance_rate: float       # 0-1, live session attendance (0 if async-only course)
    late_submissions: int        # count that week
    inactivity_streak_days: int  # consecutive inactive days as of week end
    resources_opened: int        # supplementary resources opened that week
    skipped_lessons: int         # lessons marked available but not opened

    @staticmethod
    def field_names() -> list[str]:
        return [f.name for f in fields(WeeklySnapshot)]


# Minimum number of trailing weekly snapshots the engine needs to compute
# trend/volatility features. Fewer than this and there isn't enough history
# to say anything about direction — the API should decline to score instead
# of guessing from a single data point.
MIN_HISTORY_WEEKS = 3

RISK_LEVELS = ("low", "medium", "high")
