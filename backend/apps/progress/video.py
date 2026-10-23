"""Turning player heartbeats into trustworthy watch progress.

The player calls PUT /api/progress/video/<lesson>/ about every 10 s while
playing (and on pause / end / tab close) with its current position. Position
alone can't be trusted as "watched" — dragging the seek bar to the end would
look like a finished video — so time is only credited when the *position
advanced about as fast as real time* since the previous heartbeat:

    credited  <=>  previous heartbeat was 'playing'
               and gap since it <= MAX_GAP seconds (tab asleep => no credit)
               and 0 < forward movement <= gap * playback_rate * slack

A seek/fast-forward moves the position much further than the gap allows, a
rewind moves it backwards; both earn nothing but still update the resume
point. Credited ranges are merged so re-watching doesn't double count.

Limits: the duration is reported by the player (we cannot probe YouTube), so a
determined student could under-report it to "complete" sooner. That only
affects their own analytics — nothing (module unlocks, grades) depends on
video completion.
"""
from django.conf import settings

MAX_GAP_SECONDS = 40.0      # heartbeat is ~10 s; allow missed beats, not a sleeping laptop
SLACK = 1.25                # timer jitter / buffering
MIN_DURATION, MAX_DURATION = 5.0, 12 * 3600.0


def merge_intervals(intervals):
    merged = []
    for start, end in sorted([float(a), float(b)] for a, b in intervals if b > a):
        if merged and start <= merged[-1][1] + 0.5:      # touching/overlapping (0.5 s tolerance)
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def total_length(intervals):
    return sum(end - start for start, end in intervals)


def apply_ping(vp, position, duration, playing, rate, now):
    """Update ``vp`` (a VideoProgress) in place from one heartbeat. Does not save."""
    # Duration: accept the first sane value; afterwards ignore wild changes.
    if MIN_DURATION <= duration <= MAX_DURATION:
        if not vp.duration_seconds or abs(duration - vp.duration_seconds) <= 0.1 * vp.duration_seconds:
            vp.duration_seconds = duration
    dur = vp.duration_seconds
    position = max(0.0, min(float(position), dur if dur else float(position)))

    rate = min(max(float(rate or 1.0), 0.25), float(settings.VIDEO_MAX_PLAYBACK_RATE))
    if vp.last_ping_at and vp.last_playing:
        gap = (now - vp.last_ping_at).total_seconds()
        forward = position - vp.position_seconds
        if 0 < gap <= MAX_GAP_SECONDS and 0 < forward <= gap * rate * SLACK + 1.5:
            vp.intervals = merge_intervals(list(vp.intervals) + [[vp.position_seconds, position]])

    vp.position_seconds = position
    vp.last_ping_at = now
    vp.last_playing = bool(playing)
    vp.intervals = merge_intervals(vp.intervals)
    vp.watched_seconds = min(total_length(vp.intervals), dur) if dur else total_length(vp.intervals)

    if dur and not vp.completed and vp.watched_seconds >= settings.VIDEO_COMPLETE_THRESHOLD * dur:
        vp.completed = True
        vp.completed_at = now
    return vp
