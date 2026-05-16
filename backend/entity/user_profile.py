"""Entity layer: user_profile."""

import sqlite3

from backend.entity.db import get_connection


class UserProfile:
    _error_message = "This profile's name already exists. Choose another name"

    def get_profiles_for_login(self):
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

    def search_profiles(self, profile_id_or_profile_name):
        params: list[object] = []
        where_sql = ""

        if profile_id_or_profile_name:
            if profile_id_or_profile_name.isdigit():
                where_sql = "WHERE profile_id = ? OR profile_name LIKE ?"
                params = [
                    int(profile_id_or_profile_name),
                    f"%{profile_id_or_profile_name}%",
                ]
            else:
                where_sql = "WHERE profile_name LIKE ?"
                params = [f"%{profile_id_or_profile_name}%"]

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

    def view(self, profile_id):
        conn = get_connection()
        try:
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
            
        if not row:
            return {"message": "Profile not found."}, 404
        return {"profile": dict(row)}, 200

    def create(self, profile_name, description, access_control):
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
        except sqlite3.IntegrityError:
            conn.rollback()
            return {"message": self._error_message}, 400
        finally:
            conn.close()

        return {"profile": dict(row) if row else None}, 201

    def update(self, profile_id, profile_name, description, access_control):
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
        except sqlite3.IntegrityError:
            conn.rollback()
            return {"message": self._error_message}, 400
        finally:
            conn.close()

        return {"profile": dict(row) if row else None}, 200

    def suspend(self, profile_id, suspend):

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
