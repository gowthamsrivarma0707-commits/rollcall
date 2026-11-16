# RollCall

A complete, dependency-free attendance portal for **GVP IHLR — School of
Science, MCA 1st Semester (2026-27 Admitted Batch)**, with separate student and
teacher workspaces.

- Students sign in with their register number and see live attendance, today's
  classes, the weekly timetable, their safe-to-skip allowance, and exactly how
  many periods they need to recover to 75%.
- Teachers sign in with their employee ID or e-mail, pick a period straight from
  the timetable, mark the class in a few taps, and save. Labs and the CTV
  interactive program are marked once and counted for their full span.
- Public holidays and festivals can be marked per period. Holiday periods are
  excluded from every attendance percentage.
- Student dashboards poll every 15 seconds and refresh when the tab regains
  focus, so saved changes appear without a manual reload.

The project uses Python's standard library, SQLite, and plain HTML/CSS/JS.
The only extra is `openpyxl`, required solely for the monthly Excel export:

```bat
python -m pip install openpyxl
```

There is no npm install, build step, or external service to configure.

> **Deploying to your own college infrastructure?** Read **SETUP.md** first —
> it covers HTTPS, the initial password rotation, backups and the audit trail.

---

## Quick start

**Windows (recommended):** double-click `start.bat`.

It starts the app at <http://127.0.0.1:8000> and opens the browser. The first
launch creates `attendance.db` and loads the MCA-1 campus automatically.

**From a terminal:**

```bat
cd /d "E:\opencode"
python app.py
```

Then open <http://127.0.0.1:8000>.

### Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Student | `26PSMCA0001` | `student123` |
| Student (any register no.) | `26PSMCA0002` … `26PSMCA0076` | `student123` |
| Teacher (employee ID) | `CHSSRP` | `teacher123` |
| Teacher (e-mail) | `chssrp@gvpihlr.edu.in` | `teacher123` |
| Admin (console) | `principal` | `RollCall@2026` |

All 76 students use `student123`. Every faculty account uses `teacher123` and
can sign in with either the employee ID or the e-mail shown in `seed_data.py`:

| Employee ID | E-mail | Name |
| --- | --- | --- |
| `PRP` | `prp@gvpihlr.edu.in` | Mrs. P. Ratna Pavani |
| `VL` | `vl@gvpihlr.edu.in` | Mrs. V. Lakshmi |
| `CHSSRP` | `chssrp@gvpihlr.edu.in` | Mr. Ch. S. S. Rajesh Patnaik |
| `BD` | `bd@gvpihlr.edu.in` | Mr. B. Diwakar |
| `PSR` | `psr@gvpihlr.edu.in` | Dr. P. Srinivas Rao |
| `RK` | `rk@gvpihlr.edu.in` | Dr. G. Rama Krishna |
| `PVRC` | `pvrc@gvpihlr.edu.in` | Mr. P. V. R. Chandrasekhar |
| `YMG` | `ymg@gvpihlr.edu.in` | Mrs. Y. Mpunika Gayatri | The admin console is a separate
portal at `/admin` and can view and update attendance for every teacher and
subject. The `principal` account can sign in from either `/admin/login` or
`/teacher/login`; both routes land on the admin console.

> **Admin credentials.** The default `principal` / `RollCall@2026` account is
> created when a fresh database is built. Override it before any deployment:
>
> ```bat
> set ROLLCALL_ADMIN_PASSWORD=your-admin-password
> python app.py --reset-demo
> ```
>
> For an existing database (such as the delivery copy) add or reset the admin
> without touching attendance data:
>
> ```bat
> python make_admin.py --db "E:\opencode\attendance.db" --username principal
> ```

> **Faculty logins are placeholders.** The employee IDs and e-mail addresses in
> `seed_data.py` are temporary until the department supplies the official ones.
> After updating them, rebuild with `python app.py --reset-demo`.

> **Change the default passwords before any public deployment.** They are read
> when the database is built:
>
> ```bat
> set ROLLCALL_TEACHER_PASSWORD=your-teacher-password
> set ROLLCALL_STUDENT_PASSWORD=your-student-password
> python app.py --reset-demo
> ```
>
> Setting the variables does not rewrite an existing `attendance.db`; rotate
> accounts deliberately or rebuild before real attendance is recorded.
> `--reset-demo` deletes all saved roll calls.

There is no demo sign-in shortcut in the UI. Keep the default passwords out of
the open and rotate them before deployment.

The database starts with **no attendance history**. Percentages begin at zero
and only count roll calls saved after installation.

---

## Weekly timetable

Periods run 9:00–10:00, 10:00–11:00, break 11:00–11:15, 11:15–12:15,
12:15–13:15, lunch 13:15–14:15, 14:15–15:15, 15:15–16:15, 16:15–17:15.

| Day | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mon | Python Lab (PVRC/BD) | ← | FLAT (BD) | OR (PSR) | PE (RK) | AI (PRP) | — |
| Tue | AdDS Lab (CHSSRP/VL) | ← | AdDS (CHSSRP) | PE (RK) | DS (VL) | OR (PSR) | — |
| Wed | AI Lab (PRP/YMG) | ← | FLAT (BD) | OR (PSR) | AdDS (CHSSRP) | AI (PRP) | — |
| Thu | PE (RK) | DS (VL) | AdDS (CHSSRP) | FLAT (BD) | CTV (3 periods) | ← | ← |
| Fri | Python (PVRC) | AI (PRP) | AdDS (CHSSRP) | FLAT (BD) | DS (VL) | OR (PSR) | — |

**Period weighting**

- A **lab** occupies two periods (P1–P2) and is marked once by the lab faculty.
  It counts as **two** attendance periods.
- **CTV** occupies three periods (Thursday P5–P7) and is marked once. It counts
  as **three** attendance periods.
- Every other class counts as one period.
- A **holiday** counts as zero periods for everyone.

Only periods that exist in this timetable can be marked. Teachers can mark the
subjects assigned to them, plus CTV; other periods are locked.

---

## Using RollCall

### Student workspace

After signing in, a student sees:

- Today's classes, with lab/CTV spans and any holiday flags.
- The full weekly timetable, colour-coded for theory, labs, and CTV.
- Overall attended, total, and missed periods.
- Current percentage against the 75% requirement.
- **Safe-to-skip allowance:** how many future periods can be missed while still
  staying at or above 75%.
- **Attend to recover:** how many consecutive periods are needed to get back to
  75% if currently below it.
- A per-subject breakdown and the latest saved classes, holidays included.

### Teacher workspace

1. Choose **Take attendance**.
2. Pick a date (today by default) and select a period from that day's timetable.
3. Everyone loads as present. Tap **Absent** for the students who are missing,
   or use **All present / All absent** for a quick bulk mark.
4. Select **Save attendance**. The student dashboards update immediately; open
   dashboards also refresh within 15 seconds.
5. Open **Records** to filter saved roll calls and select **Edit** to correct a
   previous one. Saving again updates the existing session instead of creating a
   duplicate.

Attendance cannot be recorded for a future date.

### Monitoring students

Open the **Students** tab to see every student in the class with attended
periods, total periods, current percentage against 75%, and whether they are
on track. Use the subject filter to scope the numbers to one subject or
**Overall (all subjects)**. Red percentages are below 75%; the
**Requirement** column shows how many more periods are needed to reach 75%.
The same monitor is available on the admin console, and it refreshes whenever
attendance is saved.

### Monthly Excel report

At the bottom of the **Students** tab, pick a month and select
**Download Excel**. RollCall produces an `.xlsx` with:

- **Summary** — every student with attended periods, total periods, attendance
  percentage and the requirement (on track / needs N more), followed by a
  combined class-average row.
- **One sheet per subject** — a student-by-session matrix with `1` for present
  and `0` for absent, span-weighted totals (lab = 2, CTV = 3), live
  `Attended`, `Total` and `Attendance %` formulas, below-75 highlights,
  frozen register/name columns, filters and print-ready landscape pages.
  Each session column also carries a **teacher row** showing who took that
  class — substitutions are prefixed with `S` in amber (e.g. `S Mrs. V. Lakshmi`).

Holidays are excluded from the report. The filename is
`RollCall_<class>_<YYYY-MM>.xlsx`.

### When a teacher is absent: swapping the period

If the scheduled teacher is absent and another faculty member takes the class:

1. The substitute signs in with **their own** employee ID or e-mail.
2. In the timetable, periods taught by another faculty member show a
   **Substitute** tag. Their own periods still show normally.
3. Select that period. The roster opens with
   **Covering for \<scheduled teacher\>** in the header.
4. Mark attendance and save as usual.

Swap is **not limited to today**. Pick any past or current date in the date
picker and the substitute tag is available for that day's timetable, so a
period exchange or a missed substitution can still be recorded later. Only
future dates stay blocked, because attendance cannot be marked in advance.

What RollCall stores for a swap:

- `teacher_id` — the teacher who actually took the class (the substitute).
- `scheduled_teacher_id` — the originally scheduled teacher.
- `is_substitution = 1` and an automatic note such as
  `Substitute for Mrs. V. Lakshmi` (the API also accepts a custom `note`).
- The **scheduled subject** is counted for students, so subject percentages
  stay correct. A lab/CTV still counts its full span.
- The slot stays unique per class, subject, date and period. Saving again
  updates the same record instead of creating a duplicate.
- If the period was already recorded by another teacher, the substitute cannot
  overwrite it — the principal can correct it from the admin console.

The originally assigned teacher still sees the covered session in **Records**,
labelled `· substitute`, so no attendance silently disappears from their view.

### Marking a holiday

If a period does not happen — a public holiday, festival, or cancelled class —
open that period and select **Mark as holiday**. The period is saved with no
present/absent marks and is excluded from every student's percentage. Select
**Take attendance instead** if the class actually happened, then save.

---

## Attendance calculation

Attendance is calculated with exact integer arithmetic, not rounded decimals:

```text
Safe skips  = floor((4 × attended − 3 × total) / 3)   when attendance ≥ 75%
To recover  = max(0, 3 × total − 4 × attended)         when attendance < 75%
```

`attended` and `total` are period-weighted: a lab adds 2, CTV adds 3, theory
adds 1, and holidays add nothing. Only saved attendance sessions count. A roll
call that has not been saved is not visible to students.

---

## Customising the data

The campus is defined in `seed_data.py`:

- `CLASSES` — class code, display name, semester.
- `SUBJECTS` — subject name and code.
- `TEACHERS` — employee ID, name, e-mail, department, assigned subject codes.
- `TIMETABLE` — subject code and faculty per weekday period, with span.
- `STUDENTS` — register number and name for all 76 students.

After editing the seed file, rebuild the database:

```bat
python app.py --reset-demo
```

> **Warning:** `--reset-demo` deletes `attendance.db` and every saved roll call.
> Back up the database first once real attendance has been recorded.

### Current data

- 1 class: MCA-1 (MCA 1st Semester, 2026-27 Admitted Batch).
- 11 subjects, including three labs and the CTV interactive program.
- 8 faculty accounts with placeholder IDs.
- 26 scheduled periods per week across Monday–Friday.
- 76 students, register numbers `26PSMCA0001`–`26PSMCA0076`.
- No seeded attendance: the site starts clean.

---

## Files

```text
SETUP.md               College deployment runbook (HTTPS, rotation, backups)
app.py                 HTTP server, routes, authentication, APIs, 75% maths
security.py            PBKDF2 password hashing and session-token helpers
seed_data.py           MCA-1 class, subjects, faculty, timetable, and roster
templates/             Landing, login, student, teacher, and admin pages
static/css/            Responsive styles
static/js/             Browser logic for login, student, teacher workspaces
attendance.db          SQLite database (created automatically; clean on first run)
start.bat              Windows one-click launcher
```

Runtime data can also live elsewhere with the `ROLLCALL_DB` environment variable.

---

## Configuration

| Option | Default | How to change |
| --- | --- | --- |
| Host | `127.0.0.1` | `python app.py --host 0.0.0.0` or `ROLLCALL_HOST` |
| Port | `8000` | `python app.py --port 8001` or `ROLLCALL_PORT` |
| Database | `attendance.db` | `python app.py --db "D:\data\rollcall.db"` or `ROLLCALL_DB` |
| Open browser | off | `python app.py --open` (or use `start.bat`) |
| Reset demo | off | `python app.py --reset-demo` |
| Student password | `student123` | `ROLLCALL_STUDENT_PASSWORD`, then rebuild |
| Teacher password | `teacher123` | `ROLLCALL_TEACHER_PASSWORD`, then rebuild |
| Admin password | `RollCall@2026` | `ROLLCALL_ADMIN_PASSWORD`, then rebuild or `make_admin.py` |

Examples:

```bat
python app.py --port 8001
python app.py --host 0.0.0.0 --port 8000
python app.py --open
```

### Backing up

Stop the server, then copy `attendance.db`. To keep only the database and skip
the generated demo, remove `attendance.db` before starting a fresh copy.

---

## Security notes

The app is a single-process Python/SQLite server intended for a department or
small campus. It makes no outbound API calls and uses no third-party API keys,
Supabase project, service-role key, or cloud database. Server-side controls:

- PBKDF2-SHA256 password hashes (210,000 iterations, per-user salt). Unknown
  usernames still verify a dummy hash to reduce timing differences.
- Random 256-bit session tokens; only SHA-256 fingerprints are stored. Cookies
  are `HttpOnly`, `SameSite=Lax`, path-scoped, and marked `Secure` when the TLS
  proxy sends `X-Forwarded-Proto: https`.
- Separately scoped student and teacher cookies, so both portals can stay open
  in one browser without sharing a role.
- Every API route re-checks the session role; page routes redirect on a role
  mismatch. No route trusts a client-supplied user or student ID.
- Teacher reads and writes require a matching `teacher_assignments` row for the
  exact class and subject. The teacher ID comes from the session, never a
  request parameter. CTV is co-assigned to all eight faculty by design, so CTV
  rosters, history, and edits are shared; every other subject has one assigned
  teacher.
- Attendance saves must contain exactly the active class roster: partial,
  duplicate, unknown, float, and boolean student IDs are rejected.
- Login throttling counts failures per account and per source address;
  successful logins do not consume quota. Attendance and roster endpoints have
  separate sliding-window limits.
- POST bodies must be `application/json`, are capped at 1 MB, and cross-site
  `Origin` / `Sec-Fetch-Site` requests are rejected.
- CSP (`default-src 'self'`, no inline script), frame denial, `nosniff`,
  same-origin referrer, COOP/CORP, and `noindex` headers. The `Server` header
  does not reveal the Python version.
- Template and static loads are confined to their directories; static responses
  use a file-extension allowlist.

### Before public deployment (manual work)

These items cannot be proven by reading the code and must be checked on the
real host:

1. **Rotate the shared passwords.** All 76 students share `student123`. That is
   an operational risk even though server-side authorization is correct. Set
   `ROLLCALL_STUDENT_PASSWORD` / `ROLLCALL_TEACHER_PASSWORD` before building the
   database, or rotate hashes deliberately.
2. **Terminate HTTPS at a reverse proxy** (IIS, Caddy, or nginx) and forward
   `X-Forwarded-Proto: https`. Verify in a browser that `Set-Cookie` includes
   `Secure` and that HSTS is present.
3. **Restrict the database file.** Only the service account should be able to
   read `attendance.db`; it contains names, register numbers, and attendance.
4. **No account holds credentials on the sign-in page.** The demo card and
   `/api/demo` were removed; keep it that way.
5. **Back up `attendance.db`** while the server is stopped, and test a restore.
6. **Firewall** the port to the campus network if the portal is not meant to be
   public.
7. **Add proxy-level rate limiting** for volumetric abuse. The in-process
   limiter protects individual endpoints, not the whole host.
8. **Decide the CTV policy.** All eight faculty share the same CTV session, so
   one teacher can overwrite another's marks, and marking a holiday deletes that
   session's records. That is the current shared-marking design; if an audit
   trail is required, add an edit-history table or restrict CTV edits.

The built-in `ThreadingHTTPServer` is intended for low-traffic campus use. For a
large public deployment, add an HTTPS reverse proxy and plan for monitoring,
backups, and account provisioning.

---

## Troubleshooting

**Port 8000 is already in use**

```bat
python app.py --port 8001
```

Then open <http://127.0.0.1:8001>.

**The page will not load / browser did not open**

Check that Python 3.10 or newer is installed:

```bat
python --version
```

Then start the app again and open <http://127.0.0.1:8000> manually.

**I need a clean start again**

```bat
python app.py --reset-demo
```

Stop the running server first. This removes all attendance saves and rebuilds the
MCA-1 campus with no history.

**Forgot a password**

Open `<http://127.0.0.1:8000/change-password>` (or select **Forgot password?** on
any sign-in page). Choose the account type, enter the register number / employee
ID / e-mail and set a new password of at least 8 characters. It works
immediately. The old password stops working, and every existing session for
that account is signed out.

**Usernames — students are fixed** — students sign in with their register
number (`26PSMCA0001`…`26PSMCA0076`) and it cannot be changed anywhere in the
UI: register numbers are the college's canonical identifier, and reordering
them scrambles the attendance roster layout. Teachers may change their
employee ID and college e-mail (e-mail must end with `.edu.in`) from the same
`/change-password` page — nothing else about a teacher account changes there.
Admins use `principal`, fixed.

**Teachers — change username**

The same sign-in page has an **Update your username** section (teachers
only): enter current password, then a new employee ID and/or college e-mail.
Other devices are signed out; the attendance database keys off internal IDs,
so history follows the rename. Uniqueness enforced.

The **Forgot your password?** flow also carries an optional section for
teachers — set a new e-mail and/or employee ID along with the new password,
or leave them blank to keep the current ones. Students and admin cannot use
those fields; theirs are fixed.

> **Security note — read before deployment:** the forgot-password flow
> verifies nothing about the caller. Anyone who knows an account's username can
> set a new password for it with no recovery path. That behaviour was chosen
> deliberately for this deployment because the college has no email/SMS
> verification channel. The safer pattern is to have the principal reset
> passwords from office after checking a student ID. If that trade changes,
> the fix is a one-time code flow, not more fields on this page.

**Change password while signed in**

Select the key icon in the header (student, teacher and admin portals) and
enter the current password plus a new one. Other devices stay signed out; your
current session is kept.

> **Note:** the reset option verifies nothing beyond the account identifier —
> anyone who knows a register number can set a new password for it. That is
> the agreed behaviour for this deployment. If you want reset codes or
> principal-only resets instead, ask a developer.

**Audit trail**

Password changes, teacher username/e-mail changes, monthly exports and every
attendance save/edit (including substitutions and admin corrections) are
written to the `audit_log` table with the actor, time and a short detail.
The admin console shows a **Security card** listing every account still on
its initial password. All newly seeded accounts carry
`must_change_password = 1`; the banner on every portal reminds those accounts
to rotate, and it clears only when the password actually changes.
