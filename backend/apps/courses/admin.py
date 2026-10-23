from django.contrib import admin
from .models import Course, LiveSession, Module, Lesson, Activity, LessonAttachment

admin.site.register(Course)
admin.site.register(LiveSession)
admin.site.register(Module)
admin.site.register(Lesson)
admin.site.register(Activity)
admin.site.register(LessonAttachment)
