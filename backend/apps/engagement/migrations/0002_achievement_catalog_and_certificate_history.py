from django.db import migrations


ACHIEVEMENTS = [
    ("first-steps", "First Steps", "Complete your first learning activity.", "badge", "activities", 1),
    ("getting-started", "Getting Started", "Complete 5 learning activities.", "badge", "activities", 5),
    ("in-the-flow", "In the Flow", "Complete 10 learning activities.", "badge", "activities", 10),
    ("activity-pro-25", "Activity Pro", "Complete 25 learning activities.", "milestone", "activities", 25),
    ("activity-pro-50", "Learning Leader", "Complete 50 learning activities.", "milestone", "activities", 50),
    ("course-graduate", "Course Graduate", "Complete your first course.", "milestone", "courses", 1),
    ("course-collector-3", "Course Collector", "Complete 3 courses.", "milestone", "courses", 3),
    ("course-collector-5", "Learning Scholar", "Complete 5 courses.", "milestone", "courses", 5),
    ("streak-3", "Three-Day Streak", "Study on 3 consecutive days.", "streak", "streak_days", 3),
    ("streak-7", "Week of Learning", "Study on 7 consecutive days.", "streak", "streak_days", 7),
    ("streak-30", "Monthly Momentum", "Study on 30 consecutive days.", "streak", "streak_days", 30),
]


def seed_achievements(apps, schema_editor):
    Achievement = apps.get_model("engagement", "Achievement")
    for code, name, description, category, metric, threshold in ACHIEVEMENTS:
        Achievement.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "description": description,
                "category": category,
                "metric": metric,
                "threshold": threshold,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("engagement", "0001_initial")]

    operations = [
        migrations.RemoveConstraint(
            model_name="certificate",
            name="uniq_student_course_certificate",
        ),
        migrations.RunPython(seed_achievements, migrations.RunPython.noop),
    ]