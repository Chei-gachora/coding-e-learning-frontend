from datetime import timedelta
from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone

from apps.accounts.testing import World, client_for
from apps.courses.models import LiveSession
from apps.engagement.models import (
    Achievement,
    Certificate,
    LearningActivityDay,
    Notification,
    Organization,
    StudentAchievement,
    StudentStreak,
    Team,
    TeamMembership,
)
from apps.engagement.services import record_activity_completion, revoke_certificate
from apps.enrollment.models import Enrollment
from apps.progress.services import mark_activity_complete


class EngagementEventTests(TestCase):
    def setUp(self):
        self.world = World()

    def test_first_completion_updates_streak_award_certificate_and_notification(self):
        w = self.world

        mark_activity_complete(w.student_1, w.exercise, score=90)
        mark_activity_complete(w.student_1, w.locked_activity, score=90)
        mark_activity_complete(w.student_1, w.exercise, score=95)

        streak = StudentStreak.objects.get(student=w.student_1)
        self.assertEqual((streak.current_days, streak.longest_days), (1, 1))
        self.assertEqual(LearningActivityDay.objects.filter(student=w.student_1).count(), 1)
        self.assertSetEqual(
            set(
                StudentAchievement.objects.filter(student=w.student_1)
                .values_list("achievement__code", flat=True)
            ),
            {"first-steps", "course-graduate"},
        )
        certificate = Certificate.objects.get(student=w.student_1, course=w.course_a)
        self.assertEqual(certificate.status, Certificate.Status.ISSUED)
        self.assertIsNotNone(certificate.completed_at)
        self.assertLessEqual(certificate.completed_at, certificate.issued_at)
        self.assertEqual(
            Notification.objects.filter(recipient=w.student_1, kind="achievement_earned").count(),
            2,
        )

    def test_activity_completion_only_awards_the_affected_student(self):
        w = self.world
        record_activity_completion(w.student_1, w.exercise)

        self.assertTrue(StudentStreak.objects.filter(student=w.student_1).exists())
        self.assertFalse(StudentStreak.objects.filter(student=w.student_2).exists())
        self.assertFalse(Certificate.objects.filter(student=w.student_2).exists())


class EngagementApiTests(TestCase):
    def setUp(self):
        self.world = World()
        self.student = client_for(self.world.student_1)
        self.other_student = client_for(self.world.student_2)
        self.instructor = client_for(self.world.instructor_a)
        self.anonymous = client_for()

    def test_student_engagement_includes_awarded_and_unearned_achievements(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)

        response = self.student.get("/api/engagement/me/")

        self.assertEqual(response.status_code, 200)
        first_steps = next(item for item in response.data["achievements"] if item["code"] == "first-steps")
        self.assertIsNotNone(first_steps["earned_at"])
        self.assertEqual(first_steps["progress"], 1)
        self.assertEqual(first_steps["progress_percent"], 100)
        getting_started = next(
            item for item in response.data["achievements"]
            if item["code"] == "getting-started"
        )
        self.assertIsNone(getting_started["earned_at"])
        self.assertEqual(getting_started["progress"], 2)
        self.assertEqual(getting_started["progress_percent"], 40)
        course_graduate = next(
            item for item in response.data["achievements"]
            if item["code"] == "course-graduate"
        )
        self.assertEqual(course_graduate["progress"], 1)
        self.assertEqual(course_graduate["progress_percent"], 100)
        streak_badge = next(
            item for item in response.data["achievements"]
            if item["code"] == "streak-3"
        )
        self.assertEqual(streak_badge["progress"], 1)
        self.assertEqual(streak_badge["progress_percent"], 33)
        self.assertEqual(response.data["current_streak"], 1)
        self.assertEqual(response.data["certificates"][0]["status"], Certificate.Status.ISSUED)
        self.assertEqual(response.data["xp"], 120)
        self.assertEqual(response.data["xp_to_next_reward"], 130)
        self.assertIn(timezone.localdate().isoformat(), response.data["activity_days"])

    def test_student_can_update_own_profile_and_leaderboard_preference(self):
        response = self.student.patch(
            "/api/auth/me/",
            {
                "bio": "Building useful software.",
                "leaderboard_opt_in": True,
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["bio"], "Building useful software.")
        self.assertTrue(response.data["leaderboard_opt_in"])
        self.assertEqual(response.data["role"], "student")
        self.world.student_1.refresh_from_db()
        self.assertEqual(self.world.student_1.bio, "Building useful software.")

    def test_profile_photo_is_private_and_requires_authentication(self):
        image_file = BytesIO()
        Image.new("RGB", (1, 1), color="blue").save(image_file, format="PNG")
        image_content = image_file.getvalue()

        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.student.patch(
                "/api/auth/me/",
                {
                    "profile_photo": SimpleUploadedFile(
                        "avatar.png",
                        image_content,
                        content_type="image/png",
                    )
                },
                format="multipart",
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertTrue(response.data["profile_photo"].startswith("/auth/me/profile-photo/"))

            photo_response = self.student.get("/api/auth/me/profile-photo/")
            self.assertEqual(photo_response.status_code, 200)
            self.assertEqual(b"".join(photo_response.streaming_content), image_content)
            self.assertEqual(photo_response["Cache-Control"], "private, no-store")
            self.assertEqual(photo_response["X-Content-Type-Options"], "nosniff")
            self.assertEqual(
                self.anonymous.get("/api/auth/me/profile-photo/").status_code,
                401,
            )

    def test_team_and_organization_leaderboards_include_only_opted_in_students(self):
        org = Organization.objects.create(name="North Campus")
        team = Team.objects.create(organization=org, name="Blue")
        TeamMembership.objects.create(team=team, student=self.world.student_1)
        TeamMembership.objects.create(team=team, student=self.world.student_2)
        self.world.student_1.leaderboard_opt_in = True
        self.world.student_1.save(update_fields=["leaderboard_opt_in"])
        self.world.student_2.leaderboard_opt_in = True
        self.world.student_2.save(update_fields=["leaderboard_opt_in"])
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)
        mark_activity_complete(self.world.student_2, self.world.exercise, score=90)

        team_response = self.student.get("/api/engagement/leaderboard/?scope=team")
        org_response = self.student.get("/api/engagement/leaderboard/?scope=organization")

        self.assertEqual(team_response.status_code, 200)
        self.assertEqual(org_response.status_code, 200)
        self.assertEqual(team_response.data["team_name"], "Blue")
        self.assertEqual(team_response.data["organization_name"], "North Campus")
        self.assertEqual(len(team_response.data["participants"]), 2)
        self.assertEqual(team_response.data["viewer_rank"], 1)
        self.assertEqual(org_response.data["participants"], team_response.data["participants"])

    def test_leaderboard_is_unavailable_without_admin_assignment(self):
        response = self.student.get("/api/engagement/leaderboard/?scope=team")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["available"])
        self.assertEqual(response.data["participants"], [])

    def test_leaderboard_rejects_non_students_and_invalid_scopes(self):
        self.assertEqual(
            self.instructor.get("/api/engagement/leaderboard/").status_code,
            403,
        )
        self.assertEqual(
            self.student.get("/api/engagement/leaderboard/?scope=everyone").status_code,
            400,
        )

    def test_historical_course_award_keeps_progress_complete(self):
        course_achievement = Achievement.objects.get(code="course-graduate")
        StudentAchievement.objects.create(
            student=self.world.student_1,
            achievement=course_achievement,
        )

        response = self.student.get("/api/engagement/me/")
        course_graduate = next(
            item for item in response.data["achievements"]
            if item["code"] == "course-graduate"
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(course_graduate["earned_at"])
        self.assertEqual(course_graduate["progress"], course_graduate["threshold"])
        self.assertEqual(course_graduate["progress_percent"], 100)

    def test_notifications_are_private_and_read_state_is_idempotent(self):
        notification = Notification.objects.create(
            recipient=self.world.student_1,
            kind="test",
            title="Private",
            message="For one learner",
        )

        self.assertEqual(self.other_student.get("/api/engagement/notifications/").data["results"], [])
        self.assertEqual(
            self.other_student.patch(f"/api/engagement/notifications/{notification.id}/read/").status_code,
            404,
        )
        marked = self.student.patch(f"/api/engagement/notifications/{notification.id}/read/")
        self.assertEqual(marked.status_code, 200)
        self.assertIsNotNone(marked.data["read_at"])
        self.assertEqual(self.student.patch(f"/api/engagement/notifications/{notification.id}/read/").status_code, 200)

    def test_live_session_reminders_are_sent_once_at_24_hours_and_one_hour(self):
        w = self.world
        Enrollment.objects.filter(student=w.student_1, course=w.course_a).update(
            learning_mode=Enrollment.LearningMode.INSTRUCTOR_LED
        )
        session = LiveSession.objects.create(
            course=w.course_a,
            title="Live workshop",
            starts_at=timezone.now() + timedelta(hours=12),
            meeting_url="https://meet.example.com/workshop",
        )

        first = self.student.get("/api/engagement/notifications/")
        repeated = self.student.get("/api/engagement/notifications/")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(
            Notification.objects.filter(
                recipient=w.student_1,
                kind="live_session_reminder",
            ).count(),
            1,
        )
        self.assertEqual(
            Notification.objects.filter(
                recipient=w.student_2,
                kind="live_session_reminder",
            ).count(),
            0,
        )

        session.starts_at = timezone.now() + timedelta(minutes=30)
        session.save(update_fields=["starts_at"])
        near_session = self.student.get("/api/engagement/notifications/")

        self.assertEqual(near_session.status_code, 200)
        self.assertEqual(
            Notification.objects.filter(
                recipient=w.student_1,
                kind="live_session_reminder",
            ).count(),
            2,
        )

    def test_student_can_download_issued_certificate_but_not_revoke_it(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)
        certificate = Certificate.objects.get(student=self.world.student_1, course=self.world.course_a)

        downloaded = self.student.get(
            f"/api/engagement/certificates/{certificate.certificate_number}/download/"
        )

        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(downloaded["Content-Type"], "application/pdf")
        self.assertEqual(downloaded["Cache-Control"], "private, no-store")
        self.assertTrue(downloaded.content.startswith(b"%PDF-"))
        self.assertGreater(len(downloaded.content), 10_000)
        self.assertEqual(
            self.student.post(
                f"/api/engagement/certificates/{certificate.certificate_number}/revoke/",
                {"reason": "test"},
                format="json",
            ).status_code,
            403,
        )

    def test_certificate_qr_destination_verifies_publicly_without_exposing_user_ids(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)
        certificate = Certificate.objects.get(student=self.world.student_1, course=self.world.course_a)

        response = self.anonymous.get(
            f"/api/engagement/certificates/{certificate.certificate_number}/verify/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertTrue(response.data["verified"])
        self.assertEqual(response.data["student_name"], self.world.student_1.get_full_name() or self.world.student_1.username)
        self.assertEqual(response.data["course_title"], self.world.course_a.title)
        self.assertEqual(response.data["certificate_number"], str(certificate.certificate_number))
        self.assertEqual(
            response.data["completed_on"],
            timezone.localtime(certificate.completed_at).date().isoformat(),
        )
        self.assertNotIn("student_id", response.data)
        self.assertNotIn("revocation_reason", response.data)

    def test_public_certificate_verification_marks_revoked_certificates_invalid(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)
        certificate = Certificate.objects.get(student=self.world.student_1, course=self.world.course_a)
        revoke_certificate(certificate, "Completion was awarded in error.", self.world.instructor_a)

        response = self.anonymous.get(
            f"/api/engagement/certificates/{certificate.certificate_number}/verify/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["verified"])
        self.assertEqual(response.data["status"], Certificate.Status.REVOKED)

    def test_public_certificate_verification_returns_not_found_for_unknown_id(self):
        response = self.anonymous.get(
            "/api/engagement/certificates/00000000-0000-0000-0000-000000000000/verify/"
        )

        self.assertEqual(response.status_code, 404)

    def test_instructor_can_revoke_and_student_sees_revocation(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)
        certificate = Certificate.objects.get(student=self.world.student_1, course=self.world.course_a)

        response = self.instructor.post(
            f"/api/engagement/certificates/{certificate.certificate_number}/revoke/",
            {"reason": "Completion was awarded in error."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Certificate.Status.REVOKED)
        self.assertEqual(response.data["revocation_reason"], "Completion was awarded in error.")
        self.assertEqual(
            self.student.get(
                f"/api/engagement/certificates/{certificate.certificate_number}/download/"
            ).status_code,
            400,
        )

    def test_certificate_issue_requires_completion_and_student_enrollment(self):
        response = self.instructor.post(
            "/api/engagement/certificates/issue/",
            {"course_id": self.world.course_a.id, "student_id": self.world.student_1.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Certificate.objects.exists())

    def test_instructor_can_list_only_certificates_for_owned_course(self):
        mark_activity_complete(self.world.student_1, self.world.exercise, score=90)
        mark_activity_complete(self.world.student_1, self.world.locked_activity, score=90)

        response = self.instructor.get(
            f"/api/engagement/certificates/?course_id={self.world.course_a.id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student_id"], self.world.student_1.id)
        self.assertEqual(
            self.other_student.get(
                f"/api/engagement/certificates/?course_id={self.world.course_a.id}"
            ).status_code,
            403,
        )