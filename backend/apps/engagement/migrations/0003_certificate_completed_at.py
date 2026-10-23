from django.db import migrations, models
from django.db.models import F


def backfill_completion_time(apps, schema_editor):
    Certificate = apps.get_model("engagement", "Certificate")
    Certificate.objects.filter(completed_at__isnull=True).update(
        completed_at=F("issued_at")
    )


class Migration(migrations.Migration):
    dependencies = [("engagement", "0002_achievement_catalog_and_certificate_history")]

    operations = [
        migrations.AddField(
            model_name="certificate",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_completion_time, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="certificate",
            name="completed_at",
            field=models.DateTimeField(),
        ),
    ]
