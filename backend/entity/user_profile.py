"""Entity layer: user_profile.

Receives already-validated, parsed inputs from the Boundary (via the Control
layer). Only performs DB-level checks here. Every method returns
``(body, status)``.
"""

from backend.entity.db import get_connection


class UserProfile:
    def list_profiles_for_login(self):
        conn = get_connection()
        try:
            rows = conn.execute(
                """
                SELECT profile_id, profile_name, description
                FROM user_profile
                WHERE is_suspended = 0
                ORDER BY profile_name COLLATE NOCASE
                """
            ).fetchall()
            return {"profiles": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def list_profiles(self, search):
        """search: optional string (already trimmed)."""
        where: list[str] = []
        params: list[object] = []

        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(profile_name LIKE ? ESCAPE '\\')"
            params.append(like)
            if search.isdigit():
                clause = f"({clause} OR profile_id = ?)"
                params.append(int(search))
            where.append(clause)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        sql = f"""
            SELECT profile_id, profile_name, description, access_control, is_suspended
            FROM user_profile
            {where_sql}
            ORDER BY profile_id ASC
        """

        conn = get_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return {"profiles": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def create_profile(self, profile_name, description, access_control):
        """profile_name: non-empty str. description/access_control: optional."""
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO user_profile (profile_name, description, access_control, is_suspended)
                VALUES (?, ?, ?, 0)
                """,
                (profile_name, description, access_control),
            )
            profile_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.commit()
            row = conn.execute(
                """
                SELECT profile_id, profile_name, description, access_control, is_suspended
                FROM user_profile
                WHERE profile_id = ?
                """,
                (profile_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"profile": dict(row) if row else None}, 201

    def update_profile(self, profile_id, profile_name, description, access_control):
        """All inputs already validated by the Boundary."""
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM user_profile WHERE profile_id = ?",
                (profile_id,),
            ).fetchone()
            if not existing:
                return {"message": "Profile not found."}, 404

            conn.execute(
                """
                UPDATE user_profile
                SET profile_name = ?, description = ?, access_control = ?
                WHERE profile_id = ?
                """,
                (profile_name, description, access_control, profile_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT profile_id, profile_name, description, access_control, is_suspended
                FROM user_profile
                WHERE profile_id = ?
                """,
                (profile_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"profile": dict(row) if row else None}, 200

    def suspend_profile(self, profile_id, suspend):
        """profile_id: int, suspend: bool."""
        suspend_val = 1 if suspend else 0
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM user_profile WHERE profile_id = ?",
                (profile_id,),
            ).fetchone()
            if not existing:
                return {"message": "Profile not found."}, 404

            conn.execute(
                "UPDATE user_profile SET is_suspended = ? WHERE profile_id = ?",
                (suspend_val, profile_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT profile_id, profile_name, description, access_control, is_suspended
                FROM user_profile
                WHERE profile_id = ?
                """,
                (profile_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"profile": dict(row) if row else None}, 200
