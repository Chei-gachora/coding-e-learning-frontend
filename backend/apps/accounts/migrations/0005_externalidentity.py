# Provider identity links are stored separately from password credentials.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_user_is_approved"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalIdentity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(choices=[("google", "Google"), ("microsoft", "Microsoft"), ("apple", "Apple")], max_length=16)),
                ("subject", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="external_identities", to="accounts.user")),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("provider", "subject"), name="accounts_ext_provider_subject_uq"),
                    models.UniqueConstraint(fields=("user", "provider"), name="accounts_ext_user_provider_uq"),
                ],
            },
        ),
    ]
