#!/usr/bin/env python3
"""RollCall: a small, dependency-free college attendance portal.

Run with:
    python app.py

Demo data is created automatically on first launch. Use --reset-demo to rebuild
the sample campus at any time.
"""

from __future__ import annotations

import argparse
import io
import json
import mimetypes
import os
import re
import shutil
import sqlite3
import sys
import time
import traceback
import webbrowser
from collections import defaultdict, deque
from contextlib import contextmanager
from datetime import date, datetime
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, unquote, urlsplit

from security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    new_session_token,
    token_fingerprint,
    verify_password,
)
from seed_data import (
    BATCH,
    COLLEGE_NAME,
    COLLEGE_SHORT,
    CAMPUS,
    DEMO_STUDENT_PASSWORD,
    DEMO_TEACHER_PASSWORD,
    PERIODS,
    PROGRAM,
    SCHOOL,
    STUDENT_PASSWORD,
    TEACHER_PASSWORD,
    WEEKDAYS,
)

ROOT = Path(__file__).resolve().parent
TEMPLATE_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DEFAULT_DB_PATH = ROOT / "attendance.db"

HOST = os.environ.get("ROLLCALL_HOST", "127.0.0.1")
PORT = int(os.environ.get("ROLLCALL_PORT", "8000"))
DB_PATH = Path(os.environ.get("ROLLCALL_DB", DEFAULT_DB_PATH))
if os.environ.get("VERCEL") and not os.environ.get("ROLLCALL_DB"):
    _vercel_db = Path("/tmp/attendance.db")
    if not _vercel_db.exists() and DEFAULT_DB_PATH.exists():
        shutil.copy2(DEFAULT_DB_PATH, _vercel_db)
    DB_PATH = _vercel_db

APP_NAME = "RollCall"
TARGET_PERCENT = 75
SESSION_COOKIE = "rollcall_session"
SESSION_ROLES = ("student", "teacher", "admin")
PRINCIPAL_USERNAME = "principal"
SESSION_TTL_SECONDS = 14 * 24 * 60 * 60
MAX_BODY_BYTES = 5_000_000
STATIC_SUFFIXES = {
    ".css",
    ".js",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".txt",
    ".xml",
}


def session_cookie_name(role: str | None) -> str:
    """Each role gets its own cookie so both portals can stay signed in."""
    if role in SESSION_ROLES:
        return f"{SESSION_COOKIE}_{role}"
    return SESSION_COOKIE

SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS classes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    semester    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS teachers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id         TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    department          TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    dob                 TEXT,
    qualification       TEXT,
    photo_base64        TEXT,
    bio                 TEXT
);

CREATE TABLE IF NOT EXISTS admins (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    username            TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name                TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    email               TEXT,
    dob                 TEXT,
    qualification       TEXT,
    photo_base64        TEXT,
    bio                 TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    register_no         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name                TEXT NOT NULL,
    email               TEXT UNIQUE,
    password_hash       TEXT NOT NULL,
    class_id            INTEGER NOT NULL REFERENCES classes(id),
    active              INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    at         TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_id   INTEGER,
    action     TEXT NOT NULL,
    detail     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id  INTEGER NOT NULL REFERENCES teachers(id),
    class_id    INTEGER NOT NULL REFERENCES classes(id),
    subject_id  INTEGER NOT NULL REFERENCES subjects(id),
    UNIQUE (teacher_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS timetable (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id           INTEGER NOT NULL REFERENCES classes(id),
    weekday            INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    period             INTEGER NOT NULL CHECK (period BETWEEN 1 AND 7),
    span               INTEGER NOT NULL DEFAULT 1 CHECK (span BETWEEN 1 AND 7),
    subject_id         INTEGER NOT NULL REFERENCES subjects(id),
    primary_teacher_id INTEGER REFERENCES teachers(id),
    faculty_label      TEXT,
    UNIQUE (class_id, weekday, period)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id        INTEGER NOT NULL REFERENCES classes(id),
    subject_id      INTEGER NOT NULL REFERENCES subjects(id),
    teacher_id      INTEGER NOT NULL REFERENCES teachers(id),
    attendance_date TEXT NOT NULL,
    period          INTEGER NOT NULL,
    span            INTEGER NOT NULL DEFAULT 1,
    is_holiday      INTEGER NOT NULL DEFAULT 0,
    scheduled_teacher_id INTEGER REFERENCES teachers(id),
    is_substitution INTEGER NOT NULL DEFAULT 0,
    substitution_note TEXT,
    marked_by_teacher_id INTEGER REFERENCES teachers(id),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE (class_id, subject_id, attendance_date, period)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id)
                ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id),
    status     TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    PRIMARY KEY (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    role       TEXT NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS electives (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    semester    INTEGER NOT NULL DEFAULT 2,
    teacher_id  INTEGER REFERENCES teachers(id),
    capacity    INTEGER NOT NULL DEFAULT 35
);

CREATE TABLE IF NOT EXISTS elective_enrollments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    elective_id INTEGER NOT NULL REFERENCES electives(id) ON DELETE CASCADE,
    student_id  INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_class
    ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher
    ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_date
    ON attendance_sessions(teacher_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_sessions_class_date
    ON attendance_sessions(class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_records_student
    ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class
    ON timetable(class_id, weekday);
CREATE INDEX IF NOT EXISTS idx_elective_enrollments_student
    ON elective_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_elective_enrollments_elective
    ON elective_enrollments(elective_id);
"""

class ApiError(Exception):
    def __init__(self, status: int, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.retry_after = retry_after


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(reset: bool = False) -> None:
    if reset:
        for suffix in ("", "-wal", "-shm"):
            Path(f"{DB_PATH}{suffix}").unlink(missing_ok=True)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript(SCHEMA)
        session_columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(attendance_sessions)")
        }
        if "span" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN span INTEGER NOT NULL DEFAULT 1"
            )
        if "is_holiday" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN is_holiday INTEGER NOT NULL DEFAULT 0"
            )
        if "scheduled_teacher_id" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN scheduled_teacher_id INTEGER REFERENCES teachers(id)"
            )
        if "is_substitution" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN is_substitution INTEGER NOT NULL DEFAULT 0"
            )
        if "substitution_note" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN substitution_note TEXT"
            )
        for table in ("students", "teachers", "admins"):
            table_columns = {
                row["name"]
                for row in conn.execute(f"PRAGMA table_info({table})")
            }
            if "must_change_password" not in table_columns:
                conn.execute(
                    f"ALTER TABLE {table} "
                    "ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1"
                )

        for table in ("teachers", "admins"):
            table_columns = {
                row["name"]
                for row in conn.execute(f"PRAGMA table_info({table})")
            }
            for col, col_type in [
                ("email", "TEXT"),
                ("dob", "TEXT"),
                ("qualification", "TEXT"),
                ("photo_base64", "TEXT"),
                ("bio", "TEXT"),
            ]:
                if col not in table_columns:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        if "marked_by_teacher_id" not in session_columns:
            conn.execute(
                "ALTER TABLE attendance_sessions "
                "ADD COLUMN marked_by_teacher_id INTEGER REFERENCES teachers(id)"
            )
        count = conn.execute("SELECT COUNT(*) FROM classes").fetchone()[0]
        if count == 0:
            from seed_data import seed_database

            seed_database(conn)

        # Remove deprecated Administrator account if present
        conn.execute("DELETE FROM admins WHERE username = 'Administrator' COLLATE NOCASE")

        # Ensure default Sem-2 Electives are present
        elective_cnt = conn.execute("SELECT COUNT(*) FROM electives").fetchone()[0]
        if elective_cnt == 0:
            sample_electives = [
                ("MCA-SEM2-DS",   "Data Science",          2, None, 35),
                ("MCA-SEM2-CC",   "Cloud Computing",        2, None, 35),
                ("MCA-SEM2-QC",   "Quantum Computing",      2, None, 35),
                ("MCA-SEM2-AIML", "AI & Machine Learning",  2, None, 35),
            ]
            for e_code, e_name, e_sem, e_tid, e_cap in sample_electives:
                conn.execute(
                    "INSERT INTO electives (code, name, semester, teacher_id, capacity) VALUES (?, ?, ?, ?, ?)",
                    (e_code, e_name, e_sem, e_tid, e_cap),
                )


def _all_teachers() -> list[sqlite3.Row]:
    with get_db() as conn:
        return conn.execute(
            "SELECT id, name, employee_id FROM teachers ORDER BY name"
        ).fetchall()


def parse_integer(value, message: str) -> int:
    """Accept only real integers or digit strings; reject bools and floats."""
    if isinstance(value, bool):
        raise ApiError(400, message)
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        text = value.strip()
        if text.isdigit() or (text.startswith("-") and text[1:].isdigit()):
            return int(text)
    raise ApiError(400, message)


def normalize_identifier(value, label: str, minimum: int = 2) -> str:
    """Normalize a teacher employee ID (letters, digits, hyphens)."""
    candidate = str(value or "").strip().upper()
    if candidate and not re.fullmatch(rf"[A-Z0-9-]{{{minimum},20}}", candidate):
        raise ApiError(
            400, f"{label} may use letters, digits and hyphens only."
        )
    return candidate


def normalize_staff_email(value) -> str:
    """Validate a faculty e-mail (college rule: .edu.in addresses)."""
    candidate = str(value or "").strip().lower()
    if candidate:
        if len(candidate) > 120 or not re.fullmatch(r"[^@\s]{1,64}@[^@\s]{1,90}\.[^@\s]{2,10}", candidate):
            raise ApiError(400, "Enter a valid e-mail address.")
        if not candidate.endswith(".edu.in"):
            raise ApiError(400, "Faculty e-mail must end with .edu.in.")
    return candidate


def validate_new_password(value) -> str:
    """Validate a user-chosen password and return the normalized value."""
    candidate = value if isinstance(value, str) else ""
    if len(candidate) < 8:
        raise ApiError(
            400, "Choose a new password with at least 8 characters."
        )
    if len(candidate) > 200:
        raise ApiError(400, "The new password is too long.")
    return candidate


def audit(
    conn: sqlite3.Connection,
    role: str,
    user_id,
    action: str,
    detail: str = "",
) -> None:
    """Append one row to the audit trail. Never raises into callers."""
    try:
        conn.execute(
            """
            INSERT INTO audit_log (at, actor_role, actor_id, action, detail)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                datetime.now().isoformat(timespec="seconds"),
                str(role or ""),
                int(user_id) if user_id is not None else None,
                action,
                str(detail or "")[:200],
            ),
        )
    except sqlite3.Error:
        # Auditing must never block the actual operation.
        pass


def parse_date(value: str) -> date:
    try:
        parsed = date.fromisoformat(value)
    except (ValueError, TypeError):
        raise ApiError(400, "Please choose a valid date.") from None
    if parsed > date.today():
        raise ApiError(400, "Attendance cannot be recorded for a future date.")
    return parsed


def guidance(attended: int, total: int) -> dict:
    """Return exact 75% guidance using integer arithmetic.

    Safe-to-skip: 4A >= 3(T + x)  ->  x <= (4A - 3T) / 3
    Recovery:     (A + x) / (T + x) >= 3/4  ->  x >= 3T - 4A
    """
    attended = max(0, int(attended or 0))
    total = max(0, int(total or 0))
    absent = max(0, total - attended)
    percentage = round((attended / total) * 100, 1) if total else 0.0
    safe = total > 0 and 4 * attended >= 3 * total
    can_skip = (4 * attended - 3 * total) // 3 if safe else 0
    must_attend = 0 if safe else max(0, 3 * total - 4 * attended)
    if total == 0:
        status = "no_data"
    elif safe:
        status = "on_track"
    else:
        status = "below"
    return {
        "attended": attended,
        "total": total,
        "absent": absent,
        "percentage": percentage,
        "target": TARGET_PERCENT,
        "status": status,
        "can_skip": int(can_skip),
        "must_attend": int(must_attend),
    }


def pretty_time(value: str) -> str:
    hour, minute = (int(part) for part in value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    hour12 = hour % 12 or 12
    return f"{hour12}:{minute:02d} {suffix}"


def _timetable_rows(
    conn: sqlite3.Connection, class_id: int, weekday: int | None = None
) -> list[sqlite3.Row]:
    query = """
        SELECT t.weekday, t.period, t.span, t.faculty_label,
               t.primary_teacher_id, pt.name AS primary_teacher_name,
               sub.id AS subject_id, sub.code AS subject_code,
               sub.name AS subject_name
        FROM timetable t
        JOIN subjects sub ON sub.id = t.subject_id
        LEFT JOIN teachers pt ON pt.id = t.primary_teacher_id
        WHERE t.class_id = ?
    """
    params: list = [class_id]
    if weekday is not None:
        query += " AND t.weekday = ?"
        params.append(weekday)
    query += " ORDER BY t.weekday, t.period"
    return conn.execute(query, params).fetchall()


def timetable_days(conn: sqlite3.Connection, class_id: int) -> list[dict]:
    rows = _timetable_rows(conn, class_id)
    days = []
    for weekday, day_name in enumerate(WEEKDAYS):
        slots = []
        for row in rows:
            if row["weekday"] != weekday:
                continue
            first = PERIODS[row["period"] - 1]
            last = PERIODS[row["period"] + row["span"] - 2]
            slots.append(
                {
                    "period": row["period"],
                    "span": row["span"],
                    "subject_id": row["subject_id"],
                    "subject_code": row["subject_code"],
                    "subject_name": row["subject_name"],
                    "faculty": row["faculty_label"] or "",
                    "primary_teacher_id": row["primary_teacher_id"],
                    "primary_teacher_name": row["primary_teacher_name"] or "",
                    "start_time": first["start"],
                    "end_time": last["end"],
                    "time_label": (
                        f"{pretty_time(first['start'])} – "
                        f"{pretty_time(last['end'])}"
                    ),
                    "period_label": (
                        f"P{row['period']}"
                        if row["span"] == 1
                        else (
                            f"P{row['period']}–"
                            f"P{row['period'] + row['span'] - 1}"
                        )
                    ),
                }
            )
        days.append({"weekday": weekday, "day": day_name, "slots": slots})
    return days


def timetable_slot(
    conn: sqlite3.Connection,
    class_id: int,
    weekday: int,
    period: int,
    subject_id: int | None = None,
) -> sqlite3.Row | None:
    query = """
        SELECT t.*, sub.code AS subject_code, sub.name AS subject_name,
               pt.name AS primary_teacher_name
        FROM timetable t
        JOIN subjects sub ON sub.id = t.subject_id
        LEFT JOIN teachers pt ON pt.id = t.primary_teacher_id
        WHERE t.class_id = ? AND t.weekday = ? AND t.period = ?
    """
    params: list = [class_id, weekday, period]
    if subject_id is not None:
        query += " AND t.subject_id = ?"
        params.append(subject_id)
    return conn.execute(query, params).fetchone()


class LoginLimiter:
    """Tiny in-memory brute-force guard for a single-campus deployment."""

    def __init__(self, max_failures: int = 6, window_seconds: int = 10 * 60):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> None:
        bucket = self._failures[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()

    def retry_after(self, key: str) -> int:
        now = time.time()
        with self._lock:
            self._prune(key, now)
            if len(self._failures[key]) < self.max_failures:
                return 0
            return max(1, int(self.window_seconds - (now - self._failures[key][0])))

    def fail(self, key: str) -> None:
        now = time.time()
        with self._lock:
            self._prune(key, now)
            self._failures[key].append(now)

    def clear(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


class RequestLimiter:
    """Sliding-window limiter for sensitive API endpoints."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        if len(self._hits) > 4096:
            for stale in [
                item
                for item, bucket in self._hits.items()
                if not bucket or now - bucket[-1] > self.window_seconds
            ]:
                self._hits.pop(stale, None)
        bucket = self._hits[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        return bucket

    def retry_after(self, key: str) -> int:
        """Return seconds to wait without recording a request."""
        now = time.time()
        with self._lock:
            bucket = self._prune(key, now)
            if len(bucket) < self.max_requests:
                return 0
            return max(1, int(self.window_seconds - (now - bucket[0])) + 1)

    def record(self, key: str) -> None:
        now = time.time()
        with self._lock:
            self._prune(key, now).append(now)

    def hit(self, key: str) -> int:
        """Record a request. Returns 0 when allowed, else seconds to wait."""
        now = time.time()
        with self._lock:
            bucket = self._prune(key, now)
            if len(bucket) >= self.max_requests:
                return max(1, int(self.window_seconds - (now - bucket[0])) + 1)
            bucket.append(now)
            return 0


limiter = LoginLimiter()
# Counts failed sign-ins only, so a shared campus address or proxy is not
# locked out by legitimate traffic. Successful logins never consume quota.
login_ip_limiter = RequestLimiter(max_requests=100, window_seconds=10 * 60)
# Limits repeated attendance writes per teacher and address.
attendance_limiter = RequestLimiter(max_requests=60, window_seconds=60)
# Roster reads are cheap but return the full class list; cap refresh storms.
roster_limiter = RequestLimiter(max_requests=240, window_seconds=60)
# Excel export hands out the whole class roster + attendance; cap downloads.
export_limiter = RequestLimiter(max_requests=10, window_seconds=3600)
# Caps repeated password resets per account and per address.
password_reset_limiter = RequestLimiter(max_requests=20, window_seconds=10 * 60)


class RollCallServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class RollCallHandler(BaseHTTPRequestHandler):
    server_version = "RollCall/1.0"
    protocol_version = "HTTP/1.1"
    # Close idle/stalled connections instead of holding a thread forever.
    timeout = 20

    def version_string(self) -> str:
        # Do not advertise the Python interpreter version.
        return "RollCall"

    # ------------------------------------------------------------------ HTTP
    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    def do_HEAD(self) -> None:
        self._dispatch("HEAD")

    def _dispatch(self, method: str) -> None:
        parsed = urlsplit(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if method in ("GET", "HEAD"):
                self._handle_get(path, query, head_only=(method == "HEAD"))
            elif method == "POST":
                self._check_origin()
                self._handle_post(path, query)
            else:
                raise ApiError(405, "Method not allowed.")
        except ApiError as exc:
            headers = (
                [("Retry-After", str(exc.retry_after))] if exc.retry_after else []
            )
            if method == "POST":
                # A rejected POST may still have an unread body. Closing the
                # connection prevents leftover bytes being parsed as a second
                # request on a keep-alive connection.
                self.close_connection = True
                headers.append(("Connection", "close"))
            headers = headers or None
            if path.startswith("/api/"):
                self._send_json(
                    {"ok": False, "error": exc.message},
                    status=exc.status,
                    extra_headers=headers,
                )
            else:
                self._send_error_page(exc.status, exc.message)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as exc:  # noqa: BLE001 - never leak internals to clients
            if os.environ.get("ROLLCALL_DEBUG") == "1":
                traceback.print_exc()
            else:
                sys.stderr.write(
                    f"  [error] {method} {path} -> {type(exc).__name__}\n"
                )
            if method == "POST":
                self.close_connection = True
            if path.startswith("/api/"):
                self._send_json(
                    {"ok": False, "error": "Something went wrong. Please try again."},
                    status=500,
                    extra_headers=(
                        [("Connection", "close")] if method == "POST" else None
                    ),
                )
            else:
                self._send_error_page(
                    500, "Something went wrong while loading this page."
                )

    # --------------------------------------------------------------- helpers
    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        if self.headers.get("X-Forwarded-Proto", "").lower() == "https":
            self.send_header(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'",
        )

    def _send_bytes(
        self,
        body: bytes,
        content_type: str,
        status: int = 200,
        extra_headers: list[tuple[str, str]] | None = None,
        *,
        head_only: bool = False,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        for key, value in extra_headers or []:
            self.send_header(key, value)
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def _send_json(
        self,
        payload: dict,
        status: int = 200,
        extra_headers: list[tuple[str, str]] | None = None,
        *,
        head_only: bool = False,
    ) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        self._send_bytes(
            body,
            "application/json; charset=utf-8",
            status,
            extra_headers,
            head_only=head_only,
        )

    def _redirect(self, location: str, status: int = 302) -> None:
        self.send_response(status)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()

    def _send_error_page(self, status: int, message: str) -> None:
        safe_message = (
            message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )
        title = {401: "Sign in required", 403: "Not available", 404: "Page not found"}.get(
            status, "RollCall"
        )
        page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · RollCall</title>
<link rel="stylesheet" href="/static/css/base.css">
</head><body class="error-page">
<main class="error-card">
  <a class="brand brand--dark" href="/"><span class="brand__mark">R</span><span>RollCall</span></a>
  <p class="eyebrow">ERROR {status}</p>
  <h1>{title}</h1>
  <p>{safe_message}</p>
  <a class="btn btn--dark" href="/">Return to home</a>
</main>
</body></html>"""
        self._send_bytes(
            page.encode("utf-8"),
            "text/html; charset=utf-8",
            status,
            head_only=self.command == "HEAD",
        )

    def _serve_template(self, name: str, status: int = 200) -> None:
        path = (TEMPLATE_DIR / name).resolve()
        if TEMPLATE_DIR.resolve() not in path.parents or not path.is_file():
            raise ApiError(404, "Page not found.")
        self._send_bytes(
            path.read_bytes(),
            "text/html; charset=utf-8",
            status,
            head_only=self.command == "HEAD",
        )

    def _serve_static(self, request_path: str) -> None:
        relative = unquote(request_path[len("/static/") :])
        candidate = (STATIC_DIR / relative).resolve()
        if (
            STATIC_DIR.resolve() not in candidate.parents
            or not candidate.is_file()
            or candidate.suffix.lower() not in STATIC_SUFFIXES
        ):
            raise ApiError(404, "File not found.")
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {
            "application/javascript",
            "image/svg+xml",
        }:
            content_type += "; charset=utf-8"
        self._send_bytes(
            candidate.read_bytes(),
            content_type,
            head_only=self.command == "HEAD",
        )

    def _read_json(self) -> dict:
        length_header = self.headers.get("Content-Length", "0")
        try:
            length = int(length_header)
        except ValueError:
            raise ApiError(400, "Invalid request.") from None
        if length <= 0:
            raise ApiError(400, "Request body is required.")
        if length > MAX_BODY_BYTES:
            raise ApiError(413, "Request is too large.")
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ApiError(400, "Invalid JSON request.") from None
        if not isinstance(payload, dict):
            raise ApiError(400, "Invalid request body.")
        return payload

    def _client_ip(self) -> str:
        if os.environ.get("VERCEL"):
            forwarded = (self.headers.get("X-Forwarded-For") or "").split(",", 1)[0].strip()
            if forwarded:
                return forwarded
        addr = getattr(self, "client_address", None)
        if isinstance(addr, (tuple, list)) and addr:
            return str(addr[0])
        return "unknown"

    def _check_origin(self) -> None:
        # Reject requests the browser itself labels as cross-site, even when
        # no Origin header is present.
        if (self.headers.get("Sec-Fetch-Site") or "").strip().lower() == "cross-site":
            raise ApiError(403, "Request origin was not accepted.")
        origin = self.headers.get("Origin")
        if not origin:
            return
        hosts = {
            h.strip().lower()
            for h in (
                self.headers.get("Host", ""),
                self.headers.get("X-Forwarded-Host", ""),
            )
            if h and h.strip()
        }
        if urlsplit(origin).netloc.lower() not in hosts:
            raise ApiError(403, "Request origin was not accepted.")

    def _cookie_tokens(self, role: str | None = None) -> list[str]:
        """Return candidate session tokens, most specific first."""
        raw_cookie = self.headers.get("Cookie")
        if not raw_cookie:
            return []
        jar = SimpleCookie()
        try:
            jar.load(raw_cookie)
        except Exception:
            return []
        names: list[str] = []
        if role in SESSION_ROLES:
            names.append(session_cookie_name(role))
        for name in (
            session_cookie_name(role),
            SESSION_COOKIE,
            *(session_cookie_name(item) for item in SESSION_ROLES),
        ):
            if name not in names:
                names.append(name)
        tokens: list[str] = []
        for name in names:
            morsel = jar.get(name)
            if morsel and morsel.value and morsel.value not in tokens:
                tokens.append(morsel.value)
        return tokens

    def _cookie_token(self) -> str | None:
        tokens = self._cookie_tokens()
        return tokens[0] if tokens else None

    def _current_session(self, role: str | None = None) -> dict | None:
        tokens = self._cookie_tokens(role)
        if not tokens:
            return None
        now = int(time.time())
        for token in tokens:
            fingerprint = token_fingerprint(token)
            with get_db() as conn:
                row = conn.execute(
                    "SELECT role, user_id, expires_at FROM sessions WHERE token_hash = ?",
                    (fingerprint,),
                ).fetchone()
                if not row:
                    continue
                if row["expires_at"] < now:
                    conn.execute(
                        "DELETE FROM sessions WHERE token_hash = ?", (fingerprint,)
                    )
                    continue
            if role and row["role"] != role:
                continue
            return {
                "role": row["role"],
                "user_id": row["user_id"],
                "token_hash": fingerprint,
            }
        return None

    def _require_api_session(self, role: str | None = None) -> dict:
        session = self._current_session(role)
        if not session:
            raise ApiError(401, "Your session has expired. Please sign in again.")
        if role and session["role"] != role:
            raise ApiError(403, "This area is not available for your account.")
        return session

    def _require_page_session(self, role: str) -> dict:
        session = self._current_session(role)
        if not session:
            self._redirect(f"/{role}/login")
            raise ConnectionAbortedError
        if session["role"] != role:
            self._redirect(f"/{session['role']}")
            raise ConnectionAbortedError
        return session

    def _require_staff_session(self) -> tuple[dict, bool]:
        """Teacher or admin. Returns (session, is_admin)."""
        session = self._current_session("teacher")
        if not session:
            session = self._current_session("admin")
        if not session:
            raise ApiError(401, "Your session has expired. Please sign in again.")
        if session["role"] not in {"teacher", "admin"}:
            raise ApiError(403, "This area is not available for your account.")
        return session, session["role"] == "admin"

    def _profile(self, role: str, user_id: int) -> dict | None:
        with get_db() as conn:
            if role == "student":
                row = conn.execute(
                    """
                    SELECT s.id, s.name, s.register_no, s.email,
                           s.must_change_password,
                           c.name AS class_name, c.code AS class_code,
                           c.semester
                    FROM students s
                    JOIN classes c ON c.id = s.class_id
                    WHERE s.id = ? AND s.active = 1
                    """,
                    (user_id,),
                ).fetchone()
                if not row:
                    return None
                profile = dict(row)
                profile["must_change_password"] = bool(profile.get("must_change_password"))
                return {"role": "student", **profile}
            if role == "admin":
                row = conn.execute(
                    """
                    SELECT id, username, name, must_change_password, email, dob, qualification, photo_base64, bio
                    FROM admins WHERE id = ?
                    """,
                    (user_id,),
                ).fetchone()
                if not row:
                    return None
                return {
                    "role": "admin",
                    "id": row["id"],
                    "username": row["username"],
                    "name": row["name"],
                    "employee_id": row["username"],
                    "email": row["email"] or f"{row['username'].lower()}@gvpihlr.edu.in",
                    "department": "Administration",
                    "must_change_password": bool(row["must_change_password"]),
                    "dob": row["dob"] or "",
                    "qualification": row["qualification"] or "",
                    "photo_base64": row["photo_base64"] or "",
                    "bio": row["bio"] or "",
                }
            row = conn.execute(
                """
                SELECT id, name, employee_id, email, department,
                       must_change_password, dob, qualification, photo_base64, bio
                FROM teachers WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            if not row:
                return None
            profile = dict(row)
            profile["must_change_password"] = bool(profile.get("must_change_password"))
            profile["dob"] = profile.get("dob") or ""
            profile["qualification"] = profile.get("qualification") or ""
            profile["photo_base64"] = profile.get("photo_base64") or ""
            profile["bio"] = profile.get("bio") or ""
            return {"role": "teacher", **profile}

    def _create_session_cookie(self, role: str, user_id: int) -> str:
        token = new_session_token()
        now = int(time.time())
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
            conn.execute(
                """
                INSERT INTO sessions
                    (token_hash, role, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    token_fingerprint(token),
                    role,
                    user_id,
                    now,
                    now + SESSION_TTL_SECONDS,
                ),
            )
        parts = [
            f"{session_cookie_name(role)}={token}",
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            f"Max-Age={SESSION_TTL_SECONDS}",
        ]
        if self.headers.get("X-Forwarded-Proto", "").lower() == "https":
            parts.append("Secure")
        return "; ".join(parts)

    # ------------------------------------------------------------------- GET
    def _handle_get(self, path: str, query: dict, *, head_only: bool = False) -> None:
        if head_only and not path.startswith("/static/"):
            # Templates still return headers with a zero-response body.
            self.command = "HEAD"

        if path == "/":
            self._serve_template("index.html")
            return
        if path == "/favicon.ico":
            self._serve_static("/static/favicon.svg")
            return
        if path == "/robots.txt":
            self._serve_static("/static/robots.txt")
            return
        if path == "/sitemap.xml":
            self._serve_static("/static/sitemap.xml")
            return
        if path == "/sw.js":
            sw_candidate = (STATIC_DIR / "sw.js").resolve()
            if not sw_candidate.is_file():
                raise ApiError(404, "Service worker not found.")
            self._send_bytes(
                sw_candidate.read_bytes(),
                "application/javascript; charset=utf-8",
                200,
                extra_headers=[
                    ("Service-Worker-Allowed", "/"),
                    ("Cache-Control", "no-cache"),
                ],
                head_only=self.command == "HEAD",
            )
            return
        if path.startswith("/static/"):
            self._serve_static(path)
            return
        if path in ("/login", "/student/login", "/teacher/login", "/admin/login"):
            role = path.split("/")[1] if path != "/login" else None
            if role:
                session = self._current_session(role)
                if session and session["role"] == role:
                    self._redirect(f"/{role}")
                    return
            else:
                for r in ("admin", "teacher", "student"):
                    session = self._current_session(r)
                    if session and session["role"] == r:
                        self._redirect(f"/{r}")
                        return
            self._serve_template("login.html")
            return
        if path in ("/student", "/teacher", "/admin"):
            role = path.strip("/")
            try:
                session = self._require_page_session(role)
            except ConnectionAbortedError:
                return
            profile = self._profile(role, session["user_id"])
            if not profile:
                self._delete_current_session()
                self._redirect(f"/{role}/login")
                return
            self._serve_template(f"{role}.html")
            return
        if path == "/change-password":
            self._serve_template("change_password.html")
            return
        if path.startswith("/api/"):
            self._handle_api_get(path, query, head_only=head_only)
            return
        self._send_error_page(404, "The page you are looking for does not exist.")

    def _handle_api_get(
        self, path: str, query: dict, *, head_only: bool = False
    ) -> None:
        if path == "/api/health":
            self._send_json(
                {"ok": True, "app": APP_NAME, "date": date.today().isoformat()},
                head_only=head_only,
            )
            return

        if path == "/api/session":
            session = self._current_session()
            if not session:
                raise ApiError(401, "Not signed in.")
            profile = self._profile(session["role"], session["user_id"])
            if not profile:
                raise ApiError(401, "Account not found.")
            self._send_json({"ok": True, "user": profile}, head_only=head_only)
            return

        if path == "/api/student/overview":
            session = self._require_api_session("student")
            payload = self._student_overview(session["user_id"])
            self._send_json(payload, head_only=head_only)
            return

        if path == "/api/teacher/overview":
            session, is_admin = self._require_staff_session()
            payload = self._teacher_overview(session["user_id"], admin=is_admin)
            self._send_json(payload, head_only=head_only)
            return

        if path == "/api/teacher/roster":
            session, is_admin = self._require_staff_session()
            retry = roster_limiter.hit(
                f"roster|{self._client_ip()}|{session['user_id']}"
            )
            if retry:
                raise ApiError(
                    429,
                    "Too many roster requests. Please wait a moment.",
                    retry_after=retry,
                )
            payload = self._teacher_roster(session["user_id"], query, admin=is_admin)
            self._send_json(payload, head_only=head_only)
            return

        if path == "/api/teacher/sessions":
            session, is_admin = self._require_staff_session()
            payload = self._teacher_sessions(session["user_id"], query, admin=is_admin)
            self._send_json(payload, head_only=head_only)
            return

        if path == "/api/teacher/students":
            session, is_admin = self._require_staff_session()
            payload = self._teacher_students(session["user_id"], query, admin=is_admin)
            self._send_json(payload, head_only=head_only)
            return

        if path == "/api/admin/security":
            session, is_admin = self._require_staff_session()
            if not is_admin:
                raise ApiError(403, "Only the admin can review credential status.")
            with get_db() as conn:
                students = conn.execute(
                    """
                    SELECT register_no, name
                    FROM students
                    WHERE active = 1 AND must_change_password = 1
                    ORDER BY register_no
                    """
                ).fetchall()
                teachers = conn.execute(
                    """
                    SELECT employee_id, name, email
                    FROM teachers
                    WHERE must_change_password = 1
                    ORDER BY employee_id
                    """
                ).fetchall()
                admins = conn.execute(
                    """
                    SELECT username, name
                    FROM admins
                    WHERE must_change_password = 1
                    """
                ).fetchall()
            self._send_json(
                {
                    "ok": True,
                    "totals": {
                        "students_pending": len(students),
                        "teachers_pending": len(teachers),
                        "admins_pending": len(admins),
                    },
                    "students": [dict(row) for row in students],
                    "teachers": [dict(row) for row in teachers],
                    "admins": [dict(row) for row in admins],
                },
                head_only=head_only,
            )
            return

        if path == "/api/electives":
            session, is_admin = self._require_staff_session()
            self._get_electives(session["user_id"], is_admin=is_admin, head_only=head_only)
            return

        if path.startswith("/api/electives/") and path.endswith("/students"):
            session, is_admin = self._require_staff_session()
            parts = path.split("/")
            if len(parts) >= 5 and parts[3].isdigit():
                elective_id = int(parts[3])
                self._get_elective_students(elective_id, session["user_id"], is_admin=is_admin, head_only=head_only)
                return

        if path == "/api/teacher/students/export":
            session, is_admin = self._require_staff_session()
            retry = export_limiter.hit(
                f"export|{self._client_ip()}|{session['user_id']}"
            )
            if retry:
                raise ApiError(
                    429,
                    "Too many exports. Please wait before downloading again.",
                    retry_after=retry,
                )
            body, filename = self._teacher_students_export(
                session["user_id"], query, admin=is_admin
            )
            self._send_bytes(
                body,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                extra_headers=[
                    (
                        "Content-Disposition",
                        f'attachment; filename="{filename}"',
                    )
                ],
                head_only=head_only,
            )
            return

        raise ApiError(404, "API endpoint not found.")

    # ------------------------------------------------------------------ POST
    def _handle_post(self, path: str, query: dict) -> None:
        if self.headers.get("Transfer-Encoding"):
            # Chunked bodies are not supported; reject instead of leaving
            # framing bytes unread on a keep-alive connection.
            raise ApiError(400, "Transfer-Encoding is not supported.")
        content_type = (
            (self.headers.get("Content-Type") or "")
            .split(";", 1)[0]
            .strip()
            .lower()
        )
        if content_type != "application/json":
            raise ApiError(415, "Send JSON with Content-Type: application/json.")
        if path == "/api/login":
            self._login()
            return
        if path == "/api/logout":
            try:
                payload = self._read_json()
            except ApiError:
                payload = {}
            role = str(payload.get("role", "")).strip().lower() or None
            self._logout(role if role in SESSION_ROLES else None)
            return
        if path == "/api/password/change":
            self._change_password()
            return
        if path == "/api/password/reset":
            self._reset_password()
            return
        if path == "/api/username/change":
            self._change_username()
            return
        if path == "/api/teacher/attendance":
            session, is_admin = self._require_staff_session()
            payload = self._read_json()
            retry = attendance_limiter.hit(
                f"attendance|{self._client_ip()}|{session['user_id']}"
            )
            if retry:
                raise ApiError(
                    429,
                    "Too many attendance saves in a short time. "
                    "Please wait a moment and try again.",
                    retry_after=retry,
                )
            result = self._save_attendance(
                session["user_id"], payload, admin=is_admin
            )
            self._send_json(result)
            return
        if path == "/api/admin/student/add":
            self._add_student()
            return
        if path == "/api/admin/teacher/add":
            self._add_teacher()
            return
        if path == "/api/admin/students/import":
            self._import_students()
            return
        if path == "/api/electives/add":
            self._add_elective()
            return
        if path.startswith("/api/electives/") and path.endswith("/enroll"):
            session, is_admin = self._require_staff_session()
            parts = path.split("/")
            if len(parts) >= 5 and parts[3].isdigit():
                elective_id = int(parts[3])
                self._enroll_elective_student(elective_id, session, is_admin)
                return
        if path.startswith("/api/electives/") and path.endswith("/unenroll"):
            session, is_admin = self._require_staff_session()
            parts = path.split("/")
            if len(parts) >= 5 and parts[3].isdigit():
                elective_id = int(parts[3])
                self._unenroll_elective_student(elective_id, session, is_admin)
                return
        if path.startswith("/api/electives/") and path.endswith("/assign-faculty"):
            session, is_admin = self._require_staff_session()
            if not is_admin:
                raise ApiError(403, "Only administrators can assign faculty to electives.")
            parts = path.split("/")
            if len(parts) >= 5 and parts[3].isdigit():
                elective_id = int(parts[3])
                self._assign_elective_faculty(elective_id, session)
                return
        if path == "/api/profile/update":
            self._update_profile()
            return
        raise ApiError(404, "API endpoint not found.")

    def _login(self) -> None:
        payload = self._read_json()
        role = str(payload.get("role", "")).strip().lower()
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", ""))
        if role not in {"student", "teacher", "admin"}:
            raise ApiError(400, "Choose a valid login type.")
        if not username or not password:
            raise ApiError(400, "Enter your username and password.")
        if len(username) > 120 or len(password) > 200:
            raise ApiError(400, "The username or password is too long.")

        ip_key = f"login-ip|{self._client_ip()}"
        ip_retry = login_ip_limiter.retry_after(ip_key)
        if ip_retry:
            raise ApiError(
                429,
                "Too many failed sign-in attempts. "
                f"Please wait about {ip_retry // 60 + 1} minutes.",
                retry_after=ip_retry,
            )

        # Keyed by account only: rotating source addresses must not reset the
        # per-account failure budget.
        limiter_key = f"{role}|{username.lower()}"
        retry_after = limiter.retry_after(limiter_key)
        if retry_after:
            raise ApiError(
                429,
                f"Too many sign-in attempts. Please wait about {retry_after // 60 + 1} minutes.",
                retry_after=retry_after,
            )

        with get_db() as conn:
            if role == "student":
                row = conn.execute(
                    """
                    SELECT id, name, register_no, password_hash
                    FROM students
                    WHERE register_no = ? COLLATE NOCASE AND active = 1
                    """,
                    (username,),
                ).fetchone()
            elif role == "admin":
                row = conn.execute(
                    """
                    SELECT id, name, username, password_hash
                    FROM admins
                    WHERE username = ? COLLATE NOCASE
                    """,
                    (username,),
                ).fetchone()
            else:
                row = conn.execute(
                    """
                    SELECT id, name, email, password_hash
                    FROM teachers
                    WHERE email = ? COLLATE NOCASE OR employee_id = ? COLLATE NOCASE
                    """,
                    (username, username),
                ).fetchone()
                if not row:
                    # Allow the principal account to sign in from the teacher
                    # login as well, so there is one staff entry point.
                    admin_row = conn.execute(
                        """
                        SELECT id, name, username, password_hash
                        FROM admins
                        WHERE username = ? COLLATE NOCASE
                        """,
                        (username,),
                    ).fetchone()
                    if admin_row:
                        row = admin_row
                        role = "admin"

        stored_hash = row["password_hash"] if row else DUMMY_PASSWORD_HASH
        valid = verify_password(password, stored_hash)
        if not row or not valid:
            limiter.fail(limiter_key)
            login_ip_limiter.record(ip_key)
            raise ApiError(401, "Those details do not match an account.")

        limiter.clear(limiter_key)
        self._delete_current_session(role)
        cookie = self._create_session_cookie(role, int(row["id"]))
        display = (
            row["register_no"]
            if role == "student"
            else row["username"]
            if role == "admin"
            else row["email"]
        )
        self._send_json(
            {
                "ok": True,
                "message": f"Welcome back, {row['name']}.",
                "redirect": f"/{role}",
                "user": {"role": role, "username": display},
            },
            extra_headers=[("Set-Cookie", cookie)],
        )

    def _account_row(
        self, conn: sqlite3.Connection, role: str, user_id: int
    ) -> sqlite3.Row | None:
        if role == "student":
            return conn.execute(
                "SELECT id, password_hash FROM students WHERE id = ? AND active = 1",
                (user_id,),
            ).fetchone()
        if role == "teacher":
            return conn.execute(
                "SELECT id, password_hash FROM teachers WHERE id = ?", (user_id,)
            ).fetchone()
        if role == "admin":
            return conn.execute(
                "SELECT id, password_hash FROM admins WHERE id = ?", (user_id,)
            ).fetchone()
        return None

    def _lookup_account(
        self, conn: sqlite3.Connection, role: str, username: str
    ) -> sqlite3.Row | None:
        if role == "student":
            return conn.execute(
                """
                SELECT id, password_hash FROM students
                WHERE register_no = ? COLLATE NOCASE AND active = 1
                """,
                (username,),
            ).fetchone()
        if role == "teacher":
            return conn.execute(
                """
                SELECT id, password_hash FROM teachers
                WHERE email = ? COLLATE NOCASE OR employee_id = ? COLLATE NOCASE
                """,
                (username, username),
            ).fetchone()
        if role == "admin":
            return conn.execute(
                "SELECT id, password_hash FROM admins WHERE username = ? COLLATE NOCASE",
                (username,),
            ).fetchone()
        return None

    def _update_password(
        self, conn: sqlite3.Connection, role: str, user_id: int, new_password: str
    ) -> None:
        tables = {"student": "students", "teacher": "teachers", "admin": "admins"}
        table = tables.get(role)
        if not table:
            raise ApiError(400, "Choose a valid account type.")
        conn.execute(
            f"UPDATE {table} SET password_hash = ?, must_change_password = 0 WHERE id = ?",
            (hash_password(new_password), user_id),
        )

    def _change_username(self) -> None:
        session = self._require_api_session()
        role = session["role"]
        if role != "teacher":
            raise ApiError(403, "Only teacher accounts can change sign-in details here.")
        payload = self._read_json()
        user_id = int(session["user_id"])

        ip_key = f"change-username|{self._client_ip()}|{role}|{user_id}"
        retry = password_reset_limiter.hit(ip_key)
        if retry:
            raise ApiError(
                429,
                "Too many attempts. Please wait a few minutes and try again.",
                retry_after=retry,
            )

        current_password = str(payload.get("current_password", "") or "")
        if len(current_password) > 200:
            raise ApiError(400, "The current password is too long.")

        with get_db() as conn:
            row = self._account_row(conn, role, user_id)
            if not row:
                raise ApiError(
                    401, "Your account could not be found. Please sign in again."
                )
            if not verify_password(current_password, row["password_hash"]):
                raise ApiError(401, "The current password is incorrect.")

            new_employee_id = normalize_identifier(
                payload.get("employee_id"), "Employee ID", 2
            )
            new_email = normalize_staff_email(payload.get("email"))
            if not new_employee_id or not new_email:
                raise ApiError(400, "Enter both an employee ID and an e-mail.")
            current = conn.execute(
                "SELECT employee_id, email FROM teachers WHERE id = ?", (user_id,)
            ).fetchone()
            if (
                new_employee_id == str(current["employee_id"]).upper()
                and new_email == str(current["email"]).lower()
            ):
                raise ApiError(400, "Nothing to update.")
            clash = conn.execute(
                """
                SELECT id FROM teachers
                WHERE (employee_id = ? COLLATE NOCASE OR email = ? COLLATE NOCASE)
                  AND id != ?
                """,
                (new_employee_id, new_email, user_id),
            ).fetchone()
            if clash:
                raise ApiError(409, "That employee ID or e-mail is already in use.")
            conn.execute(
                "UPDATE teachers SET employee_id = ?, email = ? WHERE id = ?",
                (new_employee_id, new_email, user_id),
            )
            audit(
                conn,
                role,
                user_id,
                "username_changed",
                f"id {current['employee_id']} -> {new_employee_id}; email {current['email']} -> {new_email}",
            )
            # A new identity means the old devices should not stay signed in.
            conn.execute(
                "DELETE FROM sessions WHERE role = ? AND user_id = ? AND token_hash != ?",
                (role, user_id, session["token_hash"]),
            )
        self._send_json(
            {
                "ok": True,
                "message": "Your sign-in details were updated. Use them next time you sign in.",
                "redirect": "/teacher",
            }
        )

    def _change_password(self) -> None:
        session = self._require_api_session()
        payload = self._read_json()
        role = session["role"]
        user_id = int(session["user_id"])

        ip_key = f"change-pw|{self._client_ip()}|{role}|{user_id}"
        retry = password_reset_limiter.hit(ip_key)
        if retry:
            raise ApiError(
                429,
                "Too many attempts. Please wait a few minutes and try again.",
                retry_after=retry,
            )

        current_password = str(payload.get("current_password", "") or "")
        new_password = validate_new_password(payload.get("new_password"))
        confirm_password = payload.get("confirm_password")
        if new_password != str(confirm_password or ""):
            raise ApiError(
                400, "The new password and confirmation do not match."
            )
        if len(current_password) > 200:
            raise ApiError(400, "The current password is too long.")

        with get_db() as conn:
            row = self._account_row(conn, role, user_id)
            if not row:
                raise ApiError(
                    401, "Your account could not be found. Please sign in again."
                )
            if not verify_password(current_password, row["password_hash"]):
                raise ApiError(401, "The current password is incorrect.")
            self._update_password(conn, role, user_id, new_password)
            audit(conn, role, user_id, "password_changed")
            # Other devices are signed out; this session stays valid.
            conn.execute(
                "DELETE FROM sessions WHERE role = ? AND user_id = ? AND token_hash != ?",
                (role, user_id, session["token_hash"]),
            )
        self._send_json(
            {
                "ok": True,
                "message": "Your password has been updated.",
                "redirect": f"/{role}",
            }
        )

    def _reset_password(self) -> None:
        payload = self._read_json()
        role = str(payload.get("role", "")).strip().lower()
        if role not in {"student", "teacher", "admin"}:
            raise ApiError(400, "Choose a valid account type.")
        username = str(payload.get("username", "")).strip()
        if not username:
            raise ApiError(400, "Enter your register number, employee ID or e-mail.")
        if len(username) > 120:
            raise ApiError(400, "The username is too long.")
        new_password = validate_new_password(payload.get("new_password"))
        confirm_password = payload.get("confirm_password")
        if new_password != str(confirm_password or ""):
            raise ApiError(
                400, "The new password and confirmation do not match."
            )

        # Teachers may optionally move the account to a new employee ID or
        # e-mail in the same call. Students are fixed to their register number.
        if str(payload.get("new_register_no", "")).strip():
            raise ApiError(400, "Student register numbers cannot be changed here.")
        raw_new = {
            key: str(payload.get(key, "") or "").strip()
            for key in ("new_employee_id", "new_email")
        }
        if role != "teacher" and any(raw_new.values()):
            raise ApiError(400, "Only teacher accounts can use a new sign-in here.")
        new_employee_id = (
            normalize_identifier(raw_new["new_employee_id"], "Employee ID", 2)
            if role == "teacher"
            else ""
        )
        new_email = normalize_staff_email(raw_new["new_email"]) if role == "teacher" else ""

        ip_key = f"reset|{self._client_ip()}"
        retry = password_reset_limiter.hit(ip_key)
        if retry:
            raise ApiError(
                429,
                "Too many reset attempts. Please wait about "
                f"{retry // 60 + 1} minutes.",
                retry_after=retry,
            )
        account_key = f"reset|{role}|{username.lower()}"
        retry = password_reset_limiter.hit(account_key)
        if retry:
            raise ApiError(
                429,
                "Too many attempts for this account. Please wait about "
                f"{retry // 60 + 1} minutes.",
                retry_after=retry,
            )

        with get_db() as conn:
            row = self._lookup_account(conn, role, username)
            if not row:
                raise ApiError(404, "No account matches that username.")
            user_id = int(row["id"])
            self._update_password(conn, role, user_id, new_password)
            audit(conn, role, user_id, "password_reset")

            changed_note = ""
            if role == "teacher":
                current_teacher = conn.execute(
                    "SELECT employee_id, email FROM teachers WHERE id = ?", (user_id,)
                ).fetchone()
                set_employee_id = ""
                set_email = ""
                if (
                    new_employee_id
                    and new_employee_id != str(current_teacher["employee_id"]).upper()
                ):
                    set_employee_id = new_employee_id
                if new_email and new_email != str(current_teacher["email"]).lower():
                    set_email = new_email
                if set_employee_id:
                    clash = conn.execute(
                        """
                        SELECT id FROM teachers
                        WHERE employee_id = ? COLLATE NOCASE AND id != ?
                        """,
                        (set_employee_id, user_id),
                    ).fetchone()
                    if clash:
                        raise ApiError(409, "That employee ID is already in use.")
                if set_email:
                    clash = conn.execute(
                        """
                        SELECT id FROM teachers
                        WHERE email = ? COLLATE NOCASE AND id != ?
                        """,
                        (set_email, user_id),
                    ).fetchone()
                    if clash:
                        raise ApiError(409, "That e-mail is already in use.")
                if set_employee_id or set_email:
                    conn.execute(
                        "UPDATE teachers SET employee_id = COALESCE(NULLIF(?, ''), employee_id), email = COALESCE(NULLIF(?, ''), email) WHERE id = ?",
                        (set_employee_id, set_email, user_id),
                    )
                    parts = []
                    if set_employee_id:
                        parts.append(f"id {current_teacher['employee_id']} -> {set_employee_id}")
                    if set_email:
                        parts.append(f"email {current_teacher['email']} -> {set_email}")
                    audit(conn, role, user_id, "username_reset", "; ".join(parts))
                    changed_note = " Your sign-in details were updated as well."

            # A forgotten password means the owner may be locked out
            # everywhere; sign out every session for that account.
            conn.execute(
                "DELETE FROM sessions WHERE role = ? AND user_id = ?",
                (role, user_id),
            )
        self._send_json(
            {
                "ok": True,
                "message": "Your password has been updated."
                + changed_note
                + " You can sign in now.",
                "redirect": f"/{role}/login",
            }
        )

    def _logout(self, role: str | None = None) -> None:
        self._delete_current_session(role)
        if role in SESSION_ROLES:
            names = [session_cookie_name(role)]
        else:
            names = [SESSION_COOKIE, *(session_cookie_name(item) for item in SESSION_ROLES)]
        self._send_json(
            {"ok": True, "redirect": "/"},
            extra_headers=[
                (
                    "Set-Cookie",
                    f"{name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
                )
                for name in names
            ],
        )

    def _delete_current_session(self, role: str | None = None) -> None:
        tokens = self._cookie_tokens(role)
        if not tokens:
            return
        fingerprints = [token_fingerprint(token) for token in tokens]
        placeholders = ",".join("?" for _ in fingerprints)
        with get_db() as conn:
            if role in SESSION_ROLES:
                conn.execute(
                    f"DELETE FROM sessions WHERE role = ? AND token_hash IN ({placeholders})",
                    (role, *fingerprints),
                )
            else:
                conn.execute(
                    f"DELETE FROM sessions WHERE token_hash IN ({placeholders})",
                    fingerprints,
                )

    # -------------------------------------------------------------- student
    def _student_overview(self, student_id: int) -> dict:
        with get_db() as conn:
            student = conn.execute(
                """
                SELECT s.id, s.name, s.register_no, s.class_id,
                       c.name AS class_name, c.code AS class_code,
                       c.semester
                FROM students s
                JOIN classes c ON c.id = s.class_id
                WHERE s.id = ? AND s.active = 1
                """,
                (student_id,),
            ).fetchone()
            if not student:
                raise ApiError(401, "Student account not found.")

            totals = conn.execute(
                """
                SELECT COALESCE(SUM(CASE WHEN ar.status = 'present'
                                         THEN ses.span ELSE 0 END), 0)
                           AS attended,
                       COALESCE(SUM(CASE WHEN ar.status IN ('present', 'absent')
                                         THEN ses.span ELSE 0 END), 0)
                           AS total
                FROM attendance_records ar
                JOIN attendance_sessions ses ON ses.id = ar.session_id
                WHERE ar.student_id = ? AND ses.is_holiday = 0
                """,
                (student_id,),
            ).fetchone()
            overall = guidance(totals["attended"], totals["total"])

            subject_rows = conn.execute(
                """
                SELECT sub.id, sub.name, sub.code,
                       COALESCE(SUM(CASE WHEN ar.status IN ('present', 'absent')
                                         THEN ses.span ELSE 0 END), 0)
                           AS total,
                       COALESCE(SUM(CASE WHEN ar.status = 'present'
                                         THEN ses.span ELSE 0 END), 0)
                           AS attended
                FROM attendance_records ar
                JOIN attendance_sessions ses ON ses.id = ar.session_id
                JOIN subjects sub ON sub.id = ses.subject_id
                WHERE ar.student_id = ? AND ses.is_holiday = 0
                GROUP BY sub.id, sub.name, sub.code
                ORDER BY sub.code
                """,
                (student_id,),
            ).fetchall()
            subjects = []
            for row in subject_rows:
                subjects.append(
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "code": row["code"],
                        **guidance(row["attended"], row["total"]),
                    }
                )

            recent_rows = conn.execute(
                """
                SELECT ses.attendance_date AS date, ses.period, ses.span,
                       ses.is_holiday, ses.is_substitution,
                       sub.name AS subject_name, sub.code AS subject_code,
                       act_t.name AS teacher_name,
                       CASE WHEN ses.is_holiday = 1
                            THEN 'holiday' ELSE ar.status END AS status
                FROM attendance_sessions ses
                JOIN subjects sub ON sub.id = ses.subject_id
                LEFT JOIN teachers act_t ON act_t.id = ses.teacher_id
                LEFT JOIN attendance_records ar
                  ON ar.session_id = ses.id AND ar.student_id = ?
                WHERE ses.class_id = ?
                  AND (ses.is_holiday = 1 OR ar.student_id IS NOT NULL)
                ORDER BY ses.attendance_date DESC, ses.period DESC, ses.id DESC
                LIMIT 12
                """,
                (student_id, student["class_id"]),
            ).fetchall()

            timetable = timetable_days(conn, student["class_id"])
            today = date.today()
            today_slots: list[dict] = []
            if today.weekday() < 5:
                today_slots = [
                    dict(slot)
                    for slot in timetable[today.weekday()]["slots"]
                ]
                holiday_periods = {
                    int(row["period"])
                    for row in conn.execute(
                        """
                        SELECT period, is_holiday
                        FROM attendance_sessions
                        WHERE class_id = ? AND attendance_date = ?
                        """,
                        (student["class_id"], today.isoformat()),
                    ).fetchall()
                    if row["is_holiday"]
                }
                for slot in today_slots:
                    slot["is_holiday"] = slot["period"] in holiday_periods

        return {
            "ok": True,
            "student": {
                "id": student["id"],
                "name": student["name"],
                "register_no": student["register_no"],
                "class_name": student["class_name"],
                "class_code": student["class_code"],
                "semester": student["semester"],
            },
            "overall": overall,
            "subjects": subjects,
            "recent": [dict(row) for row in recent_rows],
            "timetable": timetable,
            "today": {
                "date": today.isoformat(),
                "day": (
                    WEEKDAYS[today.weekday()]
                    if today.weekday() < 5
                    else ""
                ),
                "slots": today_slots,
            },
            "campus": {
                "college": COLLEGE_NAME,
                "short": COLLEGE_SHORT,
                "campus": CAMPUS,
                "school": SCHOOL,
                "program": PROGRAM,
                "batch": BATCH,
            },
            "server_date": date.today().isoformat(),
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        }

    # -------------------------------------------------------------- teacher
    def _teacher_context(self, teacher_id: int, *, admin: bool = False) -> tuple[dict, list[dict]]:
        with get_db() as conn:
            if admin:
                row = conn.execute(
                    "SELECT id, username, name, email, dob, qualification, photo_base64, bio FROM admins WHERE id = ?",
                    (teacher_id,),
                ).fetchone()
                if not row:
                    raise ApiError(401, "Admin account not found.")
                teacher = {
                    "id": row["id"],
                    "name": row["name"],
                    "employee_id": row["username"],
                    "email": row["email"] or f"{row['username'].lower()}@gvpihlr.edu.in",
                    "department": "Administration",
                    "dob": row["dob"] or "",
                    "qualification": row["qualification"] or "",
                    "photo_base64": row["photo_base64"] or "",
                    "bio": row["bio"] or "",
                }
                rows = conn.execute(
                    """
                    SELECT c.id AS class_id, c.code AS class_code,
                           c.name AS class_name, c.semester,
                           sub.id AS subject_id, sub.name AS subject_name,
                           sub.code AS subject_code,
                           (SELECT COUNT(*) FROM students st
                            WHERE st.class_id = c.id AND st.active = 1) AS student_count
                    FROM classes c
                    CROSS JOIN subjects sub
                    ORDER BY c.id, sub.code
                    """
                ).fetchall()
            else:
                teacher_row = conn.execute(
                    """
                    SELECT id, name, employee_id, email, department,
                           dob, qualification, photo_base64, bio
                    FROM teachers WHERE id = ?
                    """,
                    (teacher_id,),
                ).fetchone()
                if not teacher_row:
                    raise ApiError(401, "Teacher account not found.")
                teacher = {
                    "id": teacher_row["id"],
                    "name": teacher_row["name"],
                    "employee_id": teacher_row["employee_id"],
                    "email": teacher_row["email"],
                    "department": teacher_row["department"],
                    "dob": teacher_row["dob"] or "",
                    "qualification": teacher_row["qualification"] or "",
                    "photo_base64": teacher_row["photo_base64"] or "",
                    "bio": teacher_row["bio"] or "",
                }
                rows = conn.execute(
                    """
                    SELECT ta.class_id, ta.subject_id,
                           c.code AS class_code, c.name AS class_name,
                           c.semester, sub.name AS subject_name, sub.code AS subject_code,
                           (SELECT COUNT(*) FROM students st
                            WHERE st.class_id = c.id AND st.active = 1) AS student_count
                    FROM teacher_assignments ta
                    JOIN classes c ON c.id = ta.class_id
                    JOIN subjects sub ON sub.id = ta.subject_id
                    WHERE ta.teacher_id = ?
                    ORDER BY c.id, sub.code
                    """,
                    (teacher_id,),
                ).fetchall()
        assignments = [dict(row) for row in rows]
        classes: dict[int, dict] = {}
        for item in assignments:
            class_item = classes.setdefault(
                item["class_id"],
                {
                    "id": item["class_id"],
                    "code": item["class_code"],
                    "name": item["class_name"],
                    "semester": item["semester"],
                    "student_count": item["student_count"],
                    "subjects": [],
                },
            )
            class_item["subjects"].append(
                {
                    "id": item["subject_id"],
                    "name": item["subject_name"],
                    "code": item["subject_code"],
                }
            )
        return dict(teacher), list(classes.values())

    def _teacher_overview(self, teacher_id: int, *, admin: bool = False) -> dict:
        teacher, classes = self._teacher_context(teacher_id, admin=admin)
        with get_db() as conn:
            if admin:
                student_count = conn.execute(
                    "SELECT COUNT(*) FROM students WHERE active = 1"
                ).fetchone()[0]
            else:
                student_count = conn.execute(
                    """
                    SELECT COUNT(DISTINCT st.id)
                    FROM students st
                    WHERE st.active = 1 AND st.class_id IN (
                        SELECT class_id FROM teacher_assignments WHERE teacher_id = ?
                    )
                    """,
                    (teacher_id,),
                ).fetchone()[0]
            today = date.today().isoformat()
            if admin:
                today_sessions = conn.execute(
                    """
                    SELECT COUNT(DISTINCT ses.id) AS sessions,
                           COUNT(ar.student_id) AS marked,
                           COALESCE(SUM(ar.status = 'present'), 0) AS present
                    FROM attendance_sessions ses
                    LEFT JOIN attendance_records ar ON ar.session_id = ses.id
                    WHERE ses.attendance_date = ?
                    """,
                    (today,),
                ).fetchone()
                recent_rows = conn.execute(
                    """
                    SELECT ses.id AS session_id, ses.attendance_date AS date,
                           ses.period, ses.span, ses.is_holiday,
                           ses.teacher_id, ses.marked_by_teacher_id,
                           ses.is_substitution, ses.substitution_note,
                           c.id AS class_id, c.code AS class_code,
                           sub.id AS subject_id, sub.code AS subject_code,
                           sub.name AS subject_name,
                           t.name AS teacher_name,
                           t.employee_id AS teacher_employee_id,
                           st.name AS scheduled_teacher_name,
                           COUNT(ar.student_id) AS marked,
                           COALESCE(SUM(ar.status = 'present'), 0) AS present,
                           COALESCE(SUM(ar.status = 'absent'), 0) AS absent,
                           ses.updated_at
                    FROM attendance_sessions ses
                    JOIN classes c ON c.id = ses.class_id
                    JOIN subjects sub ON sub.id = ses.subject_id
                    LEFT JOIN teachers t ON t.id = ses.teacher_id
                    LEFT JOIN teachers st
                      ON st.id = COALESCE(ses.scheduled_teacher_id, ses.teacher_id)
                    LEFT JOIN attendance_records ar ON ar.session_id = ses.id
                    GROUP BY ses.id
                    ORDER BY ses.attendance_date DESC, ses.period DESC, ses.id DESC
                    LIMIT 12
                    """
                ).fetchall()
            else:
                today_sessions = conn.execute(
                    """
                    SELECT COUNT(DISTINCT ses.id) AS sessions,
                           COUNT(ar.student_id) AS marked,
                           COALESCE(SUM(ar.status = 'present'), 0) AS present
                    FROM attendance_sessions ses
                    LEFT JOIN attendance_records ar ON ar.session_id = ses.id
                    WHERE ses.attendance_date = ?
                      AND (
                        ses.teacher_id = ?
                        OR EXISTS (
                          SELECT 1 FROM teacher_assignments ta
                          WHERE ta.class_id = ses.class_id
                            AND ta.subject_id = ses.subject_id
                            AND ta.teacher_id = ?
                        )
                      )
                    """,
                    (today, teacher_id, teacher_id),
                ).fetchone()
                recent_rows = conn.execute(
                    """
                    SELECT ses.id AS session_id, ses.attendance_date AS date,
                           ses.period, ses.span, ses.is_holiday,
                           ses.teacher_id, ses.marked_by_teacher_id,
                           ses.is_substitution, ses.substitution_note,
                           c.id AS class_id, c.code AS class_code,
                           sub.id AS subject_id, sub.code AS subject_code,
                           sub.name AS subject_name,
                           t.name AS teacher_name,
                           t.employee_id AS teacher_employee_id,
                           st.name AS scheduled_teacher_name,
                           COUNT(ar.student_id) AS marked,
                           COALESCE(SUM(ar.status = 'present'), 0) AS present,
                           COALESCE(SUM(ar.status = 'absent'), 0) AS absent,
                           ses.updated_at
                    FROM attendance_sessions ses
                    JOIN classes c ON c.id = ses.class_id
                    JOIN subjects sub ON sub.id = ses.subject_id
                    LEFT JOIN teachers t ON t.id = ses.teacher_id
                    LEFT JOIN teachers st
                      ON st.id = COALESCE(ses.scheduled_teacher_id, ses.teacher_id)
                    LEFT JOIN attendance_records ar ON ar.session_id = ses.id
                    WHERE ses.attendance_date = ?
                      AND (
                        ses.teacher_id = ?
                        OR EXISTS (
                          SELECT 1 FROM teacher_assignments ta
                          WHERE ta.class_id = ses.class_id
                            AND ta.subject_id = ses.subject_id
                            AND ta.teacher_id = ?
                        )
                      )
                    GROUP BY ses.id
                    ORDER BY ses.attendance_date DESC, ses.period DESC, ses.id DESC
                    LIMIT 10
                    """,
                    (today, teacher_id, teacher_id),
                ).fetchall()

        today_percentage = None
        if today_sessions["marked"]:
            today_percentage = round(
                (today_sessions["present"] / today_sessions["marked"]) * 100, 1
            )
        recent_sessions = []
        for row in recent_rows:
            item = dict(row)
            if item["is_holiday"]:
                item["percentage"] = None
            elif item["marked"]:
                item["percentage"] = round(
                    (item["present"] / item["marked"]) * 100, 1
                )
            else:
                item["percentage"] = 0.0
            recent_sessions.append(item)

        class_id = classes[0]["id"] if classes else None
        subject_ids = {
            subject["id"]
            for class_item in classes
            for subject in class_item["subjects"]
        }
        timetables_by_class: dict[str, list[dict]] = {}
        with get_db() as conn:
            for class_item in classes:
                cid = class_item["id"]
                c_tt = timetable_days(conn, cid)
                for day in c_tt:
                    for slot in day["slots"]:
                        slot["class_id"] = cid
                        slot["can_mark"] = True if admin else slot["subject_id"] in subject_ids
                        slot["can_substitute"] = bool(
                            not admin
                            and not slot["can_mark"]
                            and slot["primary_teacher_id"]
                            and int(slot["primary_teacher_id"]) != teacher_id
                        )
                timetables_by_class[str(cid)] = c_tt

        timetable = timetables_by_class.get(str(class_id), []) if class_id else []
        today = date.today()
        today_slots: list[dict] = []
        if today.weekday() < 5 and timetable:
            today_slots = [
                dict(slot) for slot in timetable[today.weekday()]["slots"]
            ]
            if class_id:
                with get_db() as conn:
                    holiday_periods = {
                        int(row["period"])
                        for row in conn.execute(
                            """
                            SELECT period, is_holiday
                            FROM attendance_sessions
                            WHERE class_id = ? AND attendance_date = ?
                            """,
                            (class_id, today.isoformat()),
                        ).fetchall()
                        if row["is_holiday"]
                    }
                for slot in today_slots:
                    slot["is_holiday"] = slot["period"] in holiday_periods

        return {
            "ok": True,
            "admin_view": bool(admin),
            "teacher": teacher,
            "classes": classes,
            "faculty": [
                {"id": row["id"], "name": row["name"], "employee_id": row["employee_id"]}
                for row in _all_teachers()
            ],
            "assignments": [
                item
                for class_item in classes
                for item in [
                    {
                        "class_id": class_item["id"],
                        "class_code": class_item["code"],
                        "class_name": class_item["name"],
                        "semester": class_item["semester"],
                        "student_count": class_item["student_count"],
                        "subject_id": subject["id"],
                        "subject_name": subject["name"],
                        "subject_code": subject["code"],
                    }
                    for subject in class_item["subjects"]
                ]
            ],
            "stats": {
                "classes": len(classes),
                "students": student_count,
                "sessions_today": today_sessions["sessions"],
                "marked_today": today_sessions["marked"],
                "percentage_today": today_percentage,
            },
            "recent_sessions": recent_sessions,
            "timetable": timetable,
            "timetables_by_class": timetables_by_class,
            "today": {
                "date": today.isoformat(),
                "day": (
                    WEEKDAYS[today.weekday()]
                    if today.weekday() < 5
                    else ""
                ),
                "slots": today_slots,
            },
            "campus": {
                "college": COLLEGE_NAME,
                "short": COLLEGE_SHORT,
                "campus": CAMPUS,
                "school": SCHOOL,
                "program": PROGRAM,
                "batch": BATCH,
            },
            "server_date": date.today().isoformat(),
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        }

    def _assignment_for(
        self, conn: sqlite3.Connection, teacher_id: int, class_id: int, subject_id: int
    ) -> sqlite3.Row:
        row = conn.execute(
            """
            SELECT ta.class_id, ta.subject_id, c.code AS class_code,
                   c.name AS class_name, sub.code AS subject_code,
                   sub.name AS subject_name
            FROM teacher_assignments ta
            JOIN classes c ON c.id = ta.class_id
            JOIN subjects sub ON sub.id = ta.subject_id
            WHERE ta.teacher_id = ? AND ta.class_id = ? AND ta.subject_id = ?
            """,
            (teacher_id, class_id, subject_id),
        ).fetchone()
        if not row:
            raise ApiError(403, "You are not assigned to this class and subject.")
        return row

    def _teacher_roster(self, teacher_id: int, query: dict, *, admin: bool = False) -> dict:
        message = "Choose a class, subject and period."
        class_id = parse_integer(query.get("class_id", [""])[0], message)
        subject_id = parse_integer(query.get("subject_id", [""])[0], message)
        period = parse_integer(query.get("period", [""])[0], message)
        if class_id <= 0 or subject_id <= 0:
            raise ApiError(400, message)
        raw_date = query.get("date", [date.today().isoformat()])[0]
        selected_date = parse_date(raw_date)
        if not 1 <= period <= 7:
            raise ApiError(400, "Period must be between 1 and 7.")

        substitute_requested = str(query.get("substitute", ["0"])[0]).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        designated_teacher_id = None
        raw_designated = str(query.get("substitute_teacher_id", [""])[0]).strip()
        if raw_designated:
            designated_teacher_id = parse_integer(
                raw_designated, "Choose a valid substitute teacher."
            )
            if designated_teacher_id <= 0:
                raise ApiError(400, "Choose a valid substitute teacher.")

        with get_db() as conn:
            slot = timetable_slot(
                conn, class_id, selected_date.weekday(), period, subject_id
            )
            is_assigned = False
            substitution = False
            if admin:
                assignment = conn.execute(
                    """
                    SELECT c.id AS class_id, c.code AS class_code,
                           c.name AS class_name,
                           sub.id AS subject_id, sub.code AS subject_code,
                           sub.name AS subject_name
                    FROM classes c, subjects sub
                    WHERE c.id = ? AND sub.id = ?
                    """,
                    (class_id, subject_id),
                ).fetchone()
                if not assignment:
                    raise ApiError(404, "Class or subject not found.")
            else:
                try:
                    assignment = self._assignment_for(
                        conn, teacher_id, class_id, subject_id
                    )
                    is_assigned = True
                except ApiError:
                    if not substitute_requested:
                        raise
                    if not slot:
                        raise ApiError(
                            400,
                            "That subject is not scheduled in this period on the "
                            "selected day.",
                        ) from None
                    if not slot["primary_teacher_id"]:
                        raise ApiError(
                            400,
                            "This period has no assigned teacher to cover.",
                        ) from None
                    assignment = conn.execute(
                        """
                        SELECT c.id AS class_id, c.code AS class_code,
                               c.name AS class_name,
                               sub.id AS subject_id, sub.code AS subject_code,
                               sub.name AS subject_name
                        FROM classes c, subjects sub
                        WHERE c.id = ? AND sub.id = ?
                        """,
                        (class_id, subject_id),
                    ).fetchone()
                    if not assignment:
                        raise ApiError(404, "Class or subject not found.") from None
                    substitution = int(slot["primary_teacher_id"]) != teacher_id
            students = conn.execute(
                """
                SELECT id, register_no, name
                FROM students
                WHERE class_id = ? AND active = 1
                ORDER BY register_no
                """,
                (class_id,),
            ).fetchall()
            session = conn.execute(
                """
                SELECT id, created_at, updated_at, span, is_holiday, teacher_id,
                       scheduled_teacher_id, is_substitution, substitution_note
                FROM attendance_sessions
                WHERE class_id = ? AND subject_id = ?
                  AND attendance_date = ? AND period = ?
                """,
                (class_id, subject_id, selected_date.isoformat(), period),
            ).fetchone()
            if not session and not slot:
                raise ApiError(
                    400,
                    "That subject is not scheduled in this period on the "
                    "selected day.",
                )
            if session and not admin and not is_assigned:
                session_teacher_id = int(session["teacher_id"])
                if session_teacher_id != teacher_id:
                    holder = conn.execute(
                        "SELECT name FROM teachers WHERE id = ?",
                        (session_teacher_id,),
                    ).fetchone()
                    raise ApiError(
                        403,
                        "This period has already been recorded by "
                        f"{holder['name'] if holder else 'another teacher'}. "
                        "Ask the principal to correct it.",
                    )
            scheduled_teacher_name = ""
            if session and session["scheduled_teacher_id"]:
                scheduled_row = conn.execute(
                    "SELECT name FROM teachers WHERE id = ?",
                    (session["scheduled_teacher_id"],),
                ).fetchone()
                scheduled_teacher_name = (
                    scheduled_row["name"] if scheduled_row else ""
                )
            elif slot and slot["primary_teacher_name"]:
                scheduled_teacher_name = slot["primary_teacher_name"]
            session_teacher_name = ""
            if session:
                actual_row = conn.execute(
                    "SELECT name FROM teachers WHERE id = ?",
                    (session["teacher_id"],),
                ).fetchone()
                session_teacher_name = actual_row["name"] if actual_row else ""
            effective_substitution = (
                bool(session["is_substitution"]) if session else substitution
            )
            span = int(session["span"]) if session else int(slot["span"])
            is_holiday = bool(session["is_holiday"]) if session else False
            faculty = (slot["faculty_label"] if slot else "") or ""
            first = PERIODS[period - 1]
            last = PERIODS[period + span - 2]
            time_label = (
                f"{pretty_time(first['start'])} – "
                f"{pretty_time(last['end'])}"
            )
            period_label = (
                f"P{period}"
                if span == 1
                else f"P{period}–P{period + span - 1}"
            )
            statuses: dict[int, str] = {}
            if session:
                rows = conn.execute(
                    """
                    SELECT student_id, status
                    FROM attendance_records WHERE session_id = ?
                    """,
                    (session["id"],),
                ).fetchall()
                statuses = {int(row["student_id"]): row["status"] for row in rows}

            stats_rows = conn.execute(
                """
                SELECT ar.student_id,
                       COALESCE(SUM(CASE WHEN ar.status = 'present' THEN ses.span ELSE 0 END), 0) AS attended,
                       COALESCE(SUM(ses.span), 0) AS total
                FROM attendance_records ar
                JOIN attendance_sessions ses ON ses.id = ar.session_id
                WHERE ses.class_id = ? AND ses.is_holiday = 0
                GROUP BY ar.student_id
                """,
                (class_id,),
            ).fetchall()
            stats_map = {
                int(r["student_id"]): {
                    "attended": int(r["attended"]),
                    "total": int(r["total"]),
                    "percentage": round((int(r["attended"]) / int(r["total"])) * 100, 1) if int(r["total"]) > 0 else 0.0,
                }
                for r in stats_rows
            }

        roster = [
            {
                "id": row["id"],
                "register_no": row["register_no"],
                "name": row["name"],
                "status": statuses.get(int(row["id"])),
                "attended": stats_map.get(int(row["id"]), {}).get("attended", 0),
                "total": stats_map.get(int(row["id"]), {}).get("total", 0),
                "percentage": stats_map.get(int(row["id"]), {}).get("percentage", 0.0),
            }
            for row in students
        ]
        return {
            "ok": True,
            "class": {
                "id": assignment["class_id"],
                "code": assignment["class_code"],
                "name": assignment["class_name"],
            },
            "subject": {
                "id": assignment["subject_id"],
                "code": assignment["subject_code"],
                "name": assignment["subject_name"],
            },
            "date": selected_date.isoformat(),
            "period": period,
            "period_label": period_label,
            "span": span,
            "is_holiday": is_holiday,
            "faculty": faculty,
            "is_substitution": effective_substitution,
            "scheduled_teacher_name": scheduled_teacher_name,
            "session_teacher_name": session_teacher_name,
            "substitution_note": (
                session["substitution_note"] if session else None
            ),
            "time_label": time_label,
            "session_id": session["id"] if session else None,
            "is_existing": bool(session),
            "created_at": session["created_at"] if session else None,
            "updated_at": session["updated_at"] if session else None,
            "students": roster,
        }

    def _save_attendance(self, teacher_id: int, payload: dict, *, admin: bool = False) -> dict:
        message = "Choose a class, subject and period."
        class_id = parse_integer(payload.get("class_id"), message)
        subject_id = parse_integer(payload.get("subject_id"), message)
        period = parse_integer(payload.get("period"), message)
        if class_id <= 0 or subject_id <= 0:
            raise ApiError(400, message)
        selected_date = parse_date(str(payload.get("date", "")))
        if not 1 <= period <= 7:
            raise ApiError(400, "Period must be between 1 and 7.")
        raw_holiday = payload.get("holiday", False)
        if not isinstance(raw_holiday, bool):
            raise ApiError(400, "The holiday flag must be true or false.")
        holiday = raw_holiday
        raw_substitute = payload.get("substitute", False)
        if not isinstance(raw_substitute, bool):
            raise ApiError(400, "The substitute flag must be true or false.")
        substitute_requested = raw_substitute
        note = str(payload.get("note", "") or "").strip()
        if len(note) > 200:
            raise ApiError(
                400, "The substitution note must be 200 characters or fewer."
            )

        status_by_student: dict[int, str] = {}
        if not holiday:
            records = payload.get("records")
            if not isinstance(records, list) or not records:
                raise ApiError(400, "No attendance was submitted.")
            for item in records:
                if not isinstance(item, dict):
                    raise ApiError(400, "Attendance data is invalid.")
                student_id = parse_integer(
                    item.get("student_id"), "Attendance data is invalid."
                )
                if student_id <= 0:
                    raise ApiError(400, "Attendance data is invalid.")
                status = str(item.get("status", "")).lower()
                if status not in {"present", "absent"}:
                    raise ApiError(
                        400, "Each student must be marked present or absent."
                    )
                status_by_student[student_id] = status

        now_iso = datetime.now().isoformat(timespec="seconds")
        with get_db() as conn:
            slot = timetable_slot(
                conn, class_id, selected_date.weekday(), period, subject_id
            )
            is_assigned = False
            if admin:
                class_row = conn.execute(
                    "SELECT id FROM classes WHERE id = ?", (class_id,)
                ).fetchone()
                subject_row = conn.execute(
                    "SELECT id FROM subjects WHERE id = ?", (subject_id,)
                ).fetchone()
                if not class_row or not subject_row:
                    raise ApiError(404, "Class or subject not found.")
            else:
                try:
                    self._assignment_for(conn, teacher_id, class_id, subject_id)
                    is_assigned = True
                except ApiError:
                    if not substitute_requested:
                        raise
                    if not slot:
                        raise ApiError(
                            400,
                            "That subject is not scheduled in this period on the "
                            "selected day.",
                        ) from None
                    if not slot["primary_teacher_id"]:
                        raise ApiError(
                            400,
                            "This period has no assigned teacher to cover.",
                        ) from None
            existing = conn.execute(
                """
                SELECT id, teacher_id, span, is_holiday, scheduled_teacher_id,
                       is_substitution, substitution_note
                FROM attendance_sessions
                WHERE class_id = ? AND subject_id = ?
                  AND attendance_date = ? AND period = ?
                """,
                (class_id, subject_id, selected_date.isoformat(), period),
            ).fetchone()
            if not existing and not slot:
                raise ApiError(
                    400,
                    "That subject is not scheduled in this period on the "
                    "selected day.",
                )
            if (
                existing
                and not admin
                and not is_assigned
                and int(existing["teacher_id"]) != teacher_id
                and not substitute_requested
            ):
                holder = conn.execute(
                    "SELECT name FROM teachers WHERE id = ?",
                    (int(existing["teacher_id"]),),
                ).fetchone()
                raise ApiError(
                    403,
                    "This period has already been recorded by "
                    f"{holder['name'] if holder else 'another teacher'}. "
                    "Ask the principal or mark as substitute to correct it.",
                )
            span = (
                int(slot["span"])
                if slot
                else int(existing["span"]) if existing else 1
            )
            created = existing is None
            if existing:
                if substitute_requested and not admin:
                    session_teacher_id = teacher_id
                    scheduled_teacher_id = (
                        int(slot["primary_teacher_id"])
                        if slot and slot["primary_teacher_id"]
                        else int(existing["scheduled_teacher_id"] or existing["teacher_id"])
                    )
                    is_substitution = 1
                    scheduled = conn.execute(
                        "SELECT name FROM teachers WHERE id = ?",
                        (scheduled_teacher_id,),
                    ).fetchone()
                    substitution_note = note or (
                        f"Substitute for {scheduled['name']}"
                        if scheduled
                        else "Substitute teacher"
                    )
                else:
                    # Keep the teacher who actually took the class; an admin
                    # correcting a record must not steal the attribution.
                    session_teacher_id = int(existing["teacher_id"])
                    scheduled_teacher_id = (
                        int(existing["scheduled_teacher_id"])
                        if existing["scheduled_teacher_id"]
                        else (
                            int(slot["primary_teacher_id"])
                            if slot and slot["primary_teacher_id"]
                            else session_teacher_id
                        )
                    )
                    is_substitution = int(existing["is_substitution"])
                    substitution_note = existing["substitution_note"]
            elif admin:
                session_teacher_id = (
                    int(slot["primary_teacher_id"])
                    if slot["primary_teacher_id"]
                    else None
                )
                if not session_teacher_id:
                    raise ApiError(
                        400,
                        "This period has no assigned teacher. Choose a period "
                        "with a scheduled subject, or update an existing record.",
                    )
                scheduled_teacher_id = session_teacher_id
                is_substitution = 0
                substitution_note = None
            else:
                session_teacher_id = teacher_id
                scheduled_teacher_id = (
                    int(slot["primary_teacher_id"])
                    if slot and slot["primary_teacher_id"]
                    else teacher_id
                )
                is_substitution = (
                    1
                    if substitute_requested
                    and scheduled_teacher_id != teacher_id
                    else 0
                )
                substitution_note = note or None
                if is_substitution and not substitution_note:
                    scheduled = conn.execute(
                        "SELECT name FROM teachers WHERE id = ?",
                        (scheduled_teacher_id,),
                    ).fetchone()
                    substitution_note = (
                        f"Substitute for {scheduled['name']}"
                        if scheduled
                        else "Substitute teacher"
                    )

            if not holiday:
                roster_ids = {
                    int(row["id"])
                    for row in conn.execute(
                        """
                        SELECT id FROM students
                        WHERE class_id = ? AND active = 1
                        """,
                        (class_id,),
                    ).fetchall()
                }
                if not roster_ids:
                    raise ApiError(400, "This class has no active students.")
                if set(status_by_student) != roster_ids:
                    raise ApiError(
                        400,
                        "Please mark every student in the class before saving.",
                    )

            if existing:
                session_id = int(existing["id"])
                conn.execute(
                    """
                    UPDATE attendance_sessions
                    SET updated_at = ?, teacher_id = ?, span = ?,
                        is_holiday = ?, scheduled_teacher_id = ?,
                        is_substitution = ?, substitution_note = ?
                    WHERE id = ?
                    """,
                    (
                        now_iso,
                        session_teacher_id,
                        span,
                        1 if holiday else 0,
                        scheduled_teacher_id,
                        is_substitution,
                        substitution_note,
                        session_id,
                    ),
                )
            else:
                cur = conn.execute(
                    """
                    INSERT INTO attendance_sessions
                        (class_id, subject_id, teacher_id, attendance_date,
                         period, span, is_holiday, scheduled_teacher_id,
                         is_substitution, substitution_note, created_at,
                         updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        class_id,
                        subject_id,
                        session_teacher_id,
                        selected_date.isoformat(),
                        period,
                        span,
                        1 if holiday else 0,
                        scheduled_teacher_id,
                        is_substitution,
                        substitution_note,
                        now_iso,
                        now_iso,
                    ),
                )
                session_id = int(cur.lastrowid)

            if holiday:
                conn.execute(
                    "DELETE FROM attendance_records WHERE session_id = ?",
                    (session_id,),
                )
            else:
                conn.executemany(
                    """
                    INSERT INTO attendance_records
                        (session_id, student_id, status)
                    VALUES (?, ?, ?)
                    ON CONFLICT(session_id, student_id)
                    DO UPDATE SET status = excluded.status
                    """,
                    [
                        (session_id, student_id, status)
                        for student_id, status in status_by_student.items()
                    ],
                )

            audit(
                conn,
                "admin" if admin else "teacher",
                teacher_id,
                "attendance_holiday" if holiday else "attendance_saved",
                f"class={class_id} subject={subject_id} date={selected_date.isoformat()} period={period}"
                + (" substitution" if is_substitution else ""),
            )

        if holiday:
            return {
                "ok": True,
                "message": (
                    "Holiday saved. This period is excluded from attendance."
                ),
                "session_id": session_id,
                "created": created,
                "holiday": True,
                "span": span,
                "summary": {
                    "present": 0,
                    "absent": 0,
                    "total": 0,
                    "percentage": None,
                },
            }

        present = sum(
            1 for value in status_by_student.values() if value == "present"
        )
        absent = len(status_by_student) - present
        percentage = round((present / len(status_by_student)) * 100, 1)
        return {
            "ok": True,
            "message": (
                "Attendance saved. The live student dashboard has been updated."
                if created
                else "Attendance updated successfully."
            ),
            "session_id": session_id,
            "created": created,
            "holiday": False,
            "span": span,
            "summary": {
                "present": present,
                "absent": absent,
                "total": len(status_by_student),
                "percentage": percentage,
            },
        }

    def _add_student(self) -> None:
        session, is_admin = self._require_staff_session()
        if not is_admin:
            raise ApiError(403, "Administrator access required.")
        payload = self._read_json()
        name = str(payload.get("name", "")).strip()
        register_no = str(payload.get("register_no", "")).strip().upper()
        class_id = parse_integer(payload.get("class_id"), "Choose a valid class / section.")
        email = str(payload.get("email", "")).strip().lower() or None
        password = str(payload.get("password", "")).strip() or "student123"

        if not name:
            raise ApiError(400, "Student name is required.")
        if not register_no:
            raise ApiError(400, "Register number is required.")
        if len(name) > 100 or len(register_no) > 30:
            raise ApiError(400, "Name or register number is too long.")

        with get_db() as conn:
            class_row = conn.execute("SELECT id, name, code FROM classes WHERE id = ?", (class_id,)).fetchone()
            if not class_row:
                raise ApiError(404, "Selected class does not exist.")
            existing = conn.execute("SELECT id FROM students WHERE register_no = ? COLLATE NOCASE", (register_no,)).fetchone()
            if existing:
                raise ApiError(400, f"A student with register number {register_no} already exists.")
            cur = conn.execute(
                """
                INSERT INTO students (register_no, name, email, password_hash, class_id, active, must_change_password)
                VALUES (?, ?, ?, ?, ?, 1, 1)
                """,
                (register_no, name, email, hash_password(password), class_id),
            )
            audit(conn, "admin", session["user_id"], "create_student", f"{register_no} - {name} ({class_row['code']})")
            conn.commit()
            self._send_json({
                "ok": True,
                "message": f"Student {name} ({register_no}) enrolled into {class_row['code']} successfully.",
                "student_id": cur.lastrowid,
            })

    def _add_teacher(self) -> None:
        session, is_admin = self._require_staff_session()
        if not is_admin:
            raise ApiError(403, "Administrator access required.")
        payload = self._read_json()
        name = str(payload.get("name", "")).strip()
        employee_id = str(payload.get("employee_id", "")).strip().upper()
        email = str(payload.get("email", "")).strip().lower()
        department = str(payload.get("department", "")).strip() or "Computer Applications"
        password = str(payload.get("password", "")).strip() or "teacher123"

        if not name or not employee_id or not email:
            raise ApiError(400, "Faculty name, employee ID, and email are required.")

        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM teachers WHERE employee_id = ? COLLATE NOCASE OR email = ? COLLATE NOCASE",
                (employee_id, email),
            ).fetchone()
            if existing:
                raise ApiError(400, f"Faculty with employee ID {employee_id} or email {email} already exists.")
            cur = conn.execute(
                """
                INSERT INTO teachers (employee_id, name, email, password_hash, department, must_change_password)
                VALUES (?, ?, ?, ?, ?, 1)
                """,
                (employee_id, name, email, hash_password(password), department),
            )
            audit(conn, "admin", session["user_id"], "create_teacher", f"{employee_id} - {name} ({department})")
            conn.commit()
            self._send_json({
                "ok": True,
                "message": f"Faculty {name} ({employee_id}) registered successfully.",
                "teacher_id": cur.lastrowid,
            })

    def _import_students(self) -> None:
        session, is_admin = self._require_staff_session()
        if not is_admin:
            raise ApiError(403, "Administrator access required.")
        payload = self._read_json()

        rows_to_process: list[dict] = []
        if "rows" in payload and isinstance(payload["rows"], list):
            rows_to_process = payload["rows"]
        elif "csv_text" in payload:
            import csv
            reader = csv.DictReader(io.StringIO(payload["csv_text"]))
            for r in reader:
                rows_to_process.append(dict(r))
        elif "file_base64" in payload:
            import base64
            file_bytes = base64.b64decode(payload["file_base64"])
            filename = str(payload.get("filename", "")).lower()
            if filename.endswith(".csv"):
                import csv
                text = file_bytes.decode("utf-8", errors="ignore")
                reader = csv.DictReader(io.StringIO(text))
                for r in reader:
                    rows_to_process.append(dict(r))
            else:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
                ws = wb.active
                sheet_rows = list(ws.iter_rows(values_only=True))
                if sheet_rows:
                    header = [str(h or "").strip().lower() for h in sheet_rows[0]]
                    for row in sheet_rows[1:]:
                        if not any(row):
                            continue
                        row_dict = {}
                        for idx, val in enumerate(row):
                            if idx < len(header) and header[idx]:
                                row_dict[header[idx]] = str(val if val is not None else "").strip()
                        rows_to_process.append(row_dict)

        if not rows_to_process:
            raise ApiError(400, "No student records found in the uploaded file.")

        with get_db() as conn:
            classes_map = {row["code"].upper(): row["id"] for row in conn.execute("SELECT id, code FROM classes").fetchall()}
            imported_count = 0
            skipped_count = 0
            by_class_summary: dict[str, int] = defaultdict(int)

            for item in rows_to_process:
                name = (
                    item.get("name") or item.get("student_name") or item.get("student name")
                    or item.get("fullname") or item.get("student") or ""
                ).strip()

                reg_no = (
                    item.get("register_no") or item.get("regno") or item.get("roll_no")
                    or item.get("rollno") or item.get("reg_no") or item.get("htno")
                    or item.get("pin") or item.get("roll") or item.get("id") or ""
                ).strip().upper()

                if not reg_no or not name:
                    skipped_count += 1
                    continue

                email = (item.get("email") or item.get("mail") or "").strip().lower() or None
                course_raw = (
                    item.get("class") or item.get("course") or item.get("branch")
                    or item.get("section") or item.get("dept") or item.get("department") or ""
                ).strip().lower()

                target_code = "MCA-GEN"
                if "ai" in course_raw or "artificial" in course_raw:
                    target_code = "MCA-AI"
                elif "mca" in course_raw or "gen" in course_raw:
                    target_code = "MCA-GEN"
                elif course_raw:
                    clean_code = re.sub(r"[^A-Za-z0-9\-]", "", course_raw.upper())[:15]
                    target_code = clean_code if clean_code else "MCA-GEN"
                elif reg_no.startswith("26PSMCI"):
                    target_code = "MCA-AI"
                elif reg_no.startswith("26PSMCA"):
                    target_code = "MCA-GEN"

                if target_code not in classes_map:
                    display_name = course_raw.strip().title() if course_raw else f"Class {target_code}"
                    cur_c = conn.execute(
                        "INSERT INTO classes (code, name, semester) VALUES (?, ?, ?)",
                        (target_code, display_name, "Admitted Batch"),
                    )
                    classes_map[target_code] = cur_c.lastrowid

                target_class_id = classes_map[target_code]

                existing = conn.execute("SELECT id FROM students WHERE register_no = ? COLLATE NOCASE", (reg_no,)).fetchone()
                if existing:
                    conn.execute(
                        "UPDATE students SET name = ?, class_id = ?, active = 1 WHERE id = ?",
                        (name, target_class_id, existing["id"]),
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO students (register_no, name, email, password_hash, class_id, active, must_change_password)
                        VALUES (?, ?, ?, ?, ?, 1, 1)
                        """,
                        (reg_no, name, email, hash_password("student123"), target_class_id),
                    )
                imported_count += 1
                by_class_summary[target_code] += 1

            audit(conn, "admin", session["user_id"], "import_students", f"Imported {imported_count} students via bulk upload")
            conn.commit()

            breakdown_str = ", ".join(f"{code}: {cnt}" for code, cnt in by_class_summary.items())
            self._send_json({
                "ok": True,
                "message": f"Successfully imported {imported_count} students ({breakdown_str}).",
                "total_imported": imported_count,
                "skipped": skipped_count,
                "by_class": dict(by_class_summary),
            })

    def _add_elective(self) -> None:
        session, is_admin = self._require_staff_session()
        payload = self._read_json()
        code = str(payload.get("code", "")).strip().upper()
        name = str(payload.get("name", "")).strip()
        semester = parse_integer(payload.get("semester", 2), "Invalid semester.")
        teacher_id = parse_integer(payload.get("teacher_id", 0), "Invalid teacher.") if payload.get("teacher_id") else None
        capacity = parse_integer(payload.get("capacity", 35), "Invalid capacity.")

        if not code or not name:
            raise ApiError(400, "Elective code and name are required.")

        with get_db() as conn:
            existing = conn.execute("SELECT id FROM electives WHERE code = ?", (code,)).fetchone()
            if existing:
                raise ApiError(400, f"An elective with code {code} already exists.")

            cur = conn.execute(
                "INSERT INTO electives (code, name, semester, teacher_id, capacity) VALUES (?, ?, ?, ?, ?)",
                (code, name, semester, teacher_id, capacity),
            )
            audit(conn, session["role"], session["user_id"], "create_elective", f"{code} - {name}")
            conn.commit()

            self._send_json({
                "ok": True,
                "message": f"Elective {name} ({code}) created successfully.",
                "elective_id": cur.lastrowid,
            })

    def _assign_elective_faculty(self, elective_id: int, session: dict) -> None:
        payload = self._read_json()
        raw_teacher_id = payload.get("teacher_id")
        teacher_id = None
        if raw_teacher_id is not None and str(raw_teacher_id).strip() and str(raw_teacher_id).strip() != "0":
            teacher_id = parse_integer(raw_teacher_id, "Invalid teacher selected.")

        with get_db() as conn:
            elective = conn.execute("SELECT id, code, name FROM electives WHERE id = ?", (elective_id,)).fetchone()
            if not elective:
                raise ApiError(404, "Elective not found.")

            teacher_name = "Not Assigned"
            teacher_emp_id = ""
            if teacher_id:
                teacher = conn.execute("SELECT id, name, employee_id FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
                if not teacher:
                    raise ApiError(404, "Selected teacher not found.")
                teacher_name = teacher["name"]
                teacher_emp_id = teacher["employee_id"]

            conn.execute("UPDATE electives SET teacher_id = ? WHERE id = ?", (teacher_id, elective_id))
            audit(conn, session["role"], session["user_id"], "assign_elective_faculty", f"Allocated {teacher_name} to {elective['code']}")
            conn.commit()

            self._send_json({
                "ok": True,
                "message": f"Faculty allocated for {elective['name']}: {teacher_name}",
                "teacher_id": teacher_id,
                "teacher_name": teacher_name if teacher_id else "Faculty Not Assigned",
                "teacher_employee_id": teacher_emp_id,
            })

    def _get_electives(self, user_id: int, *, is_admin: bool, head_only: bool = False) -> None:
        with get_db() as conn:
            faculty_list = [
                {"id": int(row["id"]), "name": row["name"], "employee_id": row["employee_id"]}
                for row in _all_teachers()
            ]
            rows = conn.execute(
                """
                SELECT e.id, e.code, e.name, e.semester, e.capacity, e.teacher_id,
                       t.name AS teacher_name, t.employee_id AS teacher_employee_id,
                       COUNT(ee.id) AS enrolled_count
                FROM electives e
                LEFT JOIN teachers t ON t.id = e.teacher_id
                LEFT JOIN elective_enrollments ee ON ee.elective_id = e.id
                GROUP BY e.id
                ORDER BY e.code
                """
            ).fetchall()
            electives = []
            for r in rows:
                electives.append({
                    "id": int(r["id"]),
                    "code": r["code"],
                    "name": r["name"],
                    "semester": int(r["semester"]),
                    "capacity": int(r["capacity"]),
                    "teacher_id": int(r["teacher_id"]) if r["teacher_id"] else None,
                    "teacher_name": r["teacher_name"] or "Faculty Not Assigned",
                    "teacher_employee_id": r["teacher_employee_id"] or "",
                    "enrolled_count": int(r["enrolled_count"]),
                    "can_manage": True,
                })
            self._send_json({"ok": True, "electives": electives, "faculty": faculty_list}, head_only=head_only)

    def _get_elective_students(self, elective_id: int, user_id: int, *, is_admin: bool, head_only: bool = False) -> None:
        with get_db() as conn:
            elective = conn.execute(
                """
                SELECT e.id, e.code, e.name, e.semester, e.capacity, e.teacher_id,
                       t.name AS teacher_name, t.employee_id AS teacher_employee_id
                FROM electives e
                LEFT JOIN teachers t ON t.id = e.teacher_id
                WHERE e.id = ?
                """,
                (elective_id,),
            ).fetchone()
            if not elective:
                raise ApiError(404, "Elective not found.")

            enrolled_rows = conn.execute(
                """
                SELECT s.id, s.register_no, s.name, s.class_id, c.code AS class_code, ee.enrolled_at
                FROM elective_enrollments ee
                JOIN students s ON s.id = ee.student_id
                JOIN classes c ON c.id = s.class_id
                WHERE ee.elective_id = ?
                ORDER BY s.register_no
                """,
                (elective_id,),
            ).fetchall()

            all_students_rows = conn.execute(
                """
                SELECT s.id, s.register_no, s.name, s.class_id, c.code AS class_code,
                       ee.elective_id AS enrolled_elective_id,
                       el.code AS enrolled_elective_code,
                       el.name AS enrolled_elective_name
                FROM students s
                JOIN classes c ON c.id = s.class_id
                LEFT JOIN elective_enrollments ee ON ee.student_id = s.id
                LEFT JOIN electives el ON el.id = ee.elective_id
                WHERE s.active = 1
                ORDER BY s.class_id, s.register_no
                """
            ).fetchall()

            available_students = []
            for r in all_students_rows:
                is_here = r["enrolled_elective_id"] == elective_id
                enrolled_elsewhere = (
                    r["enrolled_elective_id"] is not None and r["enrolled_elective_id"] != elective_id
                )
                available_students.append({
                    "id": int(r["id"]),
                    "register_no": r["register_no"],
                    "name": r["name"],
                    "class_id": int(r["class_id"]),
                    "class_code": r["class_code"],
                    "is_enrolled_here": bool(is_here),
                    "can_enroll": bool(not r["enrolled_elective_id"]),
                    "conflict_elective": r["enrolled_elective_code"] if enrolled_elsewhere else None,
                    "conflict_name": r["enrolled_elective_name"] if enrolled_elsewhere else None,
                })

            self._send_json(
                {
                    "ok": True,
                    "elective": {
                        "id": int(elective["id"]),
                        "code": elective["code"],
                        "name": elective["name"],
                        "semester": int(elective["semester"]),
                        "capacity": int(elective["capacity"]),
                        "teacher_name": elective["teacher_name"] or "Faculty Not Assigned",
                        "enrolled_count": len(enrolled_rows),
                    },
                    "enrolled_students": [dict(r) for r in enrolled_rows],
                    "available_students": available_students,
                },
                head_only=head_only,
            )

    def _enroll_elective_student(self, elective_id: int, session: dict, is_admin: bool) -> None:
        payload = self._read_json()
        student_id = parse_integer(payload.get("student_id"), "Choose a valid student.")

        with get_db() as conn:
            elective = conn.execute("SELECT id, code, name, capacity FROM electives WHERE id = ?", (elective_id,)).fetchone()
            if not elective:
                raise ApiError(404, "Elective not found.")

            student = conn.execute("SELECT id, register_no, name FROM students WHERE id = ? AND active = 1", (student_id,)).fetchone()
            if not student:
                raise ApiError(404, "Student not found.")

            existing_enrollment = conn.execute(
                """
                SELECT ee.id, ee.elective_id, e.code, e.name
                FROM elective_enrollments ee
                JOIN electives e ON e.id = ee.elective_id
                WHERE ee.student_id = ?
                """,
                (student_id,),
            ).fetchone()

            if existing_enrollment:
                if int(existing_enrollment["elective_id"]) == elective_id:
                    raise ApiError(400, f"{student['name']} is already enrolled in this elective.")
                raise ApiError(
                    400,
                    f"Enrollment blocked: {student['name']} ({student['register_no']}) is already enrolled in {existing_enrollment['code']} - {existing_enrollment['name']}. "
                    "Each student is strictly allowed only 1 elective. Remove them from their existing elective first to switch."
                )

            now_iso = datetime.now().isoformat(timespec="seconds")
            conn.execute(
                "INSERT INTO elective_enrollments (elective_id, student_id, enrolled_at) VALUES (?, ?, ?)",
                (elective_id, student_id, now_iso),
            )
            audit(conn, session["role"], session["user_id"], "enroll_elective", f"{student['register_no']} into {elective['code']}")
            conn.commit()

            self._send_json({
                "ok": True,
                "message": f"Successfully enrolled {student['name']} ({student['register_no']}) into {elective['name']}.",
            })

    def _unenroll_elective_student(self, elective_id: int, session: dict, is_admin: bool) -> None:
        payload = self._read_json()
        student_id = parse_integer(payload.get("student_id"), "Choose a valid student.")

        with get_db() as conn:
            elective = conn.execute("SELECT id, code, name FROM electives WHERE id = ?", (elective_id,)).fetchone()
            if not elective:
                raise ApiError(404, "Elective not found.")

            student = conn.execute("SELECT id, register_no, name FROM students WHERE id = ?", (student_id,)).fetchone()
            if not student:
                raise ApiError(404, "Student not found.")

            cur = conn.execute(
                "DELETE FROM elective_enrollments WHERE elective_id = ? AND student_id = ?",
                (elective_id, student_id),
            )
            if cur.rowcount == 0:
                raise ApiError(400, "Student was not enrolled in this elective.")

            audit(conn, session["role"], session["user_id"], "unenroll_elective", f"Removed {student['register_no']} from {elective['code']}")
            conn.commit()

            self._send_json({
                "ok": True,
                "message": f"Removed {student['name']} ({student['register_no']}) from {elective['name']}.",
            })

    def _update_profile(self) -> None:
        session, is_admin = self._require_staff_session()
        payload = self._read_json()
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip()
        dob = str(payload.get("dob", "")).strip()
        qualification = str(payload.get("qualification", "")).strip()
        bio = str(payload.get("bio", "")).strip()
        photo_base64 = str(payload.get("photo_base64", "")).strip()
        department = str(payload.get("department", "")).strip()

        if not name:
            raise ApiError(400, "Name cannot be empty.")
        if len(name) > 100:
            raise ApiError(400, "Name is too long.")
        if email and len(email) > 120:
            raise ApiError(400, "Email is too long.")
        if len(qualification) > 250:
            raise ApiError(400, "Qualifications text is too long.")
        if len(bio) > 500:
            raise ApiError(400, "Bio is too long.")
        if len(photo_base64) > 4_000_000:
            raise ApiError(400, "Photo is too large. Please choose an image under 3MB.")

        with get_db() as conn:
            if is_admin:
                conn.execute(
                    """
                    UPDATE admins
                    SET name = ?, email = ?, dob = ?, qualification = ?, bio = ?, photo_base64 = ?
                    WHERE id = ?
                    """,
                    (name, email, dob, qualification, bio, photo_base64, session["user_id"]),
                )
                audit(conn, session["role"], session["user_id"], "update_profile", f"Admin profile updated: {name}")
            else:
                conn.execute(
                    """
                    UPDATE teachers
                    SET name = ?, email = ?, department = COALESCE(NULLIF(?, ''), department),
                        dob = ?, qualification = ?, bio = ?, photo_base64 = ?
                    WHERE id = ?
                    """,
                    (name, email, department, dob, qualification, bio, photo_base64, session["user_id"]),
                )
                audit(conn, session["role"], session["user_id"], "update_profile", f"Teacher profile updated: {name}")
            conn.commit()

        updated_profile = self._profile(session["role"], session["user_id"])
        self._send_json({
            "ok": True,
            "message": "Profile updated successfully.",
            "user": updated_profile,
        })

    def _teacher_sessions(self, teacher_id: int, query: dict, *, admin: bool = False) -> dict:
        filters = []
        params: list = []
        if query.get("class_id", [""])[0]:
            class_filter = parse_integer(query["class_id"][0], "Invalid filter.")
            if class_filter <= 0:
                raise ApiError(400, "Invalid filter.")
            filters.append("ses.class_id = ?")
            params.append(class_filter)
        if query.get("subject_id", [""])[0]:
            subject_filter = parse_integer(query["subject_id"][0], "Invalid filter.")
            if subject_filter <= 0:
                raise ApiError(400, "Invalid filter.")
            filters.append("ses.subject_id = ?")
            params.append(subject_filter)
        if admin and query.get("teacher_id", [""])[0]:
            teacher_filter = parse_integer(
                query["teacher_id"][0], "Invalid filter."
            )
            if teacher_filter <= 0:
                raise ApiError(400, "Invalid filter.")
            filters.append("ses.teacher_id = ?")
            params.append(teacher_filter)

        if not admin:
            # Scope placeholders follow the optional filters in the SQL.
            params.extend([teacher_id, teacher_id])

        where_extra = (" AND " + " AND ".join(filters)) if filters else ""
        scope_join = (
            ""
            if admin
            else """
                AND (
                  ses.teacher_id = ?
                  OR EXISTS (
                    SELECT 1 FROM teacher_assignments ta
                    WHERE ta.class_id = ses.class_id
                      AND ta.subject_id = ses.subject_id
                      AND ta.teacher_id = ?
                  )
                )
            """
        )
        with get_db() as conn:
            rows = conn.execute(
                f"""
                SELECT ses.id AS session_id, ses.attendance_date AS date,
                       ses.period, ses.span, ses.is_holiday,
                       ses.teacher_id, ses.marked_by_teacher_id,
                       ses.is_substitution, ses.substitution_note,
                       c.id AS class_id, c.code AS class_code,
                       sub.id AS subject_id, sub.code AS subject_code,
                       sub.name AS subject_name,
                       t.name AS teacher_name,
                       t.employee_id AS teacher_employee_id,
                       st.name AS scheduled_teacher_name,
                       COUNT(ar.student_id) AS marked,
                       COALESCE(SUM(ar.status = 'present'), 0) AS present,
                       COALESCE(SUM(ar.status = 'absent'), 0) AS absent,
                       ses.updated_at
                FROM attendance_sessions ses
                JOIN classes c ON c.id = ses.class_id
                JOIN subjects sub ON sub.id = ses.subject_id
                LEFT JOIN teachers t ON t.id = ses.teacher_id
                LEFT JOIN teachers st
                  ON st.id = COALESCE(ses.scheduled_teacher_id, ses.teacher_id)
                LEFT JOIN attendance_records ar ON ar.session_id = ses.id
                WHERE 1 = 1 {where_extra} {scope_join}
                GROUP BY ses.id
                ORDER BY ses.attendance_date DESC, ses.period DESC, ses.id DESC
                LIMIT 150
                """,
                tuple(params),
            ).fetchall()
        sessions = []
        for row in rows:
            item = dict(row)
            if item["is_holiday"]:
                item["percentage"] = None
            else:
                item["percentage"] = (
                    round((item["present"] / item["marked"]) * 100, 1)
                    if item["marked"]
                    else 0.0
                )
            sessions.append(item)
        return {"ok": True, "sessions": sessions}

    def _teacher_students(self, teacher_id: int, query: dict, *, admin: bool = False) -> dict:
        with get_db() as conn:
            if admin:
                class_rows = conn.execute(
                    "SELECT id, code, name, semester FROM classes ORDER BY id"
                ).fetchall()
            else:
                class_rows = conn.execute(
                    """
                    SELECT DISTINCT c.id, c.code, c.name, c.semester
                    FROM classes c
                    JOIN teacher_assignments ta ON ta.class_id = c.id
                    WHERE ta.teacher_id = ?
                    ORDER BY c.id
                    """,
                    (teacher_id,),
                ).fetchall()
            allowed = {int(row["id"]): row for row in class_rows}
            classes = [
                {
                    "id": int(row["id"]),
                    "code": row["code"],
                    "name": row["name"],
                    "semester": row["semester"],
                }
                for row in class_rows
            ]
            if not allowed:
                return {
                    "ok": True,
                    "classes": [],
                    "class": None,
                    "subject": None,
                    "students": [],
                    "summary": {
                        "total": 0,
                        "on_track": 0,
                        "below_75": 0,
                        "no_data": 0,
                    },
                }

            raw_class = query.get("class_id", [""])[0]
            is_all_classes = (raw_class.lower() in ("all", "0", "both")) if raw_class else False
            if is_all_classes:
                class_row = {
                    "id": "all",
                    "code": "MCA-ALL",
                    "name": "All Sections (General + AI)",
                    "semester": "1st Year MCA",
                }
                target_class_ids = list(allowed.keys())
            elif raw_class:
                class_id = parse_integer(raw_class, "Invalid class.")
                if class_id <= 0 or class_id not in allowed:
                    raise ApiError(403, "You cannot view this class.")
                class_row = dict(allowed[class_id])
                target_class_ids = [class_id]
            else:
                class_id = next(iter(allowed))
                class_row = dict(allowed[class_id])
                target_class_ids = [class_id]

            raw_subject = query.get("subject_id", [""])[0]
            subject = None
            if raw_subject:
                subject_id = parse_integer(raw_subject, "Invalid subject.")
                if subject_id <= 0:
                    raise ApiError(400, "Invalid subject.")
                subject_row = conn.execute(
                    "SELECT id, name, code FROM subjects WHERE id = ?",
                    (subject_id,),
                ).fetchone()
                if not subject_row:
                    raise ApiError(404, "Subject not found.")
                subject = dict(subject_row)

            placeholders = ",".join("?" for _ in target_class_ids)
            subject_rows = conn.execute(
                f"""
                SELECT DISTINCT sub.id, sub.code, sub.name
                FROM subjects sub
                JOIN timetable t ON t.subject_id = sub.id
                WHERE t.class_id IN ({placeholders})
                ORDER BY sub.code
                """,
                target_class_ids,
            ).fetchall()
            subjects = [dict(row) for row in subject_rows]

            student_rows = conn.execute(
                f"""
                SELECT s.id, s.register_no, s.name, s.class_id, c.code AS class_code, c.name AS class_name
                FROM students s
                JOIN classes c ON c.id = s.class_id
                WHERE s.class_id IN ({placeholders}) AND s.active = 1
                ORDER BY s.class_id, s.register_no
                """,
                target_class_ids,
            ).fetchall()

            if subject:
                record_rows = conn.execute(
                    f"""
                    SELECT ar.student_id, ar.status, ses.span
                    FROM attendance_records ar
                    JOIN attendance_sessions ses ON ses.id = ar.session_id
                    WHERE ses.class_id IN ({placeholders}) AND ses.subject_id = ?
                      AND ses.is_holiday = 0
                    """,
                    (*target_class_ids, subject["id"]),
                ).fetchall()
            else:
                record_rows = conn.execute(
                    f"""
                    SELECT ar.student_id, ar.status, ses.span
                    FROM attendance_records ar
                    JOIN attendance_sessions ses ON ses.id = ar.session_id
                    WHERE ses.class_id IN ({placeholders}) AND ses.is_holiday = 0
                    """,
                    target_class_ids,
                ).fetchall()

            totals: dict[int, list[int]] = defaultdict(lambda: [0, 0])
            for row in record_rows:
                slot = totals[int(row["student_id"])]
                span = int(row["span"])
                if row["status"] == "present":
                    slot[0] += span
                slot[1] += span

            students = []
            summary = {"total": 0, "on_track": 0, "below_75": 0, "no_data": 0}
            for row in student_rows:
                attended, total = totals.get(int(row["id"]), [0, 0])
                detail = guidance(attended, total)
                status = detail["status"]
                summary["total"] += 1
                if status == "on_track":
                    summary["on_track"] += 1
                elif status == "below":
                    summary["below_75"] += 1
                else:
                    summary["no_data"] += 1
                students.append(
                    {
                        "id": int(row["id"]),
                        "register_no": row["register_no"],
                        "name": row["name"],
                        "class_id": int(row["class_id"]),
                        "class_code": row["class_code"],
                        "class_name": row["class_name"],
                        "attended": detail["attended"],
                        "total": detail["total"],
                        "percentage": detail["percentage"],
                        "status": status,
                        "must_attend": detail["must_attend"],
                        "can_skip": detail["can_skip"],
                    }
                )

        return {
            "ok": True,
            "classes": classes,
            "class": {
                "id": class_row["id"] if class_row["id"] == "all" else int(class_row["id"]),
                "code": class_row["code"],
                "name": class_row["name"],
                "semester": class_row["semester"],
            },
            "subject": subject,
            "subjects": subjects,
            "students": students,
            "summary": summary,
        }

    def _teacher_students_export(
        self, teacher_id: int, query: dict, *, admin: bool = False
    ) -> tuple[bytes, str]:
        try:
            import io

            from openpyxl import Workbook
            from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
            from openpyxl.utils import get_column_letter
            from openpyxl.worksheet.properties import PageSetupProperties
        except Exception as exc:
            raise ApiError(
                501, "Excel export is not available on this server (openpyxl missing)."
            ) from exc

        raw_month = (query.get("month", [""])[0] or "").strip()
        today = date.today()
        year, month = today.year, today.month
        if raw_month:
            try:
                year_text, month_text = raw_month.split("-", 1)
                year, month = int(year_text), int(month_text)
                if not (2000 <= year <= 2099 and 1 <= month <= 12):
                    raise ValueError
            except (ValueError, AttributeError):
                raise ApiError(400, "Choose the month as YYYY-MM.") from None
        if (year, month) > (today.year, today.month):
            raise ApiError(400, "Choose a month that has already started.")
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        month_label = month_start.strftime("%B %Y")

        with get_db() as conn:
            if admin:
                class_rows = conn.execute(
                    "SELECT id, code, name, semester FROM classes ORDER BY id"
                ).fetchall()
            else:
                class_rows = conn.execute(
                    """
                    SELECT DISTINCT c.id, c.code, c.name, c.semester
                    FROM classes c
                    JOIN teacher_assignments ta ON ta.class_id = c.id
                    WHERE ta.teacher_id = ?
                    ORDER BY c.id
                    """,
                    (teacher_id,),
                ).fetchall()
            allowed = {int(row["id"]): row for row in class_rows}
            if not allowed:
                raise ApiError(404, "No class is available for export.")

            raw_class = (query.get("class_id", [""])[0] or "").strip()
            is_all_classes = (raw_class.lower() in ("all", "0", "both")) if raw_class else False
            if is_all_classes:
                target_classes = [dict(allowed[cid]) for cid in allowed]
                filename = f"RollCall_MCA_Consolidated_All_Sections_{year}-{month:02d}.xlsx"
            else:
                if raw_class:
                    class_id = parse_integer(raw_class, "Invalid class.")
                    if class_id <= 0 or class_id not in allowed:
                        raise ApiError(403, "You cannot export this class.")
                else:
                    class_id = next(iter(allowed))
                target_classes = [dict(allowed[class_id])]
                filename = f"RollCall_{target_classes[0]['code']}_{year}-{month:02d}.xlsx"

            class_data_list = []
            for class_row in target_classes:
                cid = int(class_row["id"])
                session_rows = conn.execute(
                    """
                    SELECT ses.id, ses.subject_id, sub.code AS subject_code,
                           sub.name AS subject_name, ses.attendance_date,
                           ses.period, ses.span, ses.is_substitution,
                           act_t.name AS teacher_name,
                           sch_t.name AS scheduled_teacher_name
                    FROM attendance_sessions ses
                    JOIN subjects sub ON sub.id = ses.subject_id
                    LEFT JOIN teachers act_t ON act_t.id = ses.teacher_id
                    LEFT JOIN teachers sch_t ON sch_t.id = ses.scheduled_teacher_id
                    WHERE ses.class_id = ? AND ses.is_holiday = 0
                      AND ses.attendance_date >= ? AND ses.attendance_date < ?
                    ORDER BY sub.code, ses.attendance_date, ses.period
                    """,
                    (cid, month_start.isoformat(), month_end.isoformat()),
                ).fetchall()
                session_ids = [int(row["id"]) for row in session_rows]
                if session_ids:
                    placeholders = ",".join("?" for _ in session_ids)
                    record_rows = conn.execute(
                        f"""
                        SELECT session_id, student_id, status
                        FROM attendance_records
                        WHERE session_id IN ({placeholders})
                        """,
                        session_ids,
                    ).fetchall()
                else:
                    record_rows = []
                student_rows = conn.execute(
                    """
                    SELECT id, register_no, name
                    FROM students
                    WHERE class_id = ? AND active = 1
                    ORDER BY register_no
                    """,
                    (cid,),
                ).fetchall()
                assigned_rows = conn.execute(
                    """
                    SELECT DISTINCT sub.id, sub.code, sub.name
                    FROM teacher_assignments ta
                    JOIN subjects sub ON sub.id = ta.subject_id
                    WHERE ta.class_id = ?
                    ORDER BY sub.code
                    """,
                    (cid,),
                ).fetchall()

                records: dict[int, dict[int, str]] = defaultdict(dict)
                for row in record_rows:
                    records[int(row["session_id"])][int(row["student_id"])] = row["status"]
                students = [
                    {
                        "id": int(row["id"]),
                        "register_no": row["register_no"],
                        "name": row["name"],
                    }
                    for row in student_rows
                ]
                subjects: dict[str, dict] = {}
                for a_row in assigned_rows:
                    subjects[a_row["code"]] = {
                        "id": a_row["id"],
                        "code": a_row["code"],
                        "name": a_row["name"],
                        "sessions": [],
                    }
                for row in session_rows:
                    key = row["subject_code"]
                    group = subjects.setdefault(
                        key,
                        {"id": row["subject_id"], "code": row["subject_code"], "name": row["subject_name"], "sessions": []},
                    )
                    group["sessions"].append(row)
                subject_list = [subjects[key] for key in sorted(subjects)]

                class_data_list.append({
                    "class_row": class_row,
                    "session_rows": session_rows,
                    "records": records,
                    "students": students,
                    "subject_list": subject_list,
                })

        # ---------------- workbook styling helpers ----------------
        DARK, GREEN, SOFT, SAND = "123C2E", "1D6A4C", "E4F2E9", "F4F1E9"
        CREAM, LOW = "FAF9F4", "FBE4E4"
        LIGHT_BLUE, DARK_RED, ALERT_RED, YELLOW_FILL = "D9E1F2", "990000", "CC0000", "FFFF99"
        thin_gray = Side(style="thin", color="D9D5C9")
        thin_black = Side(style="thin", color="000000")
        box = Border(left=thin_gray, right=thin_gray, top=thin_gray, bottom=thin_gray)
        full_box = Border(left=thin_black, right=thin_black, top=thin_black, bottom=thin_black)
        header_fill = PatternFill("solid", fgColor=DARK)
        span_fill = PatternFill("solid", fgColor=SAND)
        alt_fill = PatternFill("solid", fgColor=CREAM)
        low_fill = PatternFill("solid", fgColor=LOW)
        blue_fill = PatternFill("solid", fgColor=LIGHT_BLUE)
        maroon_fill = PatternFill("solid", fgColor=DARK_RED)
        white_bold = Font(name="Calibri", size=10, bold=True, color="FFFFFF")

        def title_block(ws, end_col: int, lines: list[str]) -> None:
            for index, line in enumerate(lines, start=1):
                ws.merge_cells(start_row=index, start_column=1, end_row=index, end_column=end_col)
                cell = ws.cell(row=index, column=1, value=line)
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if index == 1:
                    cell.font = Font(name="Calibri", size=13, bold=True, color="000000")
                elif index in (2, 3):
                    cell.font = Font(name="Calibri", size=11, bold=True, color="000000")
                else:
                    cell.font = Font(name="Calibri", size=11, bold=True, color="000000")
                ws.row_dimensions[index].height = 20
                ws.freeze_panes = None
            ws.row_dimensions[5].height = 6

        def style_sheet(ws, header_row: int, first_col: int, last_col: int, last_row: int) -> None:
            ws.sheet_view.showGridLines = True
            ws.freeze_panes = f"D{header_row + 1}"
            ws.auto_filter.ref = (
                f"A{header_row}:{get_column_letter(last_col)}{last_row}"
            )
            ws.page_setup.orientation = "landscape"
            ws.page_setup.paperSize = 5  # legal
            ws.page_setup.fitToWidth = 1
            ws.page_setup.fitToHeight = 0
            ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
            ws.oddFooter.left.text = "RollCall · GVP IHLR"
            ws.oddFooter.left.size = 9
            ws.oddFooter.right.text = "&D &T"
            ws.oddFooter.right.size = 9
            ws.oddHeader.right.text = "&P of &N"
            ws.oddHeader.right.size = 9

        wb = Workbook()

        # ==============================================================
        # PHASE 1: CONSOLIDATED ATTENDANCE REPORTS (Official College Format)
        # ==============================================================
        month_upper = month_label.upper().replace(" ", "-")

        for c_idx, data in enumerate(class_data_list):
            class_row = data["class_row"]
            subject_list = data["subject_list"]
            students = data["students"]
            records = data["records"]

            if c_idx == 0:
                ws = wb.active
            else:
                ws = wb.create_sheet()

            code = class_row["code"]
            ws.title = f"{code} Consolidated" if is_all_classes else "Consolidated Report"

            # Number of subjects determines column layout
            num_subjects = max(1, len(subject_list))
            first_sub_col = 4
            last_sub_col = first_sub_col + num_subjects - 1
            held_col = last_sub_col + 1
            att_col = held_col + 1
            pct_col = att_col + 1
            end_col = pct_col

            # College title lines matching the official register
            college_lines = [
                "Gayatri Vidya Parishad College for Degree and PG Courses(A)",
                "Rushikonda, Visakhapatnam -530045",
                f"Master of Computer Applications - {class_row.get('name', 'MCA 1st Semester')}",
                f"Consolidated Attendance Report {month_upper}",
            ]
            title_block(ws, end_col, college_lines)

            # Header rows 6 & 7: Merged table headers with soft blue background
            for col, label in [(1, "S.No"), (2, "Regd Number"), (3, "Name/No.of Classes")]:
                ws.merge_cells(start_row=6, start_column=col, end_row=7, end_column=col)
                cell = ws.cell(row=6, column=col, value=label)
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                cell.font = Font(name="Calibri", size=10, bold=True)
                cell.fill = blue_fill
                for r in (6, 7):
                    ws.cell(row=r, column=col).border = full_box

            # "Subject Name and Number of Periods" banner over all subjects
            ws.merge_cells(start_row=6, start_column=first_sub_col, end_row=6, end_column=last_sub_col)
            banner_cell = ws.cell(row=6, column=first_sub_col, value="Subject Name and Number of Periods")
            banner_cell.alignment = Alignment(horizontal="center", vertical="center")
            banner_cell.font = Font(name="Calibri", size=10, bold=True)
            banner_cell.fill = blue_fill
            for c in range(first_sub_col, last_sub_col + 1):
                ws.cell(row=6, column=c).border = full_box
                ws.cell(row=6, column=c).fill = blue_fill

            # Row 7: Subject Codes
            for idx, sub in enumerate(subject_list):
                col = first_sub_col + idx
                cell = ws.cell(row=7, column=col, value=sub["code"])
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.font = Font(name="Calibri", size=9.5, bold=True)
                cell.fill = blue_fill
                cell.border = full_box

            # Summary columns (Merged 6 & 7)
            for col, label in [(held_col, "Total Classes Held"), (att_col, "Total Classes Attended"), (pct_col, "PERCENTAGE")]:
                ws.merge_cells(start_row=6, start_column=col, end_row=7, end_column=col)
                cell = ws.cell(row=6, column=col, value=label)
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                cell.font = Font(name="Calibri", size=10, bold=True)
                cell.fill = blue_fill
                for r in (6, 7):
                    ws.cell(row=r, column=col).border = full_box

            ws.row_dimensions[6].height = 22
            ws.row_dimensions[7].height = 20

            # Row 8: Maroon subheader row with Classes Held counts
            for c, text in [(1, "S.No"), (2, "Regd Number"), (3, "Name/No.of Classes")]:
                cell = ws.cell(row=8, column=c, value=text)
                cell.font = white_bold
                cell.fill = maroon_fill
                cell.border = full_box
                cell.alignment = Alignment(horizontal="center", vertical="center")

            subject_held_counts: list[int] = []
            for idx, sub in enumerate(subject_list):
                col = first_sub_col + idx
                held = sum(int(s["span"]) for s in sub["sessions"])
                subject_held_counts.append(held)
                cell = ws.cell(row=8, column=col, value=held)
                cell.font = white_bold
                cell.fill = maroon_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.border = full_box

            total_held_all = sum(subject_held_counts)
            cell_held_total = ws.cell(row=8, column=held_col, value="Held" if total_held_all == 0 else total_held_all)
            cell_held_total.font = white_bold
            cell_held_total.fill = maroon_fill
            cell_held_total.alignment = Alignment(horizontal="center", vertical="center")
            cell_held_total.border = full_box

            cell_att_label = ws.cell(row=8, column=att_col, value="Attended")
            cell_att_label.font = white_bold
            cell_att_label.fill = maroon_fill
            cell_att_label.alignment = Alignment(horizontal="center", vertical="center")
            cell_att_label.border = full_box

            cell_pct_label = ws.cell(row=8, column=pct_col, value="%")
            cell_pct_label.font = white_bold
            cell_pct_label.fill = maroon_fill
            cell_pct_label.alignment = Alignment(horizontal="center", vertical="center")
            cell_pct_label.border = full_box

            ws.row_dimensions[8].height = 22

            # Student data rows starting from row 9
            start_student_row = 9
            for idx, student in enumerate(students):
                r_idx = start_student_row + idx
                s_no = idx + 1
                reg_no = student["register_no"]
                name = student["name"]

                total_student_att = 0
                student_att_by_sub: list[int] = []
                for sub in subject_list:
                    sub_att = 0
                    for s in sub["sessions"]:
                        if records.get(int(s["id"]), {}).get(student["id"]) == "present":
                            sub_att += int(s["span"])
                    student_att_by_sub.append(sub_att)
                    total_student_att += sub_att

                pct_val = (total_student_att / total_held_all * 100) if total_held_all > 0 else 0
                is_shortage = (total_held_all > 0 and pct_val < 75.0)

                # Col 1: S.No
                c_sno = ws.cell(row=r_idx, column=1, value=s_no)
                c_sno.alignment = Alignment(horizontal="center", vertical="center")
                c_sno.border = full_box
                c_sno.font = Font(name="Calibri", size=10)

                # Col 2: Regd Number (HIGHLIGHT ROLL NUMBER IN YELLOW IF SHORTAGE)
                c_reg = ws.cell(row=r_idx, column=2, value=reg_no)
                c_reg.alignment = Alignment(horizontal="center", vertical="center")
                c_reg.border = full_box
                if is_shortage:
                    c_reg.fill = PatternFill("solid", fgColor=YELLOW_FILL)
                    c_reg.font = Font(name="Calibri", size=10, bold=True, color="B84A38")
                else:
                    c_reg.font = Font(name="Calibri", size=10, bold=True, color="000000")

                # Col 3: Student Name (Normal, clean, unhighlighted)
                c_name = ws.cell(row=r_idx, column=3, value=name)
                c_name.alignment = Alignment(horizontal="left", vertical="center")
                c_name.font = Font(name="Calibri", size=10, bold=False, color="000000")
                c_name.border = full_box

                # Subjects attendance columns
                for sub_idx, sub_att in enumerate(student_att_by_sub):
                    col = first_sub_col + sub_idx
                    c_sub = ws.cell(row=r_idx, column=col, value=sub_att)
                    c_sub.alignment = Alignment(horizontal="center", vertical="center")
                    c_sub.font = Font(name="Calibri", size=10)
                    c_sub.border = full_box

                # Total Classes Held
                c_held = ws.cell(row=r_idx, column=held_col, value=total_held_all)
                c_held.alignment = Alignment(horizontal="center", vertical="center")
                c_held.font = Font(name="Calibri", size=10, bold=True)
                c_held.border = full_box

                # Total Classes Attended formula
                first_col_letter = get_column_letter(first_sub_col)
                last_col_letter = get_column_letter(last_sub_col)
                c_att = ws.cell(row=r_idx, column=att_col, value=f"=SUM({first_col_letter}{r_idx}:{last_col_letter}{r_idx})")
                c_att.alignment = Alignment(horizontal="center", vertical="center")
                c_att.font = Font(name="Calibri", size=10, bold=True)
                c_att.border = full_box

                # PERCENTAGE formula
                held_col_letter = get_column_letter(held_col)
                att_col_letter = get_column_letter(att_col)
                c_pct = ws.cell(row=r_idx, column=pct_col, value=f"=IF({held_col_letter}{r_idx}=0,0,ROUND({att_col_letter}{r_idx}/{held_col_letter}{r_idx}*100,1))")
                c_pct.alignment = Alignment(horizontal="center", vertical="center")
                c_pct.border = full_box
                if is_shortage:
                    c_pct.fill = PatternFill("solid", fgColor="FFD8D8")
                    c_pct.font = Font(name="Calibri", size=10, bold=True, color="CC0000")
                elif total_held_all > 0:
                    c_pct.font = Font(name="Calibri", size=10, bold=True, color="1D6A4C")
                else:
                    c_pct.font = Font(name="Calibri", size=10, color="595959")

                ws.row_dimensions[r_idx].height = 19

            summary_last = start_student_row + len(students) - 1
            if students:
                total_row = summary_last + 1
                ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=3)
                cell_total_label = ws.cell(row=total_row, column=1, value="Combined Total / Average")
                cell_total_label.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                cell_total_label.fill = header_fill
                cell_total_label.alignment = Alignment(horizontal="center", vertical="center")

                for c in range(1, 4):
                    ws.cell(row=total_row, column=c).border = full_box
                    ws.cell(row=total_row, column=c).fill = header_fill

                for sub_idx, sub in enumerate(subject_list):
                    col = first_sub_col + sub_idx
                    col_letter = get_column_letter(col)
                    c_sub_tot = ws.cell(row=total_row, column=col, value=f"=SUM({col_letter}9:{col_letter}{summary_last})")
                    c_sub_tot.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                    c_sub_tot.fill = header_fill
                    c_sub_tot.alignment = Alignment(horizontal="center", vertical="center")
                    c_sub_tot.border = full_box

                held_col_letter = get_column_letter(held_col)
                c_tot_held = ws.cell(row=total_row, column=held_col, value=f"=SUM({held_col_letter}9:{held_col_letter}{summary_last})")
                c_tot_held.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                c_tot_held.fill = header_fill
                c_tot_held.alignment = Alignment(horizontal="center", vertical="center")
                c_tot_held.border = full_box

                att_col_letter = get_column_letter(att_col)
                c_tot_att = ws.cell(row=total_row, column=att_col, value=f"=SUM({att_col_letter}9:{att_col_letter}{summary_last})")
                c_tot_att.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                c_tot_att.fill = header_fill
                c_tot_att.alignment = Alignment(horizontal="center", vertical="center")
                c_tot_att.border = full_box

                pct_col_letter = get_column_letter(pct_col)
                c_tot_pct = ws.cell(row=total_row, column=pct_col, value=f"=IF({held_col_letter}{total_row}=0,0,ROUND({att_col_letter}{total_row}/{held_col_letter}{total_row}*100,1))")
                c_tot_pct.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                c_tot_pct.fill = header_fill
                c_tot_pct.alignment = Alignment(horizontal="center", vertical="center")
                c_tot_pct.border = full_box

                ws.row_dimensions[total_row].height = 20

            note_row = (summary_last if students else 8) + 3
            ws.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=end_col)
            ws.cell(
                row=note_row,
                column=1,
                value="* Roll numbers highlighted in yellow indicate attendance shortage (< 75%) · "
                "Labs count as 2 periods and CTV as 3 · Holidays are excluded",
            ).font = Font(name="Calibri", size=8.5, italic=True, color="68766D")

            ws.column_dimensions["A"].width = 6
            ws.column_dimensions["B"].width = 16
            ws.column_dimensions["C"].width = 34
            for c in range(first_sub_col, last_sub_col + 1):
                ws.column_dimensions[get_column_letter(c)].width = 9.5
            ws.column_dimensions[get_column_letter(held_col)].width = 13
            ws.column_dimensions[get_column_letter(att_col)].width = 13
            ws.column_dimensions[get_column_letter(pct_col)].width = 13
            style_sheet(ws, 8, 1, end_col, summary_last if students else 8)

        # ==============================================================
        # PHASE 2: PER-SUBJECT DETAIL SHEETS
        # ==============================================================
        for data in class_data_list:
            class_row = data["class_row"]
            subject_list = data["subject_list"]
            students = data["students"]
            records = data["records"]
            code_prefix = class_row["code"].replace("MCA-", "")

            for subject in subject_list:
                sub_code = subject["code"]
                sheet_title = f"{code_prefix}-{sub_code}"[:31] if is_all_classes else sub_code[:31]
                ws = wb.create_sheet(sheet_title)

                sessions = subject["sessions"]
                session_count = len(sessions)
                last_col = 3 + session_count
                attended_col = last_col + 1
                total_col = last_col + 2
                pct_col = last_col + 3
                end_col = pct_col

                title_block(
                    ws,
                    end_col,
                    [
                        f"{subject['code']} · {subject['name']}",
                        f"{class_row['code']} ({class_row.get('name', '')}) · {month_label}",
                        "1 = present, 0 = absent · Labs count as 2 periods and CTV as 3 · Holidays are excluded",
                    ],
                )
                header_row = 5
                base_headers = ["#", "Register No", "Student Name"]
                session_headers = []
                for row in sessions:
                    day = date.fromisoformat(row["attendance_date"])
                    period = int(row["period"])
                    span = int(row["span"])
                    period_label = f"P{period}" if span == 1 else f"P{period}–P{period + span - 1}"
                    session_headers.append(f"{day.strftime('%d %b')}\n{period_label}")
                for col, label in enumerate(base_headers + session_headers + ["Attended", "Total", "Attendance %"], start=1):
                    cell = ws.cell(row=header_row, column=col, value=label)
                    cell.font = white_bold
                    cell.fill = header_fill
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                    cell.border = box
                ws.row_dimensions[header_row].height = 30
                span_row = header_row + 1
                ws.cell(row=span_row, column=1, value="").fill = span_fill
                ws.cell(row=span_row, column=2, value="span").font = Font(
                    name="Calibri", size=8, italic=True, color="68766D"
                )
                ws.cell(row=span_row, column=2).fill = span_fill
                ws.cell(row=span_row, column=2).alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row=span_row, column=3, value="periods").font = Font(
                    name="Calibri", size=8, italic=True, color="68766D"
                )
                ws.cell(row=span_row, column=3).fill = span_fill
                ws.cell(row=span_row, column=3).alignment = Alignment(vertical="center")
                for offset, row in enumerate(sessions):
                    cell = ws.cell(row=span_row, column=4 + offset, value=int(row["span"]))
                    cell.fill = span_fill
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                    cell.border = box
                for col in (attended_col, total_col, pct_col):
                    cell = ws.cell(row=span_row, column=col, value="")
                    cell.fill = span_fill
                    cell.border = box
                ws.row_dimensions[span_row].height = 17

                teacher_row = span_row + 1
                ws.cell(row=teacher_row, column=1, value="").fill = span_fill
                ws.cell(row=teacher_row, column=2, value="faculty").font = Font(
                    name="Calibri", size=8, italic=True, color="68766D"
                )
                ws.cell(row=teacher_row, column=2).fill = span_fill
                ws.cell(row=teacher_row, column=2).alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row=teacher_row, column=3, value="").fill = span_fill
                for offset, row in enumerate(sessions):
                    name = row["teacher_name"] or row["scheduled_teacher_name"] or "—"
                    first = name.split()[0] if name != "—" else name
                    cell = ws.cell(row=teacher_row, column=4 + offset, value=first)
                    cell.font = Font(name="Calibri", size=8, italic=True, color="435248")
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                    cell.fill = span_fill
                    cell.border = box
                for col in (attended_col, total_col, pct_col):
                    cell = ws.cell(row=teacher_row, column=col, value="")
                    cell.fill = span_fill
                    cell.border = box
                ws.row_dimensions[teacher_row].height = 22

                first_student_row = teacher_row + 1
                session_start_col = 4
                session_end_col = 3 + session_count
                sub_total_held = sum(int(s["span"]) for s in sessions)
                for index, student in enumerate(students):
                    row_idx = first_student_row + index
                    sub_att = sum(int(s["span"]) for s in sessions if records.get(int(s["id"]), {}).get(student["id"]) == "present")
                    sub_is_shortage = (sub_total_held > 0 and (sub_att / sub_total_held) < 0.75)

                    ws.cell(row=row_idx, column=1, value=index + 1).alignment = Alignment(horizontal="center")

                    c_reg = ws.cell(row=row_idx, column=2, value=student["register_no"])
                    c_reg.alignment = Alignment(horizontal="center", vertical="center")
                    if sub_is_shortage:
                        c_reg.fill = PatternFill("solid", fgColor=YELLOW_FILL)
                        c_reg.font = Font(name="Calibri", size=9.5, bold=True, color="B84A38")
                    else:
                        c_reg.font = Font(name="Calibri", size=9.5, bold=True, color="000000")

                    c_name = ws.cell(row=row_idx, column=3, value=student["name"])
                    c_name.font = Font(name="Calibri", size=9.5, bold=False, color="000000")
                    for offset, session in enumerate(sessions):
                        value = records.get(int(session["id"]), {}).get(student["id"])
                        cell = ws.cell(
                            row=row_idx,
                            column=4 + offset,
                            value=(1 if value == "present" else 0) if value in {"present", "absent"} else None,
                        )
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                        cell.font = Font(name="Calibri", size=9)
                        if value == "absent":
                            cell.font = Font(name="Calibri", size=9, bold=True, color=ALERT_RED)
                        cell.border = box
                    if session_count > 0:
                        first_letter = get_column_letter(session_start_col)
                        last_letter = get_column_letter(session_end_col)
                        span_start_letter = get_column_letter(session_start_col)
                        span_end_letter = get_column_letter(session_end_col)
                        ws.cell(
                            row=row_idx,
                            column=attended_col,
                            value=f"=SUMPRODUCT({first_letter}{row_idx}:{last_letter}{row_idx},${span_start_letter}${span_row}:${span_end_letter}${span_row})",
                        ).number_format = "0"
                        ws.cell(
                            row=row_idx,
                            column=total_col,
                            value=f"=SUM(${span_start_letter}${span_row}:${span_end_letter}${span_row})",
                        ).number_format = "0"
                        ws.cell(
                            row=row_idx,
                            column=pct_col,
                            value=f"=IF({get_column_letter(total_col)}{row_idx}=0,0,ROUND({get_column_letter(attended_col)}{row_idx}/{get_column_letter(total_col)}{row_idx}*100,1))",
                        ).number_format = '0.0"%"'
                    else:
                        ws.cell(row=row_idx, column=attended_col, value=0)
                        ws.cell(row=row_idx, column=total_col, value=0)
                        ws.cell(row=row_idx, column=pct_col, value=0)
                    for col in (attended_col, total_col, pct_col):
                        ws.cell(row=row_idx, column=col).alignment = Alignment(horizontal="center", vertical="center")
                        ws.cell(row=row_idx, column=col).font = Font(name="Calibri", size=9.5, bold=True)
                        ws.cell(row=row_idx, column=col).border = box
                    ws.cell(row=row_idx, column=1).border = box
                    ws.cell(row=row_idx, column=2).alignment = Alignment(vertical="center")
                    ws.cell(row=row_idx, column=2).border = box
                    ws.cell(row=row_idx, column=3).border = box
                    if index % 2 == 1:
                        for col in range(1, end_col + 1):
                            cell = ws.cell(row=row_idx, column=col)
                            if cell.fill.fill_type is None:
                                cell.fill = alt_fill
                    if index % 4 == 0:
                        ws.row_dimensions[row_idx].height = 17
                last_student_row = first_student_row + len(students) - 1
                total_row = last_student_row + 1
                ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=3)
                cell = ws.cell(row=total_row, column=1, value="Combined")
                cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                cell.fill = header_fill
                cell.alignment = Alignment(vertical="center")
                for offset in range(session_count):
                    cell = ws.cell(row=total_row, column=4 + offset, value=f"=SUM(D{first_student_row}:D{last_student_row})" if offset == 0 else f"=SUM({get_column_letter(4 + offset)}{first_student_row}:{get_column_letter(4 + offset)}{last_student_row})")
                    cell.alignment = Alignment(horizontal="center")
                    cell.font = Font(name="Calibri", size=8, bold=True, color="FFFFFF")
                    cell.fill = header_fill
                    cell.border = box
                ws.cell(row=total_row, column=attended_col, value=f"=SUM({get_column_letter(attended_col)}{first_student_row}:{get_column_letter(attended_col)}{last_student_row})").number_format = "0"
                ws.cell(row=total_row, column=total_col, value=f"=SUM({get_column_letter(total_col)}{first_student_row}:{get_column_letter(total_col)}{last_student_row})").number_format = "0"
                ws.cell(row=total_row, column=pct_col, value=f"=IF({get_column_letter(total_col)}{total_row}=0,0,ROUND({get_column_letter(attended_col)}{total_row}/{get_column_letter(total_col)}{total_row}*100,1))").number_format = '0.0"%"'
                for col in range(1, end_col + 1):
                    cell = ws.cell(row=total_row, column=col)
                    if cell.fill.fill_type is None:
                        cell.fill = header_fill
                    cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
                    cell.border = box
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row=total_row, column=1).alignment = Alignment(horizontal="left", vertical="center")
                ws.row_dimensions[total_row].height = 19
                ws.column_dimensions["A"].width = 6
                ws.column_dimensions["B"].width = 18
                ws.column_dimensions["C"].width = 36
                for offset in range(session_count):
                    ws.column_dimensions[get_column_letter(4 + offset)].width = 11.5
                ws.column_dimensions[get_column_letter(attended_col)].width = 13
                ws.column_dimensions[get_column_letter(total_col)].width = 13
                ws.column_dimensions[get_column_letter(pct_col)].width = 15
                ws.row_dimensions[header_row].height = 32
                style_sheet(ws, header_row, 1, end_col, total_row)

        try:
            with get_db() as conn:
                audit(
                    conn,
                    "admin" if admin else "teacher",
                    teacher_id,
                    "export_students",
                    f"class={'ALL' if is_all_classes else target_classes[0]['code']} month={year}-{month:02d}",
                )
        except Exception:
            pass
        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue(), filename

    # ------------------------------------------------------------------ misc
    def log_message(self, fmt: str, *args) -> None:
        if os.environ.get("ROLLCALL_QUIET") == "1":
            return
        sys.stderr.write(
            f"[{datetime.now().strftime('%H:%M:%S')}] "
            f"{self.address_string()} - {fmt % args}\n"
        )


def main() -> None:
    global DB_PATH, HOST, PORT

    parser = argparse.ArgumentParser(description="Run the RollCall attendance portal.")
    parser.add_argument("--host", default=HOST, help="Bind address (default: 127.0.0.1)")
    parser.add_argument(
        "--port", type=int, default=PORT, help="Port number (default: 8000)"
    )
    parser.add_argument(
        "--db",
        default=str(DB_PATH),
        help="Path to the SQLite database (default: attendance.db)",
    )
    parser.add_argument(
        "--reset-demo",
        action="store_true",
        help="Delete the existing database and create fresh demo data.",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the portal in the default browser after starting.",
    )
    args = parser.parse_args()
    DB_PATH = Path(args.db)
    HOST = args.host
    PORT = args.port

    init_db(reset=args.reset_demo)

    using_demo_passwords = (
        STUDENT_PASSWORD == DEMO_STUDENT_PASSWORD
        and TEACHER_PASSWORD == DEMO_TEACHER_PASSWORD
    )

    try:
        server = RollCallServer((HOST, PORT), RollCallHandler)
    except OSError as exc:
        print(f"Could not start the server on port {PORT}: {exc}")
        print("Close the other app using this port, or try: python app.py --port 8001")
        raise SystemExit(1) from None

    print()
    print("  RollCall is running")
    print(f"  Open: http://{HOST}:{PORT}")
    print()
    print(f"  {COLLEGE_SHORT} · {PROGRAM}")
    print("  Student login:  register number (from the class roster)")
    print("  Teacher login:  employee ID or college e-mail")
    print()
    print("  Press Ctrl+C to stop the server.")
    print()
    if using_demo_passwords:
        print("  SECURITY: default demo passwords are active.")
        print("  See README.md (Demo accounts) for the demo sign-in details.")
        print("  Before exposing this portal outside localhost, set")
        print("  ROLLCALL_TEACHER_PASSWORD and ROLLCALL_STUDENT_PASSWORD,")
        print("  then rebuild with: python app.py --reset-demo")
        print()
    if args.open:
        browser_host = "127.0.0.1" if HOST in {"0.0.0.0", "::"} else HOST
        webbrowser.open(f"http://{browser_host}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


class handler(RollCallHandler, BaseHTTPRequestHandler):
    """Vercel Python serverless entrypoint."""


if os.environ.get("VERCEL"):
    init_db()


if __name__ == "__main__":
    main()
