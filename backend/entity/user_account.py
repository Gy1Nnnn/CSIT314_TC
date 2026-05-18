import sqlite3

from backend.entity.db import get_connection


class UserAccount:
    _duplicate_email_message = (
        "This email is already used by another account. Choose a different email."
    )
    _duplicate_username_message = (
        "This username is already used by another account. Choose a different username."
    )

    @staticmethod
    def _username_in_use(conn, name: str, exclude_account_id: int | None = None) -> bool:
        normalized = name.strip().lower()
        if exclude_account_id is None:
            row = conn.execute(
                """
                SELECT 1 FROM user_account
                WHERE lower(trim(name)) = ?
                LIMIT 1
                """,
                (normalized,),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT 1 FROM user_account
                WHERE lower(trim(name)) = ? AND account_id != ?
                LIMIT 1
                """,
                (normalized, exclude_account_id),
            ).fetchone()
        return row is not None

    @staticmethod
    def _email_in_use(conn, email: str, exclude_account_id: int | None = None) -> bool:
        normalized = email.strip().lower()
        if exclude_account_id is None:
            row = conn.execute(
                """
                SELECT 1 FROM user_account
                WHERE lower(trim(email)) = ?
                LIMIT 1
                """,
                (normalized,),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT 1 FROM user_account
                WHERE lower(trim(email)) = ? AND account_id != ?
                LIMIT 1
                """,
                (normalized, exclude_account_id),
            ).fetchone()
        return row is not None

    def login(self, profile_id, email, password):
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
                    up.access_control,
                    ua.is_suspended AS account_suspended,
                    up.is_suspended AS profile_suspended
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

            if row["profile_suspended"]:
                return {
                    "message": "This profile is suspended. Contact a user administrator.",
                }, 403
            if row["account_suspended"]:
                return {
                    "message": "This account is suspended. Contact a user administrator.",
                }, 403

            userAccount = dict(row)
            return {
                "message": "Login successful.",
                "user": {
                    "account_id": userAccount["account_id"],
                    "name": userAccount["name"],
                    "email": userAccount["email"],
                    "profile_id": userAccount["profile_id"],
                    "profile_name": userAccount["profile_name"],
                    "access_control": userAccount["access_control"],
                },
            }, 200
        finally:
            conn.close()

    def get_accounts(self, account_id_or_email):
        """Optional search: account_id (numeric), email, or username (name)."""
        params: list[object] = []
        where_sql = ""

        if account_id_or_email:
            like = f"%{account_id_or_email}%"
            if account_id_or_email.isdigit():
                where_sql = (
                    "WHERE ua.account_id = ? OR ua.email LIKE ? OR ua.name LIKE ?"
                )
                params = [int(account_id_or_email), like, like]
            else:
                where_sql = "WHERE ua.email LIKE ? OR ua.name LIKE ?"
                params = [like, like]

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

    def view(self, account_id):
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

    def create(self, name, email, password, profile_id):
        conn = get_connection()
        try:
            if self._username_in_use(conn, name):
                return {"message": self._duplicate_username_message}, 400
            if self._email_in_use(conn, email):
                return {"message": self._duplicate_email_message}, 400

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
        except sqlite3.IntegrityError:
            conn.rollback()
            if self._username_in_use(conn, name):
                return {"message": self._duplicate_username_message}, 400
            return {"message": self._duplicate_email_message}, 400
        finally:
            conn.close()

        return {"account": dict(row) if row else None}, 201

    def update(self, account_id, name, email, password, profile_id):
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM user_account WHERE account_id = ?",
                (account_id,),
            ).fetchone()
            if not existing:
                return {"message": "Account not found."}, 404

            if self._username_in_use(conn, name, exclude_account_id=account_id):
                return {"message": self._duplicate_username_message}, 400
            if self._email_in_use(conn, email, exclude_account_id=account_id):
                return {"message": self._duplicate_email_message}, 400

            if password is None:
                conn.execute(
                    """
                    UPDATE user_account
                    SET name = ?, email = ?, profile_id = ?
                    WHERE account_id = ?
                    """,
                    (name, email, profile_id, account_id),
                )
            else:
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
        except sqlite3.IntegrityError:
            conn.rollback()
            if self._username_in_use(conn, name, exclude_account_id=account_id):
                return {"message": self._duplicate_username_message}, 400
            return {"message": self._duplicate_email_message}, 400
        finally:
            conn.close()

        return {"account": dict(row) if row else None}, 200

    def suspend(self, account_id, suspend):
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
