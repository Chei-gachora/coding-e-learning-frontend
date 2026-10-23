from rest_framework import serializers

from .models import DiscussionReply, DiscussionThread, StudentBookmark


class StudentBookmarkSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    course_title = serializers.CharField(
        source="lesson.module.course.title", read_only=True
    )
    course_id = serializers.IntegerField(
        source="lesson.module.course_id", read_only=True
    )

    class Meta:
        model = StudentBookmark
        fields = (
            "id",
            "lesson",
            "lesson_title",
            "course_id",
            "course_title",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class DiscussionReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiscussionReply
        fields = ("id", "author_id", "author_name", "body", "created_at")
        read_only_fields = ("id", "author_id", "author_name", "created_at")

    def get_author_name(self, obj: DiscussionReply) -> str:
        return obj.author.get_full_name() or obj.author.username


class DiscussionThreadSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_id = serializers.IntegerField(read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    replies = DiscussionReplySerializer(many=True, read_only=True)

    class Meta:
        model = DiscussionThread
        fields = (
            "id",
            "course",
            "course_title",
            "author_id",
            "author_name",
            "title",
            "body",
            "created_at",
            "updated_at",
            "replies",
        )
        read_only_fields = ("id", "author_id", "author_name", "course_title", "created_at", "updated_at", "replies")

    def get_author_name(self, obj: DiscussionThread) -> str:
        return obj.author.get_full_name() or obj.author.username
