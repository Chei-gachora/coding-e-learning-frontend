from django.contrib import admin

from .models import Achievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "category", "metric", "threshold", "active")
    list_filter = ("active", "category", "metric")
    search_fields = ("name", "code", "description")
    ordering = ("category", "threshold", "name")
from django.contrib import admin

from .models import Organization, Team, TeamMembership


class TeamInline(admin.TabularInline):
    model = Team
    extra = 0


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "active")
    list_filter = ("active",)
    search_fields = ("name",)
    inlines = (TeamInline,)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "active")
    list_filter = ("active", "organization")
    search_fields = ("name", "organization__name")


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ("student", "team", "joined_at")
    list_filter = ("team__organization", "team")
    search_fields = ("student__username", "student__email", "student__first_name", "student__last_name")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "student":
            from apps.accounts.models import User, Role

            kwargs["queryset"] = User.objects.filter(role=Role.STUDENT)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
