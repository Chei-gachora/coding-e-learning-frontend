from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class UserAdminConfig(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Platform access", {"fields": ("role", "email_verified")}),
        ("Student profile", {"fields": ("bio", "profile_photo", "leaderboard_opt_in")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Platform access", {"fields": ("role", "email_verified")}),
    )
