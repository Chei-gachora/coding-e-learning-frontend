import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0005_activity_pass_percentage"),
        ("progress", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="VideoProgress",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position_seconds", models.FloatField(default=0)),
                ("duration_seconds", models.FloatField(default=0)),
                ("intervals", models.JSONField(default=list)),
                ("watched_seconds", models.FloatField(default=0)),
                ("completed", models.BooleanField(default=False)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("last_ping_at", models.DateTimeField(blank=True, null=True)),
                ("last_playing", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("lesson", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="video_progress", to="courses.lesson")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="video_progress", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("student", "lesson")}},
        ),
    ]
