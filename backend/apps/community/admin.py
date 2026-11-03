from django.contrib import admin

from .models import DiscussionReply, DiscussionThread, StudentBookmark


class DiscussionReplyInline(admin.TabularInline):
    model = DiscussionReply
    extra = 0
    readonly_fields = ("author", "created_at")


@admin.register(DiscussionThread)
class DiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "author", "created_at", "updated_at")
    list_filter = ("course", "created_at")
    search_fields = ("title", "body", "author__username", "course__title")
    inlines = (DiscussionReplyInline,)


@admin.register(StudentBookmark)
class StudentBookmarkAdmin(admin.ModelAdmin):
    list_display = ("student", "lesson", "created_at")
    list_filter = ("created_at",)
    search_fields = ("student__username", "lesson__title")


admin.site.register(DiscussionReply)
