from io import BytesIO
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from PIL import Image
from datetime import timedelta

from apps.accounts.models import User
from apps.accounts.testing import World, client_for
from apps.courses.models import Activity, Course, Lesson, LiveSession, Module
from apps.enrollment.models import Enrollment
from apps.progress.models import ActivityCompletion


def _image_upload(name):
    image = BytesIO()
    Image.new("RGB", (2, 2), color="navy").save(image, format="PNG")
    return SimpleUploadedFile(name, image.getvalue(), content_type="image/png")


class CourseThumbnailTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username="instructor1",
            email="instructor1@example.com",
            password="StrongPass123!",
            role="instructor",
        )

    def test_course_accepts_thumbnail_file(self):
        cover = _image_upload("cover.png")

        course = Course.objects.create(
            title="AI Foundations",
            description="Intro to modern AI",
            instructor=self.instructor,
            thumbnail=cover,
        )

        self.assertIn("cover", course.thumbnail.name)
        self.assertTrue(course.thumbnail.name.endswith(".png"))
        self.assertEqual(course.instructor, self.instructor)


class CourseBuilderApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.world = World()

    def setUp(self):
        self.instructor = client_for(self.world.instructor_a)
        self.student = client_for(self.world.student_1)
        self.admin = client_for(self.world.admin)

    def test_management_course_list_is_scoped_for_instructors_and_complete_for_admins(self):
        instructor_courses = self.instructor.get("/api/courses/?manage=true")
        self.assertEqual(instructor_courses.status_code, 200, instructor_courses.data)
        self.assertEqual(
            {item["id"] for item in instructor_courses.data},
            {self.world.course_a.id},
        )

        admin_courses = self.admin.get("/api/courses/?manage=true")
        self.assertEqual(admin_courses.status_code, 200, admin_courses.data)
        self.assertEqual(
            {item["id"] for item in admin_courses.data},
            {self.world.course_a.id, self.world.course_b.id},
        )
        admin_created = self.admin.post(
            "/api/courses/",
            {"title": "Admin-built course"},
            format="json",
        )
        self.assertEqual(admin_created.status_code, 201, admin_created.data)
        self.assertEqual(admin_created.data["status"], Course.Status.DRAFT)
        self.assertIn(
            admin_created.data["id"],
            {item["id"] for item in self.admin.get("/api/courses/?manage=true").data},
        )

    def test_instructor_can_replace_course_cover_with_multipart_put_for_student_catalog(self):
        course = self.world.course_a
        course.thumbnail = _image_upload("old-cover.png")
        course.save()

        replacement = _image_upload("new-cover.png")
        updated = self.instructor.put(
            f"/api/courses/{course.id}/",
            {"title": course.title, "description": course.description, "thumbnail": replacement},
            format="multipart",
        )

        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertIn("new-cover", updated.data["thumbnail"])
        self.assertTrue(updated.data["thumbnail"].endswith(".png"))
        self.assertIn("new-cover", updated.data["thumbnail_url"])
        self.assertTrue(updated.data["thumbnail_url"].endswith(".png"))

        catalog = self.student.get("/api/courses/")
        self.assertEqual(catalog.status_code, 200, catalog.data)
        catalog_course = next(item for item in catalog.data if item["id"] == course.id)
        self.assertEqual(catalog_course["thumbnail_url"], updated.data["thumbnail_url"])
        self.assertIn("new-cover", catalog_course["thumbnail_url"])

    def test_instructor_can_manage_course_catalog_metadata(self):
        course = self.world.course_a
        response = self.instructor.patch(
            f"/api/courses/{course.id}/",
            {
                "category": "Software development",
                "tags": ["JavaScript", "Web"],
                "difficulty": "intermediate",
                "estimated_duration_minutes": 480,
                "learning_outcomes": ["Build browser applications", "Use asynchronous JavaScript"],
                "prerequisites": "Basic computer skills",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["category"], "Software development")
        self.assertEqual(response.data["tags"], ["JavaScript", "Web"])
        self.assertEqual(response.data["difficulty"], "intermediate")
        self.assertEqual(response.data["estimated_duration_minutes"], 480)
        self.assertEqual(len(response.data["learning_outcomes"]), 2)
        self.assertEqual(response.data["prerequisites"], "Basic computer skills")
        self.assertEqual(
            self.instructor.patch(
                f"/api/courses/{course.id}/",
                {"tags": "not-a-list"},
                format="json",
            ).status_code,
            400,
        )

    def test_lesson_resource_supports_https_links_and_rejects_insecure_links(self):
        lesson_id = self.world.l1.id
        response = self.instructor.post(
            "/api/lesson-attachments/",
            {
                "lesson": lesson_id,
                "title": "Reference guide",
                "external_url": "https://example.com/guide",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["external_url"], "https://example.com/guide")
        self.assertIsNone(response.data["download_url"])
        self.assertEqual(
            self.instructor.post(
                "/api/lesson-attachments/",
                {
                    "lesson": lesson_id,
                    "title": "Insecure reference",
                    "external_url": "http://example.com/guide",
                },
                format="json",
            ).status_code,
            400,
        )

    def test_lesson_resources_accept_valid_pdf_and_zip_uploads(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            pdf = self.instructor.post(
                "/api/lesson-attachments/",
                {
                    "lesson": self.world.l1.id,
                    "title": "Course handout",
                    "file": SimpleUploadedFile(
                        "handout.pdf",
                        b"%PDF-1.7\nvalid test document",
                        content_type="application/pdf",
                    ),
                },
                format="multipart",
            )
            self.assertEqual(pdf.status_code, 201, pdf.data)
            self.assertEqual(pdf.data["file_name"], "handout.pdf")
            self.assertTrue(pdf.data["download_url"])

            archive = BytesIO()
            with ZipFile(archive, "w") as zip_file:
                zip_file.writestr("materials/readme.txt", "Course materials")
            uploaded_zip = self.instructor.post(
                "/api/lesson-attachments/",
                {
                    "lesson": self.world.l1.id,
                    "title": "Starter files",
                    "file": SimpleUploadedFile(
                        "starter.zip",
                        archive.getvalue(),
                        content_type="application/zip",
                    ),
                },
                format="multipart",
            )
            self.assertEqual(uploaded_zip.status_code, 201, uploaded_zip.data)
            self.assertEqual(uploaded_zip.data["file_name"], "starter.zip")

            invalid_zip = self.instructor.post(
                "/api/lesson-attachments/",
                {
                    "lesson": self.world.l1.id,
                    "title": "Invalid archive",
                    "file": SimpleUploadedFile(
                        "invalid.zip",
                        b"not a zip archive",
                        content_type="application/zip",
                    ),
                },
                format="multipart",
            )
            self.assertEqual(invalid_zip.status_code, 400, invalid_zip.data)

    def test_course_creation_defaults_to_draft_and_cannot_bypass_publish_checks(self):
        created = self.instructor.post(
            "/api/courses/",
            {"title": "New course", "description": "Build a curriculum."},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], Course.Status.DRAFT)
        self.assertNotIn(created.data["id"], {
            item["id"] for item in self.student.get("/api/courses/").data
        })

        bypassed = self.instructor.post(
            "/api/courses/",
            {"title": "Premature course", "status": Course.Status.PUBLISHED},
            format="json",
        )
        self.assertEqual(bypassed.status_code, 400, bypassed.data)
        admin_bypassed = self.admin.post(
            "/api/courses/",
            {"title": "Admin premature course", "status": Course.Status.PUBLISHED},
            format="json",
        )
        self.assertEqual(admin_bypassed.status_code, 400, admin_bypassed.data)

    def test_draft_stays_hidden_until_valid_course_is_published(self):
        draft = self.instructor.post("/api/courses/", {
            "title": "Python Foundations", "description": "Build practical Python skills.", "status": "draft",
        }, format="json")
        self.assertEqual(draft.status_code, 201, draft.data)
        course_id = draft.data["id"]
        self.assertNotIn(course_id, {item["id"] for item in self.student.get("/api/courses/").data})
        self.assertEqual(self.student.get(f"/api/courses/{course_id}/").status_code, 404)
        self.assertEqual(self.instructor.post(f"/api/courses/{course_id}/publish/").status_code, 400)

        module = self.instructor.post("/api/modules/", {
            "course": course_id, "title": "Getting Started", "order": 1,
        }, format="json")
        self.assertEqual(module.status_code, 201, module.data)
        self.assertEqual(self.instructor.post(f"/api/courses/{course_id}/publish/").status_code, 400)
        lesson = self.instructor.post("/api/lessons/", {
            "module": module.data["id"], "title": "Install Python", "order": 1,
            "video_url": "https://youtu.be/dQw4w9WgXcQ",
        }, format="json")
        self.assertEqual(lesson.status_code, 201, lesson.data)

        missing_quiz = self.instructor.post(f"/api/courses/{course_id}/publish/")
        self.assertEqual(missing_quiz.status_code, 400, missing_quiz.data)
        self.assertIn("quiz", str(missing_quiz.data).lower())

        activity = self.instructor.post("/api/activities/", {
            "lesson": lesson.data["id"],
            "activity_type": "quiz",
            "title": "Module assessment",
            "max_score": 1,
            "max_attempts": 2,
            "pass_percentage": 70,
            "is_required": True,
        }, format="json")
        self.assertEqual(activity.status_code, 201, activity.data)
        quiz = self.instructor.post("/api/quizzes/", {
            "activity": activity.data["id"],
            "time_limit_minutes": 15,
            "pass_mark_percentage": 70,
        }, format="json")
        self.assertEqual(quiz.status_code, 201, quiz.data)
        missing_question = self.instructor.post(f"/api/courses/{course_id}/publish/")
        self.assertEqual(missing_question.status_code, 400, missing_question.data)

        question = self.instructor.post("/api/quiz-questions/", {
            "quiz": quiz.data["id"],
            "text": "Which statement declares a constant?",
            "marks": 1,
            "choices": [{"text": "const value = 1"}, {"text": "value := 1"}],
            "correct_choice_index": 0,
        }, format="json")
        self.assertEqual(question.status_code, 201, question.data)
        published = self.instructor.post(f"/api/courses/{course_id}/publish/")
        self.assertEqual(published.status_code, 200, published.data)
        self.assertEqual(published.data["status"], Course.Status.PUBLISHED)
        self.assertEqual(self.student.get(f"/api/courses/{course_id}/").status_code, 200)

    def test_module_and_lesson_ordering_persist_and_require_full_permutation(self):
        course = Course.objects.create(title="Order test", instructor=self.world.instructor_a)
        modules = [
            Module.objects.create(course=course, title=f"Module {index}", order=index)
            for index in (1, 2, 3)
        ]
        response = self.instructor.post("/api/modules/reorder/", {
            "course": course.id, "module_ids": [modules[2].id, modules[0].id, modules[1].id],
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(Module.objects.filter(course=course).values_list("id", flat=True)), [modules[2].id, modules[0].id, modules[1].id])
        self.assertEqual(self.instructor.post("/api/modules/reorder/", {
            "course": course.id, "module_ids": [modules[0].id],
        }, format="json").status_code, 400)

        lesson_rows = [
            Lesson.objects.create(module=modules[0], title=f"Lesson {index}", order=index)
            for index in (1, 2, 3)
        ]
        response = self.instructor.post(f"/api/modules/{modules[0].id}/reorder-lessons/", {
            "lesson_ids": [lesson_rows[1].id, lesson_rows[2].id, lesson_rows[0].id],
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(Lesson.objects.filter(module=modules[0]).values_list("id", flat=True)), [lesson_rows[1].id, lesson_rows[2].id, lesson_rows[0].id])

    def test_deleting_module_cascades_lessons_and_activities(self):
        module = Module.objects.get(pk=self.world.m1.id)
        lesson_count = Lesson.objects.filter(module=module).count()
        activity_count = Activity.objects.filter(lesson__module=module).count()

        response = self.instructor.delete(f"/api/modules/{module.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Module.objects.filter(pk=module.id).exists())
        self.assertEqual(Lesson.objects.filter(module_id=module.id).count(), 0)
        self.assertGreater(lesson_count, 0)
        self.assertGreater(activity_count, 0)
        self.assertFalse(Activity.objects.filter(lesson__module_id=module.id).exists())

    def test_code_activity_language_is_configurable_and_visible_to_students(self):
        activity = self.world.exercise
        updated = self.instructor.patch(
            f"/api/activities/{activity.id}/",
            {"language": Activity.CodeLanguage.PYTHON},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["language"], Activity.CodeLanguage.PYTHON)

        visible_to_student = self.student.get(f"/api/activities/{activity.id}/")
        self.assertEqual(visible_to_student.status_code, 200, visible_to_student.data)
        self.assertEqual(visible_to_student.data["language"], Activity.CodeLanguage.PYTHON)

        html_activity = self.instructor.patch(
            f"/api/activities/{activity.id}/",
            {"language": Activity.CodeLanguage.HTML},
            format="json",
        )
        self.assertEqual(html_activity.status_code, 200, html_activity.data)
        self.assertEqual(html_activity.data["language"], Activity.CodeLanguage.HTML)
        self.assertEqual(
            self.student.get(f"/api/activities/{activity.id}/").data["language"],
            Activity.CodeLanguage.HTML,
        )
        for language in (
            Activity.CodeLanguage.C,
            Activity.CodeLanguage.CPP,
            Activity.CodeLanguage.JAVA,
        ):
            response = self.instructor.patch(
                f"/api/activities/{activity.id}/",
                {"language": language},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["language"], language)

    def test_student_activity_status_shows_completion_and_overdue_state(self):
        activity = self.world.exercise
        activity.deadline = timezone.now() - timedelta(hours=1)
        activity.save(update_fields=["deadline"])

        overdue = self.student.get(f"/api/activities/{activity.id}/")
        self.assertEqual(overdue.status_code, 200, overdue.data)
        self.assertEqual(overdue.data["completion_status"], "overdue")

        ActivityCompletion.objects.create(student=self.world.student_1, activity=activity)
        completed = self.student.get(f"/api/activities/{activity.id}/")
        self.assertEqual(completed.data["completion_status"], "completed")

    def test_uploaded_video_is_validated_and_served_with_byte_ranges(self):
        video = SimpleUploadedFile("lesson.mp4", b"\x00\x00\x00\x18ftypisom" + b"0" * 64, content_type="video/mp4")
        response = self.instructor.post("/api/lessons/", {
            "module": self.world.m1.id,
            "title": "Uploaded video",
            "order": 2,
            "video_file": video,
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["video_file_url"])
        lesson_id = response.data["id"]

        streamed = self.student.get(response.data["video_file_url"], HTTP_RANGE="bytes=0-7")
        self.assertEqual(streamed.status_code, 206)
        self.assertEqual(len(b"".join(streamed.streaming_content)), 8)
        self.assertEqual(streamed["Content-Range"], "bytes 0-7/76")
        self.assertEqual(client_for(self.world.outsider).get(response.data["video_file_url"]).status_code, 404)

        bad_video = SimpleUploadedFile("fake.mp4", b"not a video", content_type="video/mp4")
        rejected = self.instructor.post("/api/lessons/", {
            "module": self.world.m1.id,
            "title": "Invalid upload",
            "order": 3,
            "video_file": bad_video,
        }, format="multipart")
        self.assertEqual(rejected.status_code, 400)
        self.assertFalse(Lesson.objects.filter(pk=lesson_id + 1).exists())

    def test_instructor_manages_sessions_and_only_instructor_led_students_can_list(self):
        w = self.world
        starts_at = (timezone.now() + timedelta(days=2)).isoformat()
        response = self.instructor.post(
            "/api/live-sessions/",
            {
                "course": w.course_a.id,
                "title": "Weekly workshop",
                "starts_at": starts_at,
                "meeting_url": "https://meet.example.com/workshop",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        session_id = response.data["id"]
        self.assertEqual(self.student.get("/api/live-sessions/").data, [])
        Enrollment.objects.filter(student=w.student_1, course=w.course_a).update(
            learning_mode=Enrollment.LearningMode.INSTRUCTOR_LED
        )
        available = self.student.get(f"/api/live-sessions/?course={w.course_a.id}")
        self.assertEqual(available.status_code, 200, available.data)
        self.assertEqual([item["id"] for item in available.data], [session_id])
        self.assertEqual(
            client_for(w.instructor_b).delete(f"/api/live-sessions/{session_id}/").status_code,
            404,
        )

    def test_live_session_requires_secure_meeting_link_and_instructor_ownership(self):
        w = self.world
        payload = {
            "course": w.course_a.id,
            "title": "Weekly workshop",
            "starts_at": (timezone.now() + timedelta(days=2)).isoformat(),
            "meeting_url": "http://meet.example.com/workshop",
        }
        self.assertEqual(self.instructor.post("/api/live-sessions/", payload, format="json").status_code, 400)
        payload["meeting_url"] = "https://meet.example.com/workshop"
        self.assertEqual(
            client_for(w.instructor_b).post("/api/live-sessions/", payload, format="json").status_code,
            403,
        )
