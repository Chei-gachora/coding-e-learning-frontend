"""Upload validation for submission files."""
import io
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.testing import World, client_for


def make_zip(entries):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in entries.items():
            z.writestr(name, data)
    return buf.getvalue()


def make_docx():
    return make_zip({"[Content_Types].xml": "<x/>", "word/document.xml": "<w/>"})


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


class SubmissionUploadValidationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.w = World()

    def setUp(self):
        from django.core.cache import cache
        cache.clear()   # throttle counters live in the cache

    def test_code_submission_includes_activity_language_for_grading(self):
        response = client_for(self.w.student_1).post(
            "/api/submissions/",
            {"activity": self.w.exercise.id, "content": "print('hi')"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["activity_type"], "exercise")
        self.assertEqual(response.data["activity_language"], self.w.exercise.language)

    def upload(self, name, data, **kw):
        f = SimpleUploadedFile(name, data)
        c = client_for(self.w.student_1)
        return c.post("/api/submissions/", {"activity": self.w.assignment.id, "file": f, **kw}, format="multipart")

    def assert_rejected(self, name, data, fragment=None):
        r = self.upload(name, data)
        self.assertEqual(r.status_code, 400, (name, r.data))
        if fragment:
            self.assertIn(fragment.lower(), str(r.data).lower())
        from apps.submissions.models import Submission
        self.assertEqual(Submission.objects.count(), 0, "a rejected upload must not consume an attempt")

    # ---- accepted ----
    def test_accepts_legitimate_files(self):
        w = self.w
        cases = [
            ("notes.txt", b"hello"), ("solution.py", b"print('hi')\n"), ("app.js", "console.log('é')".encode()),
            ("doc.pdf", b"%PDF-1.7\n%..."), ("shot.png", PNG), ("a.zip", make_zip({"src/a.py": "x=1"})),
            ("report.docx", make_docx()), ("Upper.PY", b"print(1)"),
        ]
        w.assignment.max_attempts = 20
        w.assignment.save()
        for name, data in cases:
            with self.subTest(name):
                r = self.upload(name, data)
                self.assertEqual(r.status_code, 201, (name, r.data))

    # ---- rejected ----
    def test_rejects_disallowed_extensions(self):
        for name in ("run.exe", "x.bat", "x.dll", "x.php5", "noextension", "x.svg", "x.html.exe", "x.jar"):
            with self.subTest(name):
                self.assert_rejected(name, b"data", "not accepted")

    def test_rejects_empty_file(self):
        self.assert_rejected("empty.txt", b"", "empty")

    @override_settings(SUBMISSION_MAX_UPLOAD_MB=1)
    def test_rejects_oversized_file_and_accepts_just_under(self):
        self.assert_rejected("big.txt", b"a" * (1024 * 1024 + 1), "too large")
        self.assertEqual(self.upload("ok.txt", b"a" * (1024 * 1024 - 10)).status_code, 201)

    def test_default_limit_is_documented_10mb(self):
        from django.conf import settings
        self.assertEqual(settings.SUBMISSION_MAX_UPLOAD_MB, 10)

    def test_rejects_content_that_does_not_match_extension(self):
        self.assert_rejected("fake.pdf", b"<html>not a pdf</html>", "don't match")
        self.assert_rejected("fake.png", b"GIF89a....", "don't match")
        self.assert_rejected("fake.zip", b"just text", "don't match")
        self.assert_rejected("fake.docx", make_zip({"a.txt": "x"}), "not a valid word")

    def test_rejects_binary_disguised_as_source(self):
        self.assert_rejected("payload.py", b"MZ\x90\x00\x03\x00\x00\x00\x04", "binary")
        self.assert_rejected("latin1.txt", "caf\xe9 ".encode("latin-1") * 20, "utf-8")

    def test_rejects_corrupt_zip(self):
        self.assert_rejected("bad.zip", b"PK\x03\x04" + b"garbage" * 10, "corrupt")

    def test_rejects_zip_slip_paths(self):
        self.assert_rejected("slip.zip", make_zip({"../../etc/passwd": "x"}), "unsafe")
        self.assert_rejected("abs.zip", make_zip({"/etc/cron.d/x": "x"}), "unsafe")

    def test_rejects_zip_bomb(self):
        # ~100 MB of zeros compresses to a few KB: tiny upload, huge expansion.
        bomb = make_zip({f"z{i}.bin": b"\x00" * (30 * 1024 * 1024) for i in range(4)})
        self.assertLess(len(bomb), 1024 * 1024)
        self.assert_rejected("bomb.zip", bomb, "expands")

    def test_rejects_zip_with_too_many_entries(self):
        self.assert_rejected("many.zip", make_zip({f"f{i}.txt": "x" for i in range(1001)}), "too many")

    def test_path_traversal_in_filename_cannot_escape_upload_dir(self):
        r = self.upload("../../evil.txt", b"hello")
        if r.status_code == 201:
            from apps.submissions.models import Submission
            name = Submission.objects.get().file.name
            self.assertTrue(name.startswith("submissions/activity_"), name)
            self.assertNotIn("..", name)

    def test_empty_json_body_and_bad_github_url(self):
        c = client_for(self.w.student_1)
        r = c.post("/api/submissions/", {"activity": self.w.assignment.id, "github_url": "javascript:alert(1)"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_oversized_text_answer_rejected(self):
        c = client_for(self.w.student_1)
        r = c.post("/api/submissions/", {"activity": self.w.assignment.id, "content": "x" * 50_001}, format="json")
        self.assertEqual(r.status_code, 400)
