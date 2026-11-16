"""Create or update an admin account in a RollCall database.

Usage:
    python make_admin.py --db "E:\\opencode\\attendance.db" --username principal

The password is prompted securely unless --password is supplied (not
recommended on shared machines). Existing attendance data is never touched.
"""
import argparse
import getpass
import os
import sqlite3
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import SCHEMA  # noqa: E402
from security import hash_password  # noqa: E402


def ensure_admins_table(conn: sqlite3.Connection) -> None:
    for statement in SCHEMA.split(";"):
        statement = statement.strip()
        if "admins" in statement.lower():
            conn.execute(statement)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or update a RollCall admin account.")
    parser.add_argument("--db", required=True, help="Path to the SQLite database.")
    parser.add_argument("--username", default="principal", help="Admin username.")
    parser.add_argument("--name", default="Principal", help="Display name.")
    parser.add_argument("--password", help="Password (prompted if omitted).")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing admin.")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        return 1

    password = args.password
    if not password:
        password = getpass.getpass("Admin password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Passwords do not match.", file=sys.stderr)
            return 1
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        return 1

    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        ensure_admins_table(conn)
        conn.commit()
        existing = conn.execute(
            "SELECT id FROM admins WHERE username = ? COLLATE NOCASE",
            (args.username,),
        ).fetchone()
        if existing and not args.force:
            print(f"Admin '{args.username}' already exists. Use --force to reset.")
            return 1
        if existing:
            conn.execute(
                "UPDATE admins SET name = ?, password_hash = ? WHERE id = ?",
                (args.name, hash_password(password), existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO admins (username, name, password_hash, created_at) "
                "VALUES (?, ?, ?, ?)",
                (
                    args.username,
                    args.name,
                    hash_password(password),
                    datetime.now().isoformat(timespec="seconds"),
                ),
            )
        conn.commit()
        print(f"Admin account ready: username='{args.username}'")
        print("Existing attendance data was not modified.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
