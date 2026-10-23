from django.test import TestCase

from apps.accounts.testing import World, client_for
from .models import DiscussionReply, DiscussionThread, StudentBookmark


class StudentCommunityApiTests(TestCase):
    def setUp(self):
        self.world = World()
        self.student = client_for(self.world.student_1)
        self.other_student = client_for(self.world.outsider)

    def test_enrolled_student_can_create_and_reply_to_course_discussion(self):
        thread_response = self.student.post(
            "/api/community/discussions/",
            {
                "course": self.world.course_a.id,
                "title": "Where should I start?",
                "body": "I would appreciate a learning-path recommendation.",
            },
            format="json",
        )

        self.assertEqual(thread_response.status_code, 201)
        thread_id = thread_response.data["id"]
        reply_response = self.student.post(
            f"/api/community/discussions/{thread_id}/replies/",
            {"body": "Start with the first module."},
            format="json",
        )

        self.assertEqual(reply_response.status_code, 201)
        self.assertEqual(reply_response.data["body"], "Start with the first module.")
        self.assertEqual(reply_response.data["author_id"], self.world.student_1.id)
        self.assertEqual(thread_response.data["author_id"], self.world.student_1.id)
        self.assertEqual(DiscussionThread.objects.get(pk=thread_id).replies.count(), 1)

    def test_author_can_delete_own_discussion_and_reply(self):
        thread = DiscussionThread.objects.create(
            course=self.world.course_a,
            author=self.world.student_1,
            title="My thread",
            body="Please remove this.",
        )
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.world.student_1,
            body="My reply",
        )
        reply_response = self.student.delete(
            f"/api/community/discussions/{thread.id}/replies/{reply.id}/"
        )
        thread_response = self.student.delete(
            f"/api/community/discussions/{thread.id}/"
        )

        self.assertEqual(reply_response.status_code, 204)
        self.assertEqual(thread_response.status_code, 204)
        self.assertFalse(DiscussionThread.objects.filter(pk=thread.id).exists())
        self.assertFalse(DiscussionReply.objects.filter(pk=reply.id).exists())

    def test_other_student_cannot_delete_discussion_or_reply(self):
        thread = DiscussionThread.objects.create(
            course=self.world.course_a,
            author=self.world.student_1,
            title="Another student's thread",
            body="Keep this.",
        )
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.world.student_1,
            body="Keep this reply.",
        )
        reply_response = self.other_student.delete(
            f"/api/community/discussions/{thread.id}/replies/{reply.id}/"
        )
        thread_response = self.other_student.delete(
            f"/api/community/discussions/{thread.id}/"
        )

        self.assertEqual(reply_response.status_code, 404)
        self.assertEqual(thread_response.status_code, 404)
        self.assertTrue(DiscussionReply.objects.filter(pk=reply.id).exists())
        self.assertTrue(DiscussionThread.objects.filter(pk=thread.id).exists())

    def test_discussion_author_cannot_delete_another_students_reply(self):
        thread = DiscussionThread.objects.create(
            course=self.world.course_a,
            author=self.world.student_1,
            title="My discussion",
            body="A learner is replying.",
        )
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.world.outsider,
            body="Another learner's reply.",
        )

        response = self.student.delete(
            f"/api/community/discussions/{thread.id}/replies/{reply.id}/"
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(DiscussionReply.objects.filter(pk=reply.id).exists())

    def test_course_instructor_can_moderate_discussion_and_reply(self):
        thread = DiscussionThread.objects.create(
            course=self.world.course_a,
            author=self.world.student_1,
            title="Learner thread",
            body="Needs moderation.",
        )
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.world.student_1,
            body="Learner reply",
        )
        instructor = client_for(self.world.instructor_a)
        reply_response = instructor.delete(
            f"/api/community/discussions/{thread.id}/replies/{reply.id}/"
        )
        thread_response = instructor.delete(
            f"/api/community/discussions/{thread.id}/"
        )

        self.assertEqual(reply_response.status_code, 204)
        self.assertEqual(thread_response.status_code, 204)

    def test_admin_can_moderate_discussions(self):
        thread = DiscussionThread.objects.create(
            course=self.world.course_b,
            author=self.world.instructor_b,
            title="Course discussion",
            body="Needs platform moderation.",
        )
        admin = client_for(self.world.admin)

        response = admin.delete(f"/api/community/discussions/{thread.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(DiscussionThread.objects.filter(pk=thread.id).exists())

    def test_student_cannot_post_to_or_read_a_non_enrolled_course_discussion(self):
        post_response = self.student.post(
            "/api/community/discussions/",
            {
                "course": self.world.course_b.id,
                "title": "Question",
                "body": "This course is not in my enrollments.",
            },
            format="json",
        )
        thread = DiscussionThread.objects.create(
            course=self.world.course_b,
            author=self.world.instructor_b,
            title="Course B thread",
            body="Only enrolled students should see this.",
        )
        detail_response = self.student.get(
            f"/api/community/discussions/{thread.id}/"
        )

        self.assertEqual(post_response.status_code, 403)
        self.assertEqual(detail_response.status_code, 404)

    def test_student_can_bookmark_and_remove_an_unlocked_lesson(self):
        response = self.student.post(
            "/api/community/bookmarks/",
            {"lesson": self.world.l1.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["lesson_title"], self.world.l1.title)
        self.assertEqual(self.student.get("/api/community/bookmarks/").data[0]["id"], response.data["id"])
        self.assertEqual(
            self.student.delete(f"/api/community/bookmarks/{response.data['id']}/").status_code,
            204,
        )
        self.assertFalse(StudentBookmark.objects.filter(student=self.world.student_1).exists())

    def test_bookmark_is_idempotent_and_locked_lessons_are_not_exposed(self):
        first = self.student.post(
            "/api/community/bookmarks/",
            {"lesson": self.world.l1.id},
            format="json",
        )
        second = self.student.post(
            "/api/community/bookmarks/",
            {"lesson": self.world.l1.id},
            format="json",
        )
        locked = self.student.post(
            "/api/community/bookmarks/",
            {"lesson": self.world.l2.id},
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(locked.status_code, 403)
        self.assertEqual(StudentBookmark.objects.filter(student=self.world.student_1).count(), 1)

    def test_bookmarks_are_private_to_the_owner(self):
        bookmark = StudentBookmark.objects.create(
            student=self.world.student_1,
            lesson=self.world.l1,
        )

        response = self.other_student.delete(
            f"/api/community/bookmarks/{bookmark.id}/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(StudentBookmark.objects.filter(pk=bookmark.id).exists())
