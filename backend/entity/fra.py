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

    def _public_activity_from_clause(self):
        """JOIN/WHERE for activities visible to donees (active, not suspended)."""
        return """
            FROM FRA fr
            INNER JOIN category c
                ON c.category_id = fr.category_id AND c.is_suspended = 0
            INNER JOIN user_account org
                ON org.account_id = fr.account_id AND org.is_suspended = 0
            WHERE fr.is_suspended = 0
              AND LOWER(TRIM(fr.status)) = 'active'
        """

    def _public_activity_select(self):
        return """
            SELECT
                fr.activity_id,
                fr.activity_name,
                fr.category_id,
                c.category_name,
                fr.description,
                fr.start_date,
                fr.end_date,
                fr.duration,
                fr.target_amount,
                fr.status,
                fr.account_id,
                org.name AS organizer_name
        """

    def list_public_activities(self, search):
        """List active, non-suspended FRAs in active categories (optional search)."""
        where_sql = self._public_activity_from_clause()
        params: list[object] = []
        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(fr.activity_name LIKE ? ESCAPE '\\' OR c.category_name LIKE ? ESCAPE '\\')"
            params.extend([like, like])
            if search.isdigit():
                clause = f"({clause} OR fr.activity_id = ?)"
                params.append(int(search))
            where_sql += f" AND {clause}"

        sql = (
            self._public_activity_select()
            + where_sql
            + " ORDER BY fr.activity_name COLLATE NOCASE, fr.activity_id ASC"
        )

        conn = get_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return {"ok": True, "activities": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def view_public_activity(self, activity_id):
        """Single activity if publicly available; else 404."""
        sql = (
            self._public_activity_select()
            + self._public_activity_from_clause()
            + " AND fr.activity_id = ?"
        )
        conn = get_connection()
        try:
            row = conn.execute(sql, (activity_id,)).fetchone()
        finally:
            conn.close()

        if not row:
            return {"ok": False, "message": "Activity not found or not available."}, 404
        return {"ok": True, "activity": dict(row)}, 200

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
