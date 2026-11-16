"""Campus data for RollCall.

Gayatri Vidya Parishad Institute for Higher Learning and Research (GVP IHLR)
School of Science - MCA 1st Semester, 2026-27 Admitted Batch.

The student roster, faculty, and weekly timetable below are used to build a
fresh database. No demo attendance history is inserted: the portal starts
clean and only counts roll calls saved by teachers from now on.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime

from security import hash_password

COLLEGE_NAME = (
    "Gayatri Vidya Parishad Institute for Higher Learning and Research"
)
COLLEGE_SHORT = "GVP IHLR"
CAMPUS = "South East Campus, Rushikonda, Visakhapatnam"
SCHOOL = "School of Science"
PROGRAM = "MCA 1st Semester"
BATCH = "2026-27 Admitted Batch"

DEMO_STUDENT_PASSWORD = "student123"
DEMO_TEACHER_PASSWORD = "teacher123"
DEMO_ADMIN_PASSWORD = "RollCall@2026"

# Real deployments should set these before the first launch (and rebuild):
#   ROLLCALL_STUDENT_PASSWORD="..." ROLLCALL_TEACHER_PASSWORD="..."
STUDENT_PASSWORD = os.environ.get("ROLLCALL_STUDENT_PASSWORD") or DEMO_STUDENT_PASSWORD
TEACHER_PASSWORD = os.environ.get("ROLLCALL_TEACHER_PASSWORD") or DEMO_TEACHER_PASSWORD
ADMIN_PASSWORD = os.environ.get("ROLLCALL_ADMIN_PASSWORD") or DEMO_ADMIN_PASSWORD

WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")

PERIODS = (
    {"period": 1, "start": "09:00", "end": "10:00"},
    {"period": 2, "start": "10:00", "end": "11:00"},
    {"period": 3, "start": "11:15", "end": "12:15"},
    {"period": 4, "start": "12:15", "end": "13:15"},
    {"period": 5, "start": "14:15", "end": "15:15"},
    {"period": 6, "start": "15:15", "end": "16:15"},
    {"period": 7, "start": "16:15", "end": "17:15"},
)

BREAKS = (
    {"after": 2, "label": "Break", "start": "11:00", "end": "11:15"},
    {"after": 4, "label": "Lunch", "start": "13:15", "end": "14:15"},
)

CLASSES = [
    ("MCA-1", "MCA 1st Semester", "2026-27 Admitted Batch"),
]

SUBJECTS = [
    ("Artificial Intelligence for Problem Solving", "AI"),
    ("Data Science", "DS"),
    ("Advanced Data Structures", "ADDS"),
    ("Formal Language & Automata Theory", "FLAT"),
    ("Operational Research", "OR"),
    ("Principles of Entrepreneurship", "PE"),
    ("Python Programming", "PY"),
    ("Artificial Intelligence Lab", "AIL"),
    ("Advanced Data Structures Lab", "ADDSL"),
    ("Python Programming Lab", "PYL"),
    ("CTV - Interactive Program", "CTV"),
]

# Employee IDs and e-mail addresses are placeholders until the department
# supplies the official faculty login IDs. They can be edited and the demo
# database rebuilt with: python app.py --reset-demo
TEACHERS = [
    {
        "employee_id": "PRP",
        "name": "Mrs. P. Ratna Pavani",
        "email": "prp@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"AI", "AIL", "CTV"},
    },
    {
        "employee_id": "VL",
        "name": "Mrs. V. Lakshmi",
        "email": "vl@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"DS", "ADDSL", "CTV"},
    },
    {
        "employee_id": "CHSSRP",
        "name": "Mr. Ch. S. S. Rajesh Patnaik",
        "email": "chssrp@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"ADDS", "ADDSL", "CTV"},
    },
    {
        "employee_id": "BD",
        "name": "Mr. B. Diwakar",
        "email": "bd@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"FLAT", "PYL", "CTV"},
    },
    {
        "employee_id": "PSR",
        "name": "Dr. P. Srinivas Rao",
        "email": "psr@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"OR", "CTV"},
    },
    {
        "employee_id": "RK",
        "name": "Dr. G. Rama Krishna",
        "email": "rk@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"PE", "CTV"},
    },
    {
        "employee_id": "PVRC",
        "name": "Mr. P. V. R. Chandrasekhar",
        "email": "pvrc@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"PY", "PYL", "CTV"},
    },
    {
        "employee_id": "YMG",
        "name": "Mrs. Y. Mpunika Gayatri",
        "email": "ymg@gvpihlr.edu.in",
        "department": "School of Science",
        "subjects": {"AIL", "CTV"},
    },
]

# weekday (0 = Monday), start period, span in periods, subject code,
# faculty label shown on the timetable, primary teacher employee id.
TIMETABLE = [
    (0, 1, 2, "PYL", "PVRC / BD", "PVRC"),
    (0, 3, 1, "FLAT", "BD", "BD"),
    (0, 4, 1, "OR", "PSR", "PSR"),
    (0, 5, 1, "PE", "RK", "RK"),
    (0, 6, 1, "AI", "PRP", "PRP"),
    (1, 1, 2, "ADDSL", "CHSSRP / VL", "CHSSRP"),
    (1, 3, 1, "ADDS", "CHSSRP", "CHSSRP"),
    (1, 4, 1, "PE", "RK", "RK"),
    (1, 5, 1, "DS", "VL", "VL"),
    (1, 6, 1, "OR", "PSR", "PSR"),
    (2, 1, 2, "AIL", "PRP / YMG", "PRP"),
    (2, 3, 1, "FLAT", "BD", "BD"),
    (2, 4, 1, "OR", "PSR", "PSR"),
    (2, 5, 1, "ADDS", "CHSSRP", "CHSSRP"),
    (2, 6, 1, "AI", "PRP", "PRP"),
    (3, 1, 1, "PE", "RK", "RK"),
    (3, 2, 1, "DS", "VL", "VL"),
    (3, 3, 1, "ADDS", "CHSSRP", "CHSSRP"),
    (3, 4, 1, "FLAT", "BD", "BD"),
    (3, 5, 3, "CTV", "Interactive Program", "RK"),
    (4, 1, 1, "PY", "PVRC", "PVRC"),
    (4, 2, 1, "AI", "PRP", "PRP"),
    (4, 3, 1, "ADDS", "CHSSRP", "CHSSRP"),
    (4, 4, 1, "FLAT", "BD", "BD"),
    (4, 5, 1, "DS", "VL", "VL"),
    (4, 6, 1, "OR", "PSR", "PSR"),
]

STUDENTS = [
    # class code, register number, name
    ("MCA-1", "26PSMCA0001", "Adireddi Revanth"),
    ("MCA-1", "26PSMCA0002", "Alabana Durga Ram"),
    ("MCA-1", "26PSMCA0003", "Allada Ganesh"),
    ("MCA-1", "26PSMCA0004", "Bandaru Sai Sananda"),
    ("MCA-1", "26PSMCA0005", "Barli Manoharkumar"),
    ("MCA-1", "26PSMCA0006", "Bayana Urmila"),
    ("MCA-1", "26PSMCA0007", "Behara Sai Eshwar Yerram Raju"),
    ("MCA-1", "26PSMCA0008", "Bhavitesh Boddeti"),
    ("MCA-1", "26PSMCA0009", "Boddu Omkar Jyothi Swaroop"),
    ("MCA-1", "26PSMCA0010", "Bondi Venkatesh"),
    ("MCA-1", "26PSMCA0011", "Bugatha Sai Charan"),
    ("MCA-1", "26PSMCA0012", "Chenamalla Usha Sai Kiran"),
    ("MCA-1", "26PSMCA0013", "Chintala Hymavathi"),
    ("MCA-1", "26PSMCA0014", "Dagulupilli Latha"),
    ("MCA-1", "26PSMCA0015", "Dendukuri Gowtham Sri Varma"),
    ("MCA-1", "26PSMCA0016", "Donka Chandra Sekhar"),
    ("MCA-1", "26PSMCA0017", "Gara Maruti Lakshmunaidu"),
    ("MCA-1", "26PSMCA0018", "Gavara Uma Maheswari"),
    ("MCA-1", "26PSMCA0019", "Gedela Chaitanya Deep"),
    ("MCA-1", "26PSMCA0020", "Godha Dhasaradha"),
    ("MCA-1", "26PSMCA0021", "Gujji Mithilesh Reddy"),
    ("MCA-1", "26PSMCA0022", "Jana Bhargav"),
    ("MCA-1", "26PSMCA0023", "Kandipilli Mahadev"),
    ("MCA-1", "26PSMCA0024", "Kandrapu Aarthi"),
    ("MCA-1", "26PSMCA0025", "Kari Raju"),
    ("MCA-1", "26PSMCA0026", "Katta Koushik"),
    ("MCA-1", "26PSMCA0027", "Kemburu Lokesh Kumar"),
    ("MCA-1", "26PSMCA0028", "Kintali Pavankalyan"),
    ("MCA-1", "26PSMCA0029", "Korangi Rupa Sri Lakshmi"),
    ("MCA-1", "26PSMCA0030", "Koribilli Nandu Kumar"),
    ("MCA-1", "26PSMCA0031", "Korikina Devika"),
    ("MCA-1", "26PSMCA0032", "Kusalapudi Sruthi"),
    ("MCA-1", "26PSMCA0033", "Lokireddy Harish"),
    ("MCA-1", "26PSMCA0034", "Majji Roshini"),
    ("MCA-1", "26PSMCA0035", "Manuballa Trinayani"),
    ("MCA-1", "26PSMCA0036", "Mavuluri Manjusha"),
    ("MCA-1", "26PSMCA0037", "Nakka Dinesh Sai Pavan"),
    ("MCA-1", "26PSMCA0038", "Neelapu Yashodha Reddy"),
    ("MCA-1", "26PSMCA0039", "Nidumoli Vasudeva Varma"),
    ("MCA-1", "26PSMCA0040", "Palacharla Charan Sai Pavan Kumar"),
    ("MCA-1", "26PSMCA0041", "Patra Eswar Govinda Sai Nayak"),
    ("MCA-1", "26PSMCA0042", "Pattemu Anusha"),
    ("MCA-1", "26PSMCA0043", "Peddaboina Bhavana"),
    ("MCA-1", "26PSMCA0044", "Pendyala Gnaneswari"),
    ("MCA-1", "26PSMCA0045", "Penmetsa Sai Keerthi"),
    ("MCA-1", "26PSMCA0046", "Pentapalli Akhil Prasad"),
    ("MCA-1", "26PSMCA0047", "Potnuru Sri Valli"),
    ("MCA-1", "26PSMCA0048", "Puranam Madhu Sri"),
    ("MCA-1", "26PSMCA0049", "Randi Jayasri"),
    ("MCA-1", "26PSMCA0050", "Rayanapati Dhanush Kumar"),
    ("MCA-1", "26PSMCA0051", "Rayapureddi Mohana Lakshmi"),
    ("MCA-1", "26PSMCA0052", "Reddi Harsha Sri"),
    ("MCA-1", "26PSMCA0053", "Reddy Eswaramma"),
    ("MCA-1", "26PSMCA0054", "Reshma Mahanty"),
    ("MCA-1", "26PSMCA0055", "Rokkam Hemanth"),
    ("MCA-1", "26PSMCA0056", "Routhu Bhanu Tejaswini"),
    ("MCA-1", "26PSMCA0057", "Sai Nikitha Putta"),
    ("MCA-1", "26PSMCA0058", "Saketi Hemakshi Gowri"),
    ("MCA-1", "26PSMCA0059", "Siriki Vinodhini"),
    ("MCA-1", "26PSMCA0060", "Siyadri Prashant"),
    ("MCA-1", "26PSMCA0061", "Subham Kumar"),
    ("MCA-1", "26PSMCA0062", "Surapureddi Lasya Rishitha"),
    ("MCA-1", "26PSMCA0063", "Susarapu Balarka Bhaavagna"),
    ("MCA-1", "26PSMCA0064", "Suvvari Balakrishna"),
    ("MCA-1", "26PSMCA0065", "Talluri Pavan Kumar"),
    ("MCA-1", "26PSMCA0066", "Tippana Kalyani"),
    ("MCA-1", "26PSMCA0067", "Utla Rohith Kumar"),
    ("MCA-1", "26PSMCA0068", "Vadisala Pavan V S N E Manohar"),
    ("MCA-1", "26PSMCA0069", "Vajji Sai Kiran"),
    ("MCA-1", "26PSMCA0070", "Vandila Vamsi"),
    ("MCA-1", "26PSMCA0071", "Varanasi Ruchita"),
    ("MCA-1", "26PSMCA0072", "Varri Tejaswini"),
    ("MCA-1", "26PSMCA0073", "Yandapalli Anand"),
    ("MCA-1", "26PSMCA0074", "Yedla Pavani"),
    ("MCA-1", "26PSMCA0075", "Yeruva Mary Navya"),
    ("MCA-1", "26PSMCA0076", "Indukuri Sri Swetha Bala"),
]


def seed_database(conn: sqlite3.Connection) -> None:
    """Populate a fresh database with the MCA roster and weekly timetable."""
    class_ids: dict[str, int] = {}
    for code, name, semester in CLASSES:
        cur = conn.execute(
            "INSERT INTO classes (code, name, semester) VALUES (?, ?, ?)",
            (code, name, semester),
        )
        class_ids[code] = int(cur.lastrowid)

    subject_ids: dict[str, int] = {}
    for name, code in SUBJECTS:
        cur = conn.execute(
            "INSERT INTO subjects (name, code) VALUES (?, ?)", (name, code)
        )
        subject_ids[code] = int(cur.lastrowid)

    teacher_ids: dict[str, int] = {}
    for teacher in TEACHERS:
        cur = conn.execute(
            """
            INSERT INTO teachers
                (employee_id, name, email, password_hash, department)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                teacher["employee_id"],
                teacher["name"],
                teacher["email"],
                hash_password(TEACHER_PASSWORD),
                teacher["department"],
            ),
        )
        teacher_id = int(cur.lastrowid)
        teacher_ids[teacher["employee_id"]] = teacher_id

        for class_code, class_id in class_ids.items():
            for subject_code in sorted(teacher["subjects"]):
                conn.execute(
                    """
                    INSERT INTO teacher_assignments
                        (teacher_id, class_id, subject_id)
                    VALUES (?, ?, ?)
                    """,
                    (teacher_id, class_id, subject_ids[subject_code]),
                )

    conn.execute(
        """
        INSERT INTO admins (username, name, password_hash, created_at)
        VALUES (?, ?, ?, ?)
        """,
        ("principal", "Principal", hash_password(ADMIN_PASSWORD), datetime.now().isoformat(timespec="seconds")),
    )

    for class_code, register_no, name in STUDENTS:
        conn.execute(
            """
            INSERT INTO students
                (register_no, name, email, password_hash, class_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                register_no,
                name,
                f"{register_no.lower()}@student.rollcall.local",
                hash_password(STUDENT_PASSWORD),
                class_ids[class_code],
            ),
        )

    for (
        weekday,
        period,
        span,
        subject_code,
        faculty_label,
        primary_employee_id,
    ) in TIMETABLE:
        conn.execute(
            """
            INSERT INTO timetable
                (class_id, weekday, period, span, subject_id,
                 primary_teacher_id, faculty_label)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                class_ids["MCA-1"],
                weekday,
                period,
                span,
                subject_ids[subject_code],
                teacher_ids[primary_employee_id],
                faculty_label,
            ),
        )
