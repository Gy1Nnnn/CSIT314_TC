"""Entity layer: user_account.

Receives already-validated, parsed inputs from the Boundary (via the Control
layer). Only performs DB-level checks (existence, credential matching) here.
Every method returns ``(body, status)``.
"""

from backend.entity.db import get_connection


class UserAccount:
    def login(self, profile_id, email, password):
        """profile_id: int, email: str (non-empty), password: str (non-empty)."""
        conn = get_connection()
        try:
            row = conn.execute(
                """
                SELECT
                    ua.account_id,
                    ua.name,
                    ua.email,
                    ua.profile_id,
                    up.profile_name,
                    up.access_control
                FROM user_account ua
                JOIN user_profile up ON up.profile_id = ua.profile_id
                WHERE ua.email = ? AND ua.password = ? AND ua.profile_id = ?
                """,
                (email, password, profile_id),
            ).fetchone()
            if not row:
                return {
                    "message": "Invalid email, password, or profile combination.",
                }, 401

            user = dict(row)
            return {
                "message": "Login successful.",
                "user": {
                    "account_id": user["account_id"],
                    "name": user["name"],
                    "email": user["email"],
                    "profile_id": user["profile_id"],
                    "profile_name": user["profile_name"],
                    "access_control": user["access_control"],
                },
            }, 200
        finally:
            conn.close()

    def list_accounts(self, search):
        """search: optional string (already trimmed)."""
        where: list[str] = []
        params: list[object] = []

        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(ua.name LIKE ? ESCAPE '\\' OR ua.email LIKE ? ESCAPE '\\')"
            params.extend([like, like])
            if search.isdigit():
                clause = f"({clause} OR ua.account_id = ?)"
                params.append(int(search))
            where.append(clause)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        sql = f"""
            SELECT
                ua.account_id,
                ua.name,
                ua.email,
                ua.password,
                ua.profile_id,
                ua.is_suspended,
                up.profile_name
            FROM user_account ua
            JOIN user_profile up ON up.profile_id = ua.profile_id
            {where_sql}
            ORDER BY ua.account_id ASC
        """

        conn = get_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return {"accounts": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def view_account(self, account_id):
        """account_id: int."""
        conn = get_connection()
        try:
            row = conn.execute(
                """
                SELECT
                    ua.account_id,
                    ua.name,
                    ua.email,
                    ua.password,
                    ua.profile_id,
                    ua.is_suspended,
                    up.profile_name
                FROM user_account ua
                JOIN user_profile up ON up.profile_id = ua.profile_id
                WHERE ua.account_id = ?
                """,
                (account_id,),
            ).fetchone()
        finally:
            conn.close()

        if not row:
            return {"message": "Account not found."}, 404
        return {"account": dict(row)}, 200

    def create_account(self, name, email, password, profile_id):
        """All inputs already validated and trimmed by the Boundary."""
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO user_account (name, email, password, profile_id, is_suspended)
                VALUES (?, ?, ?, ?, 0)
                """,
                (name, email, password, profile_id),
            )
            account_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    ua.account_id,
                    ua.name,
                    ua.email,
                    ua.password,
                    ua.profile_id,
                    ua.is_suspended,
                    up.profile_name
                FROM user_account ua
                JOIN user_profile up ON up.profile_id = ua.profile_id
                WHERE ua.account_id = ?
                """,
                (account_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"account": dict(row) if row else None}, 201

    def update_account(self, account_id, name, email, password, profile_id):
        """All inputs already validated by the Boundary."""
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM user_account WHERE account_id = ?",
                (account_id,),
            ).fetchone()
            if not existing:
                return {"message": "Account not found."}, 404

            conn.execute(
                """
                UPDATE user_account
                SET name = ?, email = ?, password = ?, profile_id = ?
                WHERE account_id = ?
                """,
                (name, email, password, profile_id, account_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    ua.account_id,
                    ua.name,
                    ua.email,
                    ua.password,
                    ua.profile_id,
                    ua.is_suspended,
                    up.profile_name
                FROM user_account ua
                JOIN user_profile up ON up.profile_id = ua.profile_id
                WHERE ua.account_id = ?
                """,
                (account_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"account": dict(row) if row else None}, 200

    def suspend_account(self, account_id, suspend):
        """account_id: int, suspend: bool."""
        suspend_val = 1 if suspend else 0
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM user_account WHERE account_id = ?",
                (account_id,),
            ).fetchone()
            if not existing:
                return {"message": "Account not found."}, 404

            conn.execute(
                "UPDATE user_account SET is_suspended = ? WHERE account_id = ?",
                (suspend_val, account_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    ua.account_id,
                    ua.name,
                    ua.email,
                    ua.password,
                    ua.profile_id,
                    ua.is_suspended,
                    up.profile_name
                FROM user_account ua
                JOIN user_profile up ON up.profile_id = ua.profile_id
                WHERE ua.account_id = ?
                """,
                (account_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"account": dict(row) if row else None}, 200
