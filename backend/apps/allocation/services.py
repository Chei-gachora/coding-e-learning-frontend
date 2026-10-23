"""
Course & Resource Allocation Optimization Algorithm.

What this optimizes: instructor workload balance across courses, and
where enrollment demand has outgrown a single instructor's realistic
capacity. This is a **greedy load-balancing heuristic**, not a trained
model — deliberately. There's no historical "was this allocation good or
bad" outcome data to train against, and an admin needs to see *why* a
recommendation was made (which numbers, which threshold) to trust and act
on it. A transparent scoring formula beats an opaque model here, the same
way it does for the sequencing engine.

The algorithm, in three steps:

  1. Score every instructor's current load:
       load = Σ over their courses of
              (enrolled_students × ENROLLMENT_WEIGHT)
            + (pending_submissions × GRADING_WEIGHT)
     Grading backlog is weighted in alongside raw headcount because two
     instructors with the same enrollment count can have very different
     real workloads if one has a pile of ungraded submissions.

  2. Compare each instructor's load to the platform average. Anyone above
     OVERLOAD_FACTOR × average is "overloaded"; anyone below
     1/OVERLOAD_FACTOR × average (with room to spare) is "has capacity".

  3. Generate concrete recommendations:
       - single_course_overload: one course alone exceeds
         MAX_STUDENTS_PER_INSTRUCTOR — needs a second instructor/section
         regardless of that instructor's other courses.
       - rebalance: an overloaded instructor has a course that could
         reasonably move to (or be co-taught with) an instructor who has
         capacity.
       - backlog: an instructor's grading backlog alone is driving their
         load past the threshold, independent of enrollment — points at
         a grading-support problem, not a course-count problem.

Every recommendation carries the exact numbers behind it, so "why is the
system telling me this" is always answerable from the response body
alone.
"""
from __future__ import annotations

ENROLLMENT_WEIGHT = 1.0
GRADING_WEIGHT = 2.5  # an ungraded submission costs more instructor time than one more enrolled student
OVERLOAD_FACTOR = 1.35  # load > 1.35x the platform average -> overloaded
CAPACITY_FACTOR = 0.7  # load < 0.7x the platform average -> has room
MAX_STUDENTS_PER_INSTRUCTOR = 40  # a single course past this needs a second instructor, no matter what


def _pending_submissions_by_course():
    from apps.submissions.models import Submission, SubmissionStatus

    counts: dict[int, int] = {}
    rows = (
        Submission.objects.filter(status=SubmissionStatus.SUBMITTED)
        .values_list("activity__lesson__module__course_id", flat=True)
    )
    for course_id in rows:
        counts[course_id] = counts.get(course_id, 0) + 1
    return counts


def _enrollment_counts_by_course():
    from apps.enrollment.models import Enrollment
    from django.db.models import Count

    return {
        row["course"]: row["n"]
        for row in Enrollment.objects.values("course").annotate(n=Count("id"))
    }


def compute_course_metrics() -> list[dict]:
    from apps.courses.models import Course

    enrollment_counts = _enrollment_counts_by_course()
    pending_counts = _pending_submissions_by_course()

    courses = []
    for course in Course.objects.select_related("instructor"):
        enrolled = enrollment_counts.get(course.id, 0)
        pending = pending_counts.get(course.id, 0)
        load = enrolled * ENROLLMENT_WEIGHT + pending * GRADING_WEIGHT
        courses.append({
            "course_id": course.id,
            "course_title": course.title,
            "instructor_id": course.instructor_id,
            "instructor_name": course.instructor.get_full_name() or course.instructor.username,
            "enrolled": enrolled,
            "pending_submissions": pending,
            "load": round(load, 1),
        })
    return courses


def compute_instructor_loads(course_metrics: list[dict]) -> list[dict]:
    by_instructor: dict[int, dict] = {}
    for c in course_metrics:
        entry = by_instructor.setdefault(c["instructor_id"], {
            "instructor_id": c["instructor_id"],
            "instructor_name": c["instructor_name"],
            "courses": [],
            "total_enrolled": 0,
            "total_pending": 0,
            "load": 0.0,
        })
        entry["courses"].append(c["course_title"])
        entry["total_enrolled"] += c["enrolled"]
        entry["total_pending"] += c["pending_submissions"]
        entry["load"] += c["load"]

    loads = list(by_instructor.values())
    for entry in loads:
        entry["load"] = round(entry["load"], 1)
    return sorted(loads, key=lambda e: e["load"], reverse=True)


def build_recommendations(course_metrics: list[dict], instructor_loads: list[dict]) -> list[dict]:
    if not instructor_loads:
        return []

    average_load = sum(i["load"] for i in instructor_loads) / len(instructor_loads)
    overloaded = [i for i in instructor_loads if average_load > 0 and i["load"] > OVERLOAD_FACTOR * average_load]
    has_capacity = sorted(
        [i for i in instructor_loads if average_load > 0 and i["load"] < CAPACITY_FACTOR * average_load],
        key=lambda i: i["load"],
    )

    recommendations = []

    # 1. Any single course past the hard cap, independent of averages.
    for c in course_metrics:
        if c["enrolled"] > MAX_STUDENTS_PER_INSTRUCTOR:
            recommendations.append({
                "type": "single_course_overload",
                "priority": "high",
                "course_title": c["course_title"],
                "instructor_name": c["instructor_name"],
                "reason": (
                    f"\"{c['course_title']}\" has {c['enrolled']} enrolled students under one instructor — "
                    f"past the {MAX_STUDENTS_PER_INSTRUCTOR}-student guideline for a single instructor. "
                    f"Open a second section or assign a co-instructor."
                ),
                "metrics": {"enrolled": c["enrolled"], "cap": MAX_STUDENTS_PER_INSTRUCTOR},
            })

    # 2. Overloaded instructors — try to name a specific course to move
    #    and a specific instructor with room, so this is actionable rather
    #    than just a warning.
    for over in overloaded:
        heaviest_course = max(
            (c for c in course_metrics if c["instructor_id"] == over["instructor_id"]),
            key=lambda c: c["load"],
            default=None,
        )
        if heaviest_course is None:
            continue

        target = has_capacity[0] if has_capacity else None
        if over["total_pending"] >= over["total_enrolled"] * 0.3 and over["total_pending"] >= 5:
            recommendations.append({
                "type": "backlog",
                "priority": "high" if over["load"] > 2 * average_load else "medium",
                "instructor_name": over["instructor_name"],
                "reason": (
                    f"{over['instructor_name']} has {over['total_pending']} submissions awaiting grading across "
                    f"{len(over['courses'])} course(s) — that backlog, not enrollment size, is the main driver of "
                    f"their load ({over['load']} vs a platform average of {round(average_load, 1)}). "
                    f"Consider temporary grading support or an extended review deadline."
                ),
                "metrics": {"load": over["load"], "average_load": round(average_load, 1), "pending": over["total_pending"]},
            })
        elif target is not None:
            recommendations.append({
                "type": "rebalance",
                "priority": "medium",
                "course_title": heaviest_course["course_title"],
                "from_instructor": over["instructor_name"],
                "to_instructor": target["instructor_name"],
                "reason": (
                    f"{over['instructor_name']}'s load ({over['load']}) is "
                    f"{round(over['load'] / average_load, 1)}x the platform average ({round(average_load, 1)}), "
                    f"driven partly by \"{heaviest_course['course_title']}\" ({heaviest_course['enrolled']} students). "
                    f"{target['instructor_name']} currently has the most spare capacity (load {target['load']}) — "
                    f"consider co-assigning or transferring this course to them."
                ),
                "metrics": {
                    "from_load": over["load"], "to_load": target["load"], "average_load": round(average_load, 1),
                },
            })
        else:
            recommendations.append({
                "type": "rebalance",
                "priority": "medium",
                "course_title": heaviest_course["course_title"],
                "from_instructor": over["instructor_name"],
                "to_instructor": None,
                "reason": (
                    f"{over['instructor_name']}'s load ({over['load']}) is well above the platform average "
                    f"({round(average_load, 1)}), but no other instructor currently has meaningful spare capacity — "
                    f"this points at hiring/onboarding a new instructor rather than reallocating an existing one."
                ),
                "metrics": {"load": over["load"], "average_load": round(average_load, 1)},
            })

    recommendations.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}[r["priority"]])
    return recommendations


def get_allocation_plan() -> dict:
    course_metrics = compute_course_metrics()
    instructor_loads = compute_instructor_loads(course_metrics)
    recommendations = build_recommendations(course_metrics, instructor_loads)
    average_load = round(sum(i["load"] for i in instructor_loads) / len(instructor_loads), 1) if instructor_loads else 0

    return {
        "average_instructor_load": average_load,
        "instructor_loads": instructor_loads,
        "course_metrics": course_metrics,
        "recommendations": recommendations,
    }
