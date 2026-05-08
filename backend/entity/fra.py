"""Entity layer: fundraising activity (FRA).

Receives already-validated, parsed inputs from the Boundary (via the Control
layer). Only performs DB-level checks (record exists, belongs to account)
here. Every method returns ``(body, status)``.
"""

from backend.entity.db import get_connection


class FRA:
    def list_activities(self, account_id, search):
        """account_id: int. search: optional trimmed string."""
        where: list[str] = ["fr.account_id = ?"]
        params: list[object] = [account_id]

        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(fr.activity_name LIKE ? ESCAPE '\\')"
            params.append(like)
            if search.isdigit():
                clause = f"({clause} OR fr.activity_id = ?)"
                params.append(int(search))
            where.append(clause)

        where_sql = f"WHERE {' AND '.join(where)}"
        sql = f"""
            SELECT
                fr.activity_id,
                fr.activity_name,
                fr.category_id,
                c.category_name,
                fr.description,
                fr.start_date,
                fr.end_date,
                fr.target_amount,
                fr.status,
                fr.account_id,
                fr.is_suspended
            FROM FRA fr
            LEFT JOIN category c ON c.category_id = fr.category_id
            {where_sql}
            ORDER BY fr.activity_id ASC
        """

        conn = get_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return {"ok": True, "activities": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def create_activity(
        self,
        account_id,
        activity_name,
        category_id,
        description,
        start_date,
        end_date,
        target_amount,
        status,
    ):
        """All inputs already validated and parsed by the Boundary."""
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO FRA (
                    activity_name,
                    category_id,
                    description,
                    start_date,
                    end_date,
                    target_amount,
                    status,
                    account_id,
                    is_suspended
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (
                    activity_name,
                    category_id,
                    description,
                    start_date,
                    end_date,
                    target_amount,
                    status,
                    account_id,
                ),
            )
            activity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    fr.activity_id,
                    fr.activity_name,
                    fr.category_id,
                    c.category_name,
                    fr.description,
                    fr.start_date,
                    fr.end_date,
                    fr.target_amount,
                    fr.status,
                    fr.account_id,
                    fr.is_suspended
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ?
                """,
                (activity_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"ok": True, "activity": dict(row) if row else None}, 201

    def update_activity(
        self,
        activity_id,
        account_id,
        activity_name,
        category_id,
        description,
        start_date,
        end_date,
        target_amount,
        status,
    ):
        """All inputs already validated by the Boundary."""
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM FRA WHERE activity_id = ? AND account_id = ?",
                (activity_id, account_id),
            ).fetchone()
            if not existing:
                return {"ok": False, "message": "Activity not found."}, 404

            conn.execute(
                """
                UPDATE FRA
                SET activity_name = ?,
                    category_id = ?,
                    description = ?,
                    start_date = ?,
                    end_date = ?,
                    target_amount = ?,
                    status = ?
                WHERE activity_id = ? AND account_id = ?
                """,
                (
                    activity_name,
                    category_id,
                    description,
                    start_date,
                    end_date,
                    target_amount,
                    status,
                    activity_id,
                    account_id,
                ),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    fr.activity_id,
                    fr.activity_name,
                    fr.category_id,
                    c.category_name,
                    fr.description,
                    fr.start_date,
                    fr.end_date,
                    fr.target_amount,
                    fr.status,
                    fr.account_id,
                    fr.is_suspended
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ? AND fr.account_id = ?
                """,
                (activity_id, account_id),
            ).fetchone()
        finally:
            conn.close()

        return {"ok": True, "activity": dict(row) if row else None}, 200

    def suspend_activity(self, activity_id, account_id, suspend):
        """activity_id: int, account_id: int, suspend: bool."""
        suspend_val = 1 if suspend else 0
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM FRA WHERE activity_id = ? AND account_id = ?",
                (activity_id, account_id),
            ).fetchone()
            if not existing:
                return {"ok": False, "message": "Activity not found."}, 404

            conn.execute(
                """
                UPDATE FRA
                SET is_suspended = ?
                WHERE activity_id = ? AND account_id = ?
                """,
                (suspend_val, activity_id, account_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT
                    fr.activity_id,
                    fr.activity_name,
                    fr.category_id,
                    c.category_name,
                    fr.description,
                    fr.start_date,
                    fr.end_date,
                    fr.target_amount,
                    fr.status,
                    fr.account_id,
                    fr.is_suspended
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ? AND fr.account_id = ?
                """,
                (activity_id, account_id),
            ).fetchone()
        finally:
            conn.close()

        return {"ok": True, "activity": dict(row) if row else None}, 200
