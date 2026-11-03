"""Lesson video URL rules.

Shared expectations with frontend/src/lib/video.js: a video is either
  * a YouTube link                     (embedded + progress tracked)
  * a Vimeo link                       (embedded, progress NOT tracked)
  * a direct .mp4/.webm/.ogg/.mov file (HTML5 player + progress tracked)
Anything else would render as an arbitrary third-party iframe/link inside the
learning platform, which we don't allow.
"""
import re
from urllib.parse import parse_qs, urlparse

from django.conf import settings
from rest_framework import serializers

YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be",
                 "youtube-nocookie.com", "www.youtube-nocookie.com"}
VIMEO_HOSTS = {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}
FILE_RE = re.compile(r"\.(mp4|webm|ogg|mov)$", re.IGNORECASE)
YOUTUBE_ID_RE = re.compile(r"^[\w-]{11}$")


def youtube_id(url):
    """The 11-character video id, or None. Mirrors parseVideoUrl() in the frontend."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host.endswith("youtu.be"):
        candidate = parsed.path.lstrip("/").split("/")[0]
    elif parsed.path == "/watch":
        candidate = (parse_qs(parsed.query).get("v") or [""])[0]
    else:
        m = re.match(r"^/(?:embed|shorts|live|v)/([\w-]{11})", parsed.path)
        candidate = m.group(1) if m else ""
    return candidate if YOUTUBE_ID_RE.match(candidate) else None


def classify_video_url(url):
    """Return 'youtube' | 'vimeo' | 'file' | None."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    secure_ok = parsed.scheme == "https" or (settings.DEBUG and parsed.scheme == "http")
    if not secure_ok:
        return None
    if host in YOUTUBE_HOSTS:
        return "youtube" if youtube_id(url) else None
    if host in VIMEO_HOSTS:
        return "vimeo" if re.search(r"\d{5,}", parsed.path or "") else None
    if FILE_RE.search(parsed.path or ""):
        return "file"
    return None


def validate_video_url(value):
    if not value:
        return value
    if classify_video_url(value) is None:
        raise serializers.ValidationError(
            "Use a full https YouTube (with a valid video id) or Vimeo link, or a direct https link to an .mp4, .webm, .ogg or .mov file."
        )
    return value
