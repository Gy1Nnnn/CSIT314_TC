"""Entity layer: donee donation history (recorded contributions per account)."""

from typing import Optional

from backend.entity.db import get_connection
from backend.entity.donee_favorite import _is_donee_account


class DoneeDonation:
    def list_donations(
        self,
        account_id: int,
        category_id: Optional[int],
        date_from: str | None,
        date_to: str | None,
        search: str,
    ):
        """List donations for ``account_id`` with optional category and donated-on date range."""
        conn = get_connection()
        try:
            if not _is_donee_account(conn, account_id):
                return {"message": "Not a donee account."}, 403

            where: list[str] = ["dd.account_id = ?"]
            params: list[object] = [account_id]

            if category_id is not None:
                where.append("fr.category_id = ?")
                params.append(category_id)

            if date_from:
                where.append("date(dd.donated_at) >= date(?)")
                params.append(date_from)
            if date_to:
                where.append("date(dd.donated_at) <= date(?)")
                params.append(date_to)

            if search:
                safe = search.replace("%", r"\%").replace("_", r"\_")
                like = f"%{safe}%"
                clause = (
                    "(fr.activity_name LIKE ? ESCAPE '\\' "
                    "OR COALESCE(c.category_name, '') LIKE ? ESCAPE '\\')"
                )
                params.extend([like, like])
                if search.isdigit():
                    clause = f"({clause} OR fr.activity_id = ?)"
                    params.append(int(search))
                where.append(clause)

            where_sql = "WHERE " + " AND ".join(where)
            sql = f"""
                SELECT
                    dd.donation_id,
                    dd.amount,
                    dd.donated_at,
                    fr.activity_id,
                    fr.activity_name,
                    fr.category_id,
                    c.category_name,
                    org.name AS organizer_name
                FROM donee_donation dd
                JOIN FRA fr ON fr.activity_id = dd.activity_id
                LEFT JOIN category c ON c.category_id = fr.category_id
                JOIN user_account org ON org.account_id = fr.account_id
                {where_sql}
                ORDER BY dd.donated_at DESC, dd.donation_id DESC
            """
            rows = conn.execute(sql, params).fetchall()
            return {"donations": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def create_donation(
        self,
        account_id: int,
        activity_id: int,
        amount: float,
        donated_at: str,
    ):
        """``donated_at`` is a non-empty SQLite-friendly timestamp string."""
        conn = get_connection()
        try:
            if not _is_donee_account(conn, account_id):
                return {"message": "Not a donee account."}, 403

            row = conn.execute(
                """
                SELECT fr.activity_id
                FROM FRA fr
                INNER JOIN category c
                    ON c.category_id = fr.category_id AND c.is_suspended = 0
                INNER JOIN user_account org
                    ON org.account_id = fr.account_id AND org.is_suspended = 0
                WHERE fr.activity_id = ?
                  AND fr.is_suspended = 0
                  AND LOWER(TRIM(fr.status)) = 'active'
                """,
                (activity_id,),
            ).fetchone()
            if not row:
                return {
                    "message": "Activity not found or not available for contributions.",
                }, 404

            conn.execute(
                """
                INSERT INTO donee_donation (account_id, activity_id, amount, donated_at)
                VALUES (?, ?, ?, ?)
                """,
                (account_id, activity_id, amount, donated_at),
            )
            conn.commit()
            donation_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            out = conn.execute(
                """
                SELECT
                    dd.donation_id,
                    dd.amount,
                    dd.donated_at,
                    fr.activity_id,
                    fr.activity_name,
                    fr.category_id,
                    c.category_name,
                    org.name AS organizer_name
                FROM donee_donation dd
                JOIN FRA fr ON fr.activity_id = dd.activity_id
                LEFT JOIN category c ON c.category_id = fr.category_id
                JOIN user_account org ON org.account_id = fr.account_id
                WHERE dd.donation_id = ?
                """,
                (donation_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"donation": dict(out) if out else None}, 201
