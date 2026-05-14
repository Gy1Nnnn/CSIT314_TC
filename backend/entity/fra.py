"""Entity layer: fundraising activity (FRA).

Receives already-validated, parsed inputs from the Boundary (via the Control
layer). Only performs DB-level checks (record exists, belongs to account)
here. Every method returns ``(body, status)``.
"""

from backend.entity.db import get_connection


def apply_fra_completed_past_end_date(conn, account_id=None, activity_id=None):
    """Set ``status`` to ``completed`` for active FRAs past ``end_date`` (ISO ``YYYY-MM-DD``).

    Only rows with ``status`` active, ``is_suspended`` 0, non-empty ``end_date``,
    and ``date(end_date) < date('now')`` are updated. Manual ``completed`` /
    ``suspended`` are left unchanged.
    """
    parts = [
        "is_suspended = 0",
        "LOWER(TRIM(COALESCE(status, ''))) = 'active'",
        "end_date IS NOT NULL",
        "TRIM(end_date) != ''",
        "date(end_date) < date('now')",
    ]
    sql = f"UPDATE FRA SET status = 'completed' WHERE {' AND '.join(parts)}"
    params: list[object] = []
    if account_id is not None:
        sql += " AND account_id = ?"
        params.append(account_id)
    if activity_id is not None:
        sql += " AND activity_id = ?"
        params.append(activity_id)
    conn.execute(sql, params)


class FRA:
    """Fundraising activities: CRUD, public browse, and auto-``completed`` past ``end_date``."""

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

        fav_sub = (
            "(SELECT COUNT(*) FROM donee_favorite df WHERE df.activity_id = fr.activity_id)"
        )
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
                fr.is_suspended,
                fr.view_count,
                {fav_sub} AS favorite_count
            FROM FRA fr
            LEFT JOIN category c ON c.category_id = fr.category_id
            {where_sql}
            ORDER BY fr.activity_id ASC
        """

        conn = get_connection()
        try:
            apply_fra_completed_past_end_date(conn, account_id=account_id)
            rows = conn.execute(sql, params).fetchall()
            return {"activities": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def list_completed_history(
        self,
        account_id,
        search,
        category_id,
        date_from,
        date_to,
    ):
        """Completed FRAs for ``account_id`` with optional filters.

        Includes every row whose ``status`` is ``completed`` (including
        soft-deleted / ``is_suspended`` records) so the full completed history
        is visible. Rows still ``active`` only because ``end_date`` has passed
        are updated to ``completed`` by ``apply_fra_completed_past_end_date``
        before this query runs.

        ``date_from`` / ``date_to`` filter on ``end_date`` (inclusive) when set;
        rows with empty ``end_date`` are excluded only when a date bound is
        applied. ``category_id`` filters by FRA category (service area).
        """
        where: list[str] = [
            "fr.account_id = ?",
            "LOWER(TRIM(COALESCE(fr.status, ''))) = 'completed'",
        ]
        params: list[object] = [account_id]

        if category_id is not None:
            where.append("fr.category_id = ?")
            params.append(category_id)

        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(fr.activity_name LIKE ? ESCAPE '\\')"
            params.append(like)
            if search.isdigit():
                clause = f"({clause} OR fr.activity_id = ?)"
                params.append(int(search))
            where.append(clause)

        if date_from:
            where.append(
                "(fr.end_date IS NOT NULL AND TRIM(fr.end_date) != '' "
                "AND date(fr.end_date) >= date(?))"
            )
            params.append(date_from)
        if date_to:
            where.append(
                "(fr.end_date IS NOT NULL AND TRIM(fr.end_date) != '' "
                "AND date(fr.end_date) <= date(?))"
            )
            params.append(date_to)

        fav_sub = (
            "(SELECT COUNT(*) FROM donee_favorite df WHERE df.activity_id = fr.activity_id)"
        )
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
                fr.is_suspended,
                fr.view_count,
                {fav_sub} AS favorite_count
            FROM FRA fr
            LEFT JOIN category c ON c.category_id = fr.category_id
            {where_sql}
            ORDER BY fr.end_date DESC, fr.activity_id DESC
        """

        conn = get_connection()
        try:
            apply_fra_completed_past_end_date(conn, account_id=account_id)
            rows = conn.execute(sql, params).fetchall()
            return {"activities": [dict(r) for r in rows]}, 200
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
            apply_fra_completed_past_end_date(conn, activity_id=activity_id)
            fav_sub = (
                "(SELECT COUNT(*) FROM donee_favorite df WHERE df.activity_id = fr.activity_id)"
            )
            row = conn.execute(
                f"""
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
                    fr.is_suspended,
                    fr.view_count,
                    {fav_sub} AS favorite_count
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ?
                """,
                (activity_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"activity": dict(row) if row else None}, 201

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
                return {"message": "Activity not found."}, 404

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
            apply_fra_completed_past_end_date(conn, activity_id=activity_id)
            fav_sub = (
                "(SELECT COUNT(*) FROM donee_favorite df WHERE df.activity_id = fr.activity_id)"
            )
            row = conn.execute(
                f"""
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
                    fr.is_suspended,
                    fr.view_count,
                    {fav_sub} AS favorite_count
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ? AND fr.account_id = ?
                """,
                (activity_id, account_id),
            ).fetchone()
        finally:
            conn.close()

        return {"activity": dict(row) if row else None}, 200

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

    def _public_activity_by_id_sql(self):
        """Same public row shape as `_public_activity_select`, without ``status = active`` filter."""
        return (
            self._public_activity_select()
            + """
            FROM FRA fr
            INNER JOIN category c
                ON c.category_id = fr.category_id AND c.is_suspended = 0
            INNER JOIN user_account org
                ON org.account_id = fr.account_id AND org.is_suspended = 0
            WHERE fr.is_suspended = 0
              AND fr.activity_id = ?
        """
        )

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
                fr.view_count,
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
            apply_fra_completed_past_end_date(conn)
            rows = conn.execute(sql, params).fetchall()
            return {"activities": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def view_public_activity(self, activity_id):
        """Single activity if publicly available; else 404. Counts a public view."""
        sql = (
            self._public_activity_select()
            + self._public_activity_from_clause()
            + " AND fr.activity_id = ?"
        )
        conn = get_connection()
        try:
            row = conn.execute(sql, (activity_id,)).fetchone()
            if not row:
                return {"message": "Activity not found or not available."}, 404

            conn.execute(
                "UPDATE FRA SET view_count = view_count + 1 WHERE activity_id = ?",
                (activity_id,),
            )
            conn.commit()
            apply_fra_completed_past_end_date(conn, activity_id=activity_id)
            row = conn.execute(self._public_activity_by_id_sql(), (activity_id,)).fetchone()
        finally:
            conn.close()

        return {"activity": dict(row) if row else None}, 200

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
                return {"message": "Activity not found."}, 404

            conn.execute(
                """
                UPDATE FRA
                SET is_suspended = ?
                WHERE activity_id = ? AND account_id = ?
                """,
                (suspend_val, activity_id, account_id),
            )
            conn.commit()
            apply_fra_completed_past_end_date(conn, activity_id=activity_id)
            fav_sub = (
                "(SELECT COUNT(*) FROM donee_favorite df WHERE df.activity_id = fr.activity_id)"
            )
            row = conn.execute(
                f"""
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
                    fr.is_suspended,
                    fr.view_count,
                    {fav_sub} AS favorite_count
                FROM FRA fr
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE fr.activity_id = ? AND fr.account_id = ?
                """,
                (activity_id, account_id),
            ).fetchone()
        finally:
            conn.close()

        return {"activity": dict(row) if row else None}, 200
