from django.apps import AppConfig


class SequencingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sequencing"
    verbose_name = "Adaptive Sequencing Engine"
