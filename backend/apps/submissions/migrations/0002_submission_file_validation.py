import apps.submissions.models
import apps.submissions.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("submissions", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="submission",
            name="file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=apps.submissions.models.submission_upload_path,
                validators=[apps.submissions.validators.validate_submission_file],
            ),
        ),
    ]
