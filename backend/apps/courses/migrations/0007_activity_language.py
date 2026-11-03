from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0006_course_publishing_and_video_uploads"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="language",
            field=models.CharField(
                choices=[("javascript", "JavaScript"), ("python", "Python")],
                default="javascript",
                max_length=20,
            ),
        ),
    ]
