
"""Entity layer: donee favorites (saved fundraising activities)."""

from backend.entity.db import get_connection

def _is_donee_account(conn, account_id: int) -> bool:
    row = conn.execute(
        """
        SELECT up.profile_name
        FROM user_account ua
        JOIN user_profile up ON up.profile_id = ua.profile_id
        WHERE ua.account_id = ? AND ua.is_suspended = 0
        """,
        (account_id,),
    ).fetchone()
    if not row:
        return False
    return (row["profile_name"] or "").strip().lower() == "donee"


class DoneeFavorite:
    def list_favorites(self, account_id: int, search: str):
        """Favorites for this donee account, optional search on activity/category/id."""
        conn = get_connection()
        try:
            if not _is_donee_account(conn, account_id):
                return {"message": "Not a donee account."}, 403

            where_extra = ""
            params: list[object] = [account_id]
            if search:
                safe = search.replace("%", r"\%").replace("_", r"\_")
                like = f"%{safe}%"
                clause = (
                    "(fr.activity_name LIKE ? ESCAPE '\\' "
                    "OR c.category_name LIKE ? ESCAPE '\\')"
                )
                params.extend([like, like])
                if search.isdigit():
                    clause = f"({clause} OR fr.activity_id = ?)"
                    params.append(int(search))
                where_extra = f" AND {clause}"

            sql = f"""
                SELECT
                    df.favorite_id,
                    df.created_at,
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
                FROM donee_favorite df
                JOIN FRA fr ON fr.activity_id = df.activity_id
                INNER JOIN category c
                    ON c.category_id = fr.category_id AND c.is_suspended = 0
                INNER JOIN user_account org
                    ON org.account_id = fr.account_id AND org.is_suspended = 0
                WHERE df.account_id = ?
                  AND fr.is_suspended = 0
                  AND LOWER(TRIM(fr.status)) = 'active'
                  {where_extra}
                ORDER BY df.created_at DESC, fr.activity_id ASC
            """
            rows = conn.execute(sql, params).fetchall()
            return {"favorites": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def add_favorite(self, account_id: int, activity_id: int):
        conn = get_connection()
        try:
            if not _is_donee_account(conn, account_id):
                return {"message": "Not a donee account."}, 403

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
                    fr.duration,
                    fr.target_amount,
                    fr.status,
                    fr.account_id,
                    org.name AS organizer_name
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
                    "message": "Activity not found or not available to save.",
                }, 404

            dup = conn.execute(
                """
                SELECT 1 FROM donee_favorite
                WHERE account_id = ? AND activity_id = ?
                """,
                (account_id, activity_id),
            ).fetchone()
            if dup:
                return {"message": "Already in your favorites."}, 409

            conn.execute(
                """
                INSERT INTO donee_favorite (account_id, activity_id)
                VALUES (?, ?)
                """,
                (account_id, activity_id),
            )
            conn.commit()
            fav = conn.execute(
                """
                SELECT favorite_id, created_at FROM donee_favorite
                WHERE account_id = ? AND activity_id = ?
                """,
                (account_id, activity_id),
            ).fetchone()
        finally:
            conn.close()

        out = dict(row)
        if fav:
            out["favorite_id"] = fav["favorite_id"]
            out["created_at"] = fav["created_at"]
        return {"activity": out}, 201

    def remove_favorite(self, account_id: int, activity_id: int):
        conn = get_connection()
        try:
            if not _is_donee_account(conn, account_id):
                return {"message": "Not a donee account."}, 403

            cur = conn.execute(
                """
                DELETE FROM donee_favorite
                WHERE account_id = ? AND activity_id = ?
                """,
                (account_id, activity_id),
            )
            conn.commit()
            if cur.rowcount == 0:
                return {"message": "Favorite not found."}, 404
        finally:
            conn.close()

        return {"message": "Removed from favorites."}, 200

