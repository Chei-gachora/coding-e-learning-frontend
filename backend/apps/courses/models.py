from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator
from django.db import models
from pathlib import Path
from zipfile import BadZipFile, ZipFile


def validate_pdf(file):
    if not file.name.lower().endswith(".pdf"):
        raise ValidationError("Only PDF files are allowed.")
    max_size_mb = 50
    if file.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"PDF must be smaller than {max_size_mb}MB.")
    # A ".pdf" name proves nothing — check the file really starts like a PDF.
    head = file.read(5)
    file.seek(0)
    if head != b"%PDF-":
        raise ValidationError("This file is not a valid PDF.")


def validate_resource_file(file):
    suffix = Path(file.name).suffix.lower()
    max_bytes = 50 * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError("Resource files must be 50MB or smaller.")

    if suffix == ".pdf":
        validate_pdf(file)
        return

    if suffix in {".zip", ".pptx", ".odp"}:
        try:
            file.seek(0)
            with ZipFile(file) as archive:
                names = set(archive.namelist())
                if suffix == ".pptx" and not {
                    "[Content_Types].xml",
                    "ppt/presentation.xml",
                }.issubset(names):
                    raise ValidationError("This file is not a valid PowerPoint presentation.")
                if suffix == ".odp" and "mimetype" not in names:
                    raise ValidationError("This file is not a valid OpenDocument presentation.")
        except BadZipFile as exc:
            raise ValidationError("Upload a valid ZIP, PowerPoint, or OpenDocument presentation.") from exc
        finally:
            file.seek(0)
        return

    if suffix == ".ppt":
        file.seek(0)
        head = file.read(8)
        file.seek(0)
        if head == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
            return
        raise ValidationError("This file is not a valid PowerPoint presentation.")

    raise ValidationError("Upload a PDF, ZIP, PowerPoint, or OpenDocument presentation.")


def course_cover_upload_path(instance, filename):
    return f"course_covers/{instance.id or 'new'}/{filename}"


def lesson_video_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return (
        f"lesson_videos/course_{instance.module.course_id}/"
        f"module_{instance.module_id}/lesson_{instance.id or 'new'}{suffix}"
    )


def validate_video_file(file):
    suffix = Path(file.name).suffix.lower()
    allowed_signatures = {
        ".mp4": lambda head: len(head) >= 8 and head[4:8] == b"ftyp",
        ".mov": lambda head: len(head) >= 8 and head[4:8] == b"ftyp",
        ".webm": lambda head: head.startswith(b"\x1a\x45\xdf\xa3"),
        ".ogg": lambda head: head.startswith(b"OggS"),
    }
    if suffix not in allowed_signatures:
        raise ValidationError("Upload an MP4, WebM, OGG, or MOV video.")
    max_bytes = getattr(settings, "COURSE_VIDEO_MAX_UPLOAD_MB", 500) * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError(f"Video must be smaller than {max_bytes // (1024 * 1024)}MB.")
    head = file.read(16)
    file.seek(0)
    if not allowed_signatures[suffix](head):
        raise ValidationError("The video contents do not match the file extension.")


class Course(models.Model):
    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)
    difficulty = models.CharField(
        max_length=16, choices=Difficulty.choices, default=Difficulty.BEGINNER
    )
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    learning_outcomes = models.JSONField(default=list, blank=True)
    prerequisites = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PUBLISHED)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courses_taught"
    )
    thumbnail = models.ImageField(
        upload_to=course_cover_upload_path,
        blank=True,
        null=True,
        help_text="Course cover image shown on the catalog and dashboard cards.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class LiveSession(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="live_sessions")
    title = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    meeting_url = models.URLField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at", "id"]

    def __str__(self):
        return f"{self.course.title} — {self.title}"


class Module(models.Model):
    """A module belongs to a course and has an order — this order is what
    module-locking (in the progress app) checks against."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(help_text="Position in the course sequence, starting at 1")

    class Meta:
        ordering = ["order"]
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} — Module {self.order}: {self.title}"


class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    learning_objectives = models.TextField(blank=True)
    video_url = models.URLField(blank=True, help_text="YouTube/Vimeo/other embeddable video link")
    video_file = models.FileField(upload_to=lesson_video_upload_path, blank=True, null=True)
    tutorial_content = models.TextField(blank=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("module", "order")

    def __str__(self):
        return self.title


def lesson_pdf_upload_path(instance, filename):
    # e.g. media/lesson_resources/course_3/module_1/lesson_2/handout.pdf
    lesson = instance.lesson
    return (
        f"lesson_resources/course_{lesson.module.course_id}/"
        f"module_{lesson.module_id}/lesson_{lesson.id}/{filename}"
    )


class LessonAttachment(models.Model):
    """
    A downloadable resource or external link attached to a lesson. Separate
    table rather than a single field on Lesson so an instructor can
    attach more than one document (slides + handout + cheat sheet, etc).
    Stored on disk under MEDIA_ROOT; the DB holds the path + metadata,
    which is what "stored in the db" means in practice for file uploads —
    Django/DRF don't put binary file contents directly in DB columns.
    """
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="attachments")
    title = models.CharField(max_length=200, help_text="Display name, e.g. 'Week 3 slides'")
    file = models.FileField(
        upload_to=lesson_pdf_upload_path,
        validators=[validate_resource_file],
        blank=True,
        null=True,
    )
    external_url = models.URLField(max_length=1000, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="uploaded_attachments"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"{self.title} ({self.lesson.title})"


class ActivityType(models.TextChoices):
    EXERCISE = "exercise", "Coding Exercise"
    LAB = "lab", "Daily Lab"
    QUIZ = "quiz", "Quiz"
    ASSIGNMENT = "assignment", "Assignment"
    QUESTIONNAIRE = "questionnaire", "Questionnaire"


class Activity(models.Model):
    """
    A gradeable unit of work inside a lesson. is_required drives module
    completion (progress app): a module is only complete once every
    required activity in it is complete.
    """

    class CodeLanguage(models.TextChoices):
        JAVASCRIPT = "javascript", "JavaScript"
        PYTHON = "python", "Python"
        HTML = "html", "HTML"
        C = "c", "C"
        CPP = "cpp", "C++"
        JAVA = "java", "Java"

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True)
    max_score = models.PositiveIntegerField(default=100)
    max_attempts = models.PositiveIntegerField(default=1)
    pass_percentage = models.PositiveSmallIntegerField(
        default=50,
        validators=[MaxValueValidator(100)],
        help_text="Minimum grade, as a percentage of max_score, for a graded submission to count as complete "
                  "(and so unlock the next module). Quizzes use Quiz.pass_mark_percentage instead.",
    )
    deadline = models.DateTimeField(null=True, blank=True)
    is_required = models.BooleanField(default=True)
    is_final_assessment = models.BooleanField(default=False)
    questionnaire_questions = models.JSONField(default=list, blank=True)

    # for coding activities specifically
    language = models.CharField(
        max_length=20,
        choices=CodeLanguage.choices,
        default=CodeLanguage.JAVASCRIPT,
    )
    starter_code = models.TextField(blank=True)
    test_cases = models.JSONField(blank=True, null=True, help_text="List of {input, expected_output}")

    def __str__(self):
        return f"{self.title} ({self.activity_type})"
