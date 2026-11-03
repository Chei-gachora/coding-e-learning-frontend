from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0007_activity_language"),
    ]

    operations = [
        migrations.AlterField(
            model_name="activity",
            name="language",
            field=models.CharField(
                choices=[
                    ("javascript", "JavaScript"),
                    ("python", "Python"),
                    ("html", "HTML"),
                ],
                default="javascript",
                max_length=20,
            ),
        ),
    ]
