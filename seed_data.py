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
    ("MCA-GEN", "1st Year MCA (General)", "2026-27 Admitted Batch"),
    ("MCA-AI", "1st Year MCA (Artificial Intelligence)", "2026-27 Admitted Batch"),
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
    # 1st Year MCA (General) - 57 Students
    ("MCA-GEN", "26PSMCA0001", "Adireddi Revanth"),
    ("MCA-GEN", "26PSMCA0002", "Alabana Durga Ram"),
    ("MCA-GEN", "26PSMCA0003", "Bandaru Sai Sananda"),
    ("MCA-GEN", "26PSMCA0004", "Barli Manoharkumar"),
    ("MCA-GEN", "26PSMCA0005", "Bayana Urmila"),
    ("MCA-GEN", "26PSMCA0006", "Behara Sai Eshwar Yerram Raju"),
    ("MCA-GEN", "26PSMCA0007", "Boddu Omkar Jyothi Swaroop"),
    ("MCA-GEN", "26PSMCA0008", "Bondi Venkatesh"),
    ("MCA-GEN", "26PSMCA0009", "Chenamalla Usha Sai Kiran"),
    ("MCA-GEN", "26PSMCA0010", "Chintala Hymavathi"),
    ("MCA-GEN", "26PSMCA0011", "Dagulupilli Latha"),
    ("MCA-GEN", "26PSMCA0012", "Dendukuri Gowtham Sri Varma"),
    ("MCA-GEN", "26PSMCA0013", "Donka Chandra Sekhar"),
    ("MCA-GEN", "26PSMCA0014", "Gara Maruti Lakshmunaidu"),
    ("MCA-GEN", "26PSMCA0015", "Gavara Uma Maheswari"),
    ("MCA-GEN", "26PSMCA0016", "Gedela Chaitanya Deep"),
    ("MCA-GEN", "26PSMCA0017", "Godha Dhasaradha"),
    ("MCA-GEN", "26PSMCA0018", "Gujji Mithilesh Reddy"),
    ("MCA-GEN", "26PSMCA0019", "Indukuri Sri Swetha Bala"),
    ("MCA-GEN", "26PSMCA0020", "Jana Bhargav"),
    ("MCA-GEN", "26PSMCA0021", "Kandipilli Mahadev"),
    ("MCA-GEN", "26PSMCA0022", "Kandrapu Aarthi"),
    ("MCA-GEN", "26PSMCA0023", "Kemburu Lokesh Kumar"),
    ("MCA-GEN", "26PSMCA0024", "Kintali Pavankalyan"),
    ("MCA-GEN", "26PSMCA0025", "Korangi Rupa Sri Lakshmi"),
    ("MCA-GEN", "26PSMCA0026", "Korikina Devika"),
    ("MCA-GEN", "26PSMCA0027", "Kusalapudi Sruthi"),
    ("MCA-GEN", "26PSMCA0028", "Majji Roshini"),
    ("MCA-GEN", "26PSMCA0029", "Manuballa Trinayani"),
    ("MCA-GEN", "26PSMCA0030", "Mavuluri Manjusha"),
    ("MCA-GEN", "26PSMCA0031", "Neelapu Yashodha Reddy"),
    ("MCA-GEN", "26PSMCA0032", "Nidumoli Vasudeva Varma"),
    ("MCA-GEN", "26PSMCA0033", "Palacharla Charan Sai Pavan Kumar"),
    ("MCA-GEN", "26PSMCA0034", "Patra Eswar Govinda Sai Nayak"),
    ("MCA-GEN", "26PSMCA0035", "Pattemu Anusha"),
    ("MCA-GEN", "26PSMCA0036", "Peddaboina Bhavana"),
    ("MCA-GEN", "26PSMCA0037", "Pendyala Gnaneswari"),
    ("MCA-GEN", "26PSMCA0038", "Penmetsa Sai Keerthi"),
    ("MCA-GEN", "26PSMCA0039", "Puranam Madhu Sri"),
    ("MCA-GEN", "26PSMCA0040", "Randi Jayasri"),
    ("MCA-GEN", "26PSMCA0041", "Reddi Harsha Sri"),
    ("MCA-GEN", "26PSMCA0042", "Reddy Eswaramma"),
    ("MCA-GEN", "26PSMCA0043", "Rokkam Hemanth"),
    ("MCA-GEN", "26PSMCA0044", "Routhu Bhanu Tejaswini"),
    ("MCA-GEN", "26PSMCA0045", "Saketi Hemakshi Gowri"),
    ("MCA-GEN", "26PSMCA0046", "Siyadri Prashant"),
    ("MCA-GEN", "26PSMCA0047", "Subham Kumar"),
    ("MCA-GEN", "26PSMCA0048", "Susarapu Balarka Bhaavagna"),
    ("MCA-GEN", "26PSMCA0049", "Suvvari Balakrishna"),
    ("MCA-GEN", "26PSMCA0050", "Talluri Pavan Kumar"),
    ("MCA-GEN", "26PSMCA0051", "Vadisala Pavan V S N E Manohar"),
    ("MCA-GEN", "26PSMCA0052", "Vajji Sai Kiran"),
    ("MCA-GEN", "26PSMCA0053", "Vandila Vamsi"),
    ("MCA-GEN", "26PSMCA0054", "Varanasi Ruchita"),
    ("MCA-GEN", "26PSMCA0055", "Yandapalli Anand"),
    ("MCA-GEN", "26PSMCA0056", "Yedla Pavani"),
    ("MCA-GEN", "26PSMCA0057", "Yeruva Mary Navya"),

    # 1st Year MCA-Artificial Intelligence - 19 Students
    ("MCA-AI", "26PSMCI0001", "Allada Ganesh"),
    ("MCA-AI", "26PSMCI0002", "Bhavitesh Boddeti"),
    ("MCA-AI", "26PSMCI0003", "Bugatha Sai Charan"),
    ("MCA-AI", "26PSMCI0004", "Kari Raju"),
    ("MCA-AI", "26PSMCI0005", "Katta Koushik"),
    ("MCA-AI", "26PSMCI0006", "Koribilli Nandu Kumar"),
    ("MCA-AI", "26PSMCI0007", "Lokireddy Harish"),
    ("MCA-AI", "26PSMCI0008", "Nakka Dinesh Sai Pavan"),
    ("MCA-AI", "26PSMCI0009", "Pentapalli Akhil Prasad"),
    ("MCA-AI", "26PSMCI0010", "Potnuru Sri Valli"),
    ("MCA-AI", "26PSMCI0011", "Rayanapati Dhanush Kumar"),
    ("MCA-AI", "26PSMCI0012", "Rayapureddi Mohana Lakshmi"),
    ("MCA-AI", "26PSMCI0013", "Reshma Mahanty"),
    ("MCA-AI", "26PSMCI0014", "Sai Nikitha Putta"),
    ("MCA-AI", "26PSMCI0015", "Siriki Vinodhini"),
    ("MCA-AI", "26PSMCI0016", "Surapureddi Lasya Rishitha"),
    ("MCA-AI", "26PSMCI0017", "Tippana Kalyani"),
    ("MCA-AI", "26PSMCI0018", "Utla Rohith Kumar"),
    ("MCA-AI", "26PSMCI0019", "Varri Tejaswini"),
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

    for class_code, class_id in class_ids.items():
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
                    class_id,
                    weekday,
                    period,
                    span,
                    subject_ids[subject_code],
                    teacher_ids[primary_employee_id],
                    faculty_label,
                ),
            )
