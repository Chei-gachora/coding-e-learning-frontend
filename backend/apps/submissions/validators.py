"""Validation for files students upload with a submission.

Checks (all server-side — the browser's <input accept> is only a hint):
  * not empty, and no larger than SUBMISSION_MAX_UPLOAD_MB (default 10 MB)
  * extension is on an allowlist
  * content matches the extension (magic bytes for binary formats; must be
    valid UTF-8 text without NUL bytes for source/text formats)
  * zip archives: bounded entry count and *uncompressed* size (zip-bomb
    guard) and no absolute / ../ paths (zip-slip guard). We never extract.
"""
import os
import zipfile

from django.conf import settings
from django.core.exceptions import ValidationError

TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".h", ".cpp", ".hpp",
    ".cs", ".go", ".rb", ".php", ".rs", ".kt", ".swift", ".sql", ".html", ".css", ".json",
    ".csv", ".xml", ".yml", ".yaml", ".sh", ".ipynb",
}
MAGIC = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".zip": [b"PK\x03\x04"],
    ".docx": [b"PK\x03\x04"],
}
ALLOWED_EXTENSIONS = TEXT_EXTENSIONS | set(MAGIC)

ZIP_MAX_ENTRIES = 1000
ZIP_MAX_UNCOMPRESSED_MB = 100
TEXT_SNIFF_BYTES = 64 * 1024


def max_upload_bytes():
    return int(settings.SUBMISSION_MAX_UPLOAD_MB) * 1024 * 1024


def validate_submission_file(file):
    name = os.path.basename(file.name or "")
    ext = os.path.splitext(name)[1].lower()
    limit_mb = settings.SUBMISSION_MAX_UPLOAD_MB

    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"'{ext or 'no extension'}' files are not accepted. Allowed: PDF, ZIP, DOCX, PNG, JPG, GIF, "
            "and source/text files (.py, .js, .java, .html, .css, .json, .txt, .md, ...)."
        )
    if file.size == 0:
        raise ValidationError("The uploaded file is empty.")
    if file.size > max_upload_bytes():
        raise ValidationError(f"File is too large. The limit is {limit_mb} MB.")

    file.seek(0)
    head = file.read(TEXT_SNIFF_BYTES)
    file.seek(0)

    if ext in MAGIC:
        if not any(head.startswith(sig) for sig in MAGIC[ext]):
            raise ValidationError(f"This file's contents don't match its '{ext}' extension.")
        if ext in (".zip", ".docx"):
            _validate_zip(file, is_docx=(ext == ".docx"))
    else:
        if b"\x00" in head:
            raise ValidationError("This looks like a binary file, not a text/source file.")
        try:
            head.decode("utf-8")
        except UnicodeDecodeError as exc:
            # A multibyte char may be cut at the sniff boundary; only fail on earlier errors.
            if exc.start < len(head) - 4:
                raise ValidationError("Text files must be UTF-8 encoded.") from exc
    file.seek(0)
    return file


def _validate_zip(file, is_docx):
    try:
        with zipfile.ZipFile(file) as archive:
            infos = archive.infolist()
            if len(infos) > ZIP_MAX_ENTRIES:
                raise ValidationError(f"Archive has too many files (limit {ZIP_MAX_ENTRIES}).")
            total = 0
            for info in infos:
                path = info.filename.replace("\\", "/")
                if path.startswith("/") or ".." in path.split("/") or (len(path) > 1 and path[1] == ":"):
                    raise ValidationError("Archive contains unsafe file paths.")
                total += info.file_size
                if total > ZIP_MAX_UNCOMPRESSED_MB * 1024 * 1024:
                    raise ValidationError(f"Archive expands to more than {ZIP_MAX_UNCOMPRESSED_MB} MB.")
            if is_docx and "word/document.xml" not in {i.filename for i in infos}:
                raise ValidationError("This is not a valid Word (.docx) document.")
    except zipfile.BadZipFile as exc:
        raise ValidationError("The archive is corrupt or not a real zip file.") from exc
    finally:
        file.seek(0)
