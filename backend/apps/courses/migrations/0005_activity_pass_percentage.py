import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0004_alter_course_thumbnail"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="pass_percentage",
            field=models.PositiveSmallIntegerField(
                default=50,
                help_text="Minimum grade, as a percentage of max_score, for a graded submission to count as complete "
                          "(and so unlock the next module). Quizzes use Quiz.pass_mark_percentage instead.",
                validators=[django.core.validators.MaxValueValidator(100)],
            ),
        ),
    ]
