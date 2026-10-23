import apps.courses.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0002_alter_lesson_video_url_lessonattachment"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="thumbnail",
            field=models.ImageField(
                blank=True,
                help_text="Course cover image shown on the catalog and dashboard cards.",
                null=True,
                upload_to=apps.courses.models.course_cover_upload_path,
            ),
        ),
    ]
