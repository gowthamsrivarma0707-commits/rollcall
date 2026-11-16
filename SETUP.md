# RollCall · College Setup Guide (for GVP IHLR IT)

This document is for the person who will host RollCall on college infrastructure.
It contains no credentials.

## 1. What you need

- A Windows or Linux machine with **Python 3.11+** and network reach for the class portal.
- `openpyxl` installed once: `python -m pip install openpyxl`
  (only needed for the monthly Excel export; the app runs without it but export returns 501).
- The `opencode` folder (this app) and, initially, an empty working directory.
- A reverse proxy (IIS with `web.config` forwarding, or Caddy/nginx) to terminate HTTPS.

## 2. First-time build — BEFORE any real attendance is stored

The demo credentials in the code are **placeholders, not secrets**. They exist only
so the app installs; they are not safe for a live campus.

1. Choose fresh per-campus passwords:
   - `ROLLCALL_STUDENT_PASSWORD`
   - `ROLLCALL_TEACHER_PASSWORD`
   - `ROLLCALL_ADMIN_PASSWORD`
2. Build a fresh database:

   ```bat
   set ROLLCALL_STUDENT_PASSWORD=<strong-unique-string>
   set ROLLCALL_TEACHER_PASSWORD=<strong-unique-string>
   set ROLLCALL_ADMIN_PASSWORD=<strong-unique-string>
   python app.py --reset-demo
   ```

   Never do this once real attendance exists — `--reset-demo` deletes it.
3. Point the reverse proxy at `http://127.0.0.1:8000` and make sure it forwards
   `X-Forwarded-Proto: https`. With HTTPS, cookies are marked `Secure` and HSTS is sent.
4. Open the site over HTTPS only; `http://` must redirect to `https://`.
5. Hand the class the URL. Students and teachers **must rotate their credentials at
   first sign-in** — a banner blocks meaningful use until they do. Every account is
   marked `must_change_password`; it clears only when the password changes.

## 3. What the college owns after handover

- `python app.py` process (start on boot: a Windows service, `nssm`, or a systemd unit).
- `attendance.db` — SQLite, holds everything. Restrict it with filesystem ACLs to the
  service account; keep off any web root; back it up daily (copy while the app is
  stopped, or use `sqlite3 attendance.db ".backup ..."`).
- The `templates/`/`static/` folder may be replaced only after re-testing.

## 4. Administrative playbook

- **Rotate the principal account:** `python make_admin.py --db "attendance.db" --username principal --force`
- **Reset one forgotten password:** student/teacher/admin use
  `<domain>/change-password` — self-service, unverified by design. If the college
  wants office-verification instead, contact the engineering owner; do not patch
  the reset flow yourself.
- **Rotate every credential:** rebuild with new env passwords (destructive — see §2).
- **Audit trail:** `SELECT action, actor_role, actor_id, at, detail FROM audit_log ORDER BY id DESC;` —
  logs password changes, exports, and attendance saves/edits.
- **Admin console:** `/admin` — lists which accounts still use their initial
  password (Security card). Chase those students before the first exam.
- **Restore:** point `--db` at the latest working backup and start the app.

## 5. Known, deliberate trade-offs (do not "fix" blindly)

- Forgot password is unverified — anyone knowing a register number/ID can reset an
  account (and optionally rename it). Choose: keep self-service, or ask the engineering
  owner for office-reset. See README.
- `student123`-style defaults are only present until each user rotates at first sign-in.
- No email/SMS is sent by the app. Reminders are in-app banners.

## 6. Security checklist before opening the link to 76 students

- [ ] Built per §2 with non-default passwords
- [ ] HTTPS only, cookies verified `Secure`, HSTS header present
- [ ] `attendance.db` not web-accessible; ACLs restricted
- [ ] Daily backup job proven by one restore drill
- [ ] Principal/HOD decides self-service vs office-verification for forgot-password
- [ ] Dummy smoke test with one student + one teacher account before semester starts
