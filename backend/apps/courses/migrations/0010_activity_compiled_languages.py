from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0009_livesession"),
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
                    ("c", "C"),
                    ("cpp", "C++"),
                    ("java", "Java"),
                ],
                default="javascript",
                max_length=20,
            ),
        ),
    ]
