from datetime import timedelta

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    inline_serializer,
)

from apps.accounts.access import ADMIN, INSTRUCTOR, STUDENT, role_of, require_teaches
from apps.courses.models import Course
from apps.enrollment.models import Enrollment
from apps.progress.models import ActivityCompletion
from apps.progress.services import is_course_complete

from .certificate_pdf import certificate_completion_date, render_certificate
from .models import (
    Achievement,
    Certificate,
    LearningActivityDay,
    Notification,
    StudentAchievement,
    StudentStreak,
    TeamMembership,
)
from .serializers import CertificateSerializer, NotificationSerializer
from .services import (
    create_due_live_session_reminders,
    calculate_learning_xp,
    issue_certificate,
    revoke_certificate,
    xp_reward_progress,
)


class StudentEngagementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="StudentEngagement",
            fields={
                "current_streak": serializers.IntegerField(),
                "longest_streak": serializers.IntegerField(),
                "xp": serializers.IntegerField(),
                "next_reward_at": serializers.IntegerField(),
                "xp_to_next_reward": serializers.IntegerField(),
                "reward_progress_percent": serializers.IntegerField(),
                "activity_days": serializers.ListField(child=serializers.DateField()),
                "achievements": inline_serializer(
                    name="StudentAchievement",
                    many=True,
                    fields={
                        "code": serializers.CharField(),
                        "name": serializers.CharField(),
                        "description": serializers.CharField(),
                        "category": serializers.CharField(),
                        "metric": serializers.CharField(),
                        "threshold": serializers.IntegerField(),
                        "progress": serializers.IntegerField(),
                        "progress_percent": serializers.IntegerField(),
                        "earned_at": serializers.DateTimeField(allow_null=True),
                    },
                ),
                "certificates": CertificateSerializer(many=True),
            },
        )
    )
    def get(self, request):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Student engagement data is only available to students.")

        streak = StudentStreak.objects.filter(student=request.user).first()
        current_streak = 0
        if streak and streak.last_activity_date and streak.last_activity_date >= timezone.localdate() - timedelta(days=1):
            current_streak = streak.current_days
        completed_activities = ActivityCompletion.objects.filter(
            student=request.user
        ).count()
        completed_courses = sum(
            1
            for enrollment in Enrollment.objects.filter(
                student=request.user
            ).select_related("course")
            if enrollment.course.modules.exists()
            and is_course_complete(request.user, enrollment.course)
        )
        metric_values = {
            Achievement.Metric.ACTIVITIES: completed_activities,
            Achievement.Metric.COURSES: completed_courses,
            Achievement.Metric.STREAK_DAYS: current_streak,
        }
        awards = {
            item.achievement_id: item.earned_at
            for item in StudentAchievement.objects.filter(student=request.user)
        }
        achievements = []
        for achievement in Achievement.objects.filter(active=True):
            progress = metric_values[achievement.metric]
            earned_at = awards.get(achievement.id)
            if earned_at:
                progress = max(progress, achievement.threshold)
            progress = min(progress, achievement.threshold)
            achievements.append({
                "code": achievement.code,
                "name": achievement.name,
                "description": achievement.description,
                "category": achievement.category,
                "metric": achievement.metric,
                "threshold": achievement.threshold,
                "progress": progress,
                "progress_percent": round(progress / achievement.threshold * 100),
                "earned_at": earned_at,
            })
        certificates = Certificate.objects.filter(student=request.user).select_related("course")
        xp = calculate_learning_xp([request.user.id])[request.user.id]
        activity_days = LearningActivityDay.objects.filter(
            student=request.user,
            activity_date__gte=timezone.localdate() - timedelta(days=364),
        ).values_list("activity_date", flat=True)
        return Response({
            "current_streak": current_streak,
            "longest_streak": streak.longest_days if streak else 0,
            "xp": xp,
            **xp_reward_progress(xp),
            "activity_days": [day.isoformat() for day in activity_days],
            "achievements": achievements,
            "certificates": CertificateSerializer(certificates, many=True).data,
        })


class StudentLeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "scope",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["personal", "team", "organization"],
            )
        ],
        responses=inline_serializer(
            name="StudentLeaderboard",
            fields={
                "scope": serializers.CharField(),
                "available": serializers.BooleanField(),
                "message": serializers.CharField(allow_blank=True),
                "xp": serializers.IntegerField(),
                "next_reward_at": serializers.IntegerField(),
                "xp_to_next_reward": serializers.IntegerField(),
                "reward_progress_percent": serializers.IntegerField(),
                "viewer_opted_in": serializers.BooleanField(),
                "team_name": serializers.CharField(allow_null=True),
                "organization_name": serializers.CharField(allow_null=True),
                "viewer_rank": serializers.IntegerField(allow_null=True),
                "participants": inline_serializer(
                    name="LeaderboardParticipant",
                    many=True,
                    fields={
                        "rank": serializers.IntegerField(),
                        "display_name": serializers.CharField(),
                        "xp": serializers.IntegerField(),
                    },
                ),
            },
        ),
    )
    def get(self, request):
        if role_of(request.user) != STUDENT:
            raise PermissionDenied("Leaderboards are available to students only.")

        scope = request.query_params.get("scope", "personal")
        if scope not in {"personal", "team", "organization"}:
            raise ValidationError({"scope": "Choose personal, team, or organization."})

        membership = (
            TeamMembership.objects.filter(
                student=request.user,
                team__active=True,
                team__organization__active=True,
            )
            .select_related("team__organization")
            .first()
        )
        xp_by_student = calculate_learning_xp([request.user.id])
        personal_xp = xp_by_student[request.user.id]
        response = {
            "scope": scope,
            "available": True,
            "message": "",
            "xp": personal_xp,
            **xp_reward_progress(personal_xp),
            "viewer_opted_in": request.user.leaderboard_opt_in,
            "team_name": membership.team.name if membership else None,
            "organization_name": (
                membership.team.organization.name if membership else None
            ),
            "viewer_rank": None,
            "participants": [],
        }
        if scope == "personal":
            return Response(response)

        if not membership:
            response.update({
                "available": False,
                "message": "Your team or organization has not been assigned yet.",
            })
            return Response(response)

        members = TeamMembership.objects.filter(
            team__active=True,
            team__organization__active=True,
            student__leaderboard_opt_in=True,
            student__is_active=True,
            student__role=STUDENT,
        ).select_related("student", "team__organization")
        if scope == "team":
            members = members.filter(team=membership.team)
        else:
            members = members.filter(
                team__organization=membership.team.organization
            )

        member_rows = list(members)
        scores = calculate_learning_xp(row.student_id for row in member_rows)
        ranked = sorted(
            member_rows,
            key=lambda row: (
                -scores[row.student_id],
                row.student.get_full_name().casefold() or row.student.username.casefold(),
                row.student_id,
            ),
        )
        participants = [
            {
                "rank": rank,
                "display_name": row.student.get_full_name() or row.student.username,
                "xp": scores[row.student_id],
            }
            for rank, row in enumerate(ranked, start=1)
        ]
        response["participants"] = participants[:50]
        response["viewer_rank"] = next(
            (
                rank
                for rank, row in enumerate(ranked, start=1)
                if row.student_id == request.user.id
            ),
            None,
        )
        return Response(response)


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="NotificationList",
            fields={
                "results": NotificationSerializer(many=True),
                "unread_count": serializers.IntegerField(),
            },
        )
    )
    def get(self, request):
        if role_of(request.user) == STUDENT:
            create_due_live_session_reminders(request.user)
        notifications = Notification.objects.filter(recipient=request.user)
        return Response({
            "results": NotificationSerializer(notifications[:30], many=True).data,
            "unread_count": notifications.filter(read_at__isnull=True).count(),
        })


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses=NotificationSerializer)
    def patch(self, request, notification_id):
        notification = get_object_or_404(
            Notification, pk=notification_id, recipient=request.user
        )
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name="NotificationReadAll",
            fields={"unread_count": serializers.IntegerField()},
        )
    )
    def post(self, request):
        Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({"unread_count": 0})


def _certificate_for_user(request, certificate_number):
    certificate = get_object_or_404(
        Certificate.objects.select_related("student", "course", "revoked_by"),
        certificate_number=certificate_number,
    )
    role = role_of(request.user)
    allowed = (
        role == ADMIN
        or (role == STUDENT and certificate.student_id == request.user.id)
        or (role == INSTRUCTOR and certificate.course.instructor_id == request.user.id)
    )
    if not allowed:
        raise NotFound("Certificate not found.")
    return certificate


class CertificateDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=CertificateSerializer)
    def get(self, request, certificate_number):
        certificate = _certificate_for_user(request, certificate_number)
        return Response(CertificateSerializer(certificate).data)


class CertificateDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="Certificate PDF download.",
            )
        }
    )
    def get(self, request, certificate_number):
        certificate = _certificate_for_user(request, certificate_number)
        if certificate.status != Certificate.Status.ISSUED:
            raise ValidationError("Revoked certificates cannot be downloaded.")
        filename = f"certificate-{certificate.certificate_number}.pdf"
        response = HttpResponse(render_certificate(certificate), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response


class CertificateVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(
        responses=inline_serializer(
            name="CertificateVerification",
            fields={
                "certificate_number": serializers.CharField(),
                "course_title": serializers.CharField(),
                "student_name": serializers.CharField(),
                "status": serializers.CharField(),
                "verified": serializers.BooleanField(),
                "completed_on": serializers.DateField(),
                "issued_at": serializers.DateTimeField(allow_null=True),
            },
        )
    )
    def get(self, request, certificate_number):
        certificate = get_object_or_404(
            Certificate.objects.select_related("student", "course"),
            certificate_number=certificate_number,
        )
        return Response(
            {
                "certificate_number": str(certificate.certificate_number),
                "course_title": certificate.course.title,
                "student_name": certificate.student.get_full_name()
                or certificate.student.username,
                "status": certificate.status,
                "verified": certificate.status == Certificate.Status.ISSUED,
                "completed_on": certificate_completion_date(certificate).isoformat(),
                "issued_at": certificate.issued_at,
            },
            headers={"Cache-Control": "no-store"},
        )


class IssueCertificateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="IssueCertificateRequest",
            fields={
                "course_id": serializers.IntegerField(),
                "student_id": serializers.IntegerField(),
            },
        ),
        responses={200: CertificateSerializer},
    )
    def post(self, request):
        if role_of(request.user) not in (ADMIN, INSTRUCTOR):
            raise PermissionDenied("Only the course instructor or an admin can issue certificates.")
        try:
            course = Course.objects.get(pk=request.data.get("course_id"))
        except (Course.DoesNotExist, TypeError, ValueError):
            raise NotFound("Course not found.")
        require_teaches(request.user, course)
        from apps.accounts.models import User
        try:
            student = User.objects.get(pk=request.data.get("student_id"), role=STUDENT)
        except (User.DoesNotExist, TypeError, ValueError):
            raise NotFound("Student not found.")
        if not student.enrollments.filter(course=course).exists():
            raise NotFound("Student is not enrolled in this course.")
        try:
            certificate, _ = issue_certificate(student, course)
        except ValueError as error:
            raise ValidationError(str(error))
        return Response(CertificateSerializer(certificate).data, status=status.HTTP_200_OK)


class RevokeCertificateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="RevokeCertificateRequest",
            fields={"reason": serializers.CharField(max_length=500)},
        ),
        responses=CertificateSerializer,
    )
    def post(self, request, certificate_number):
        certificate = _certificate_for_user(request, certificate_number)
        if role_of(request.user) not in (ADMIN, INSTRUCTOR):
            raise PermissionDenied("Only the course instructor or an admin can revoke certificates.")
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A revocation reason is required."})
        if len(reason) > 500:
            raise ValidationError({"reason": "The reason must be 500 characters or fewer."})
        certificate, _ = revoke_certificate(certificate, reason, request.user)
        return Response(CertificateSerializer(certificate).data)


class CertificateListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=CertificateSerializer(many=True),
        parameters=[
            OpenApiParameter(
                name="course_id",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
            )
        ],
    )
    def get(self, request):
        role = role_of(request.user)
        if role not in (ADMIN, INSTRUCTOR):
            raise PermissionDenied("Certificate management is available to instructors and admins.")

        certificates = Certificate.objects.select_related("student", "course", "revoked_by")
        course_id = request.query_params.get("course_id")
        if role == INSTRUCTOR and not course_id:
            raise ValidationError({"course_id": "This parameter is required for instructors."})
        if course_id:
            try:
                course = Course.objects.get(pk=course_id)
            except (Course.DoesNotExist, TypeError, ValueError):
                raise NotFound("Course not found.")
            require_teaches(request.user, course)
            certificates = certificates.filter(course=course)
        return Response(CertificateSerializer(certificates, many=True).data)