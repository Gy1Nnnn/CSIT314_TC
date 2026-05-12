"""Entity layer: category.

Receives already-validated, parsed inputs from the Boundary (via the Control
layer). Only performs DB-level checks here. Every method returns
``(body, status)``.
"""

from backend.entity.db import get_connection


class Category:
    def list_categories(self, search):
        """search: optional string (already trimmed)."""
        where: list[str] = []
        params: list[object] = []

        if search:
            safe = search.replace("%", r"\%").replace("_", r"\_")
            like = f"%{safe}%"
            clause = "(category_name LIKE ? ESCAPE '\\')"
            params.append(like)
            if search.isdigit():
                clause = f"({clause} OR category_id = ?)"
                params.append(int(search))
            where.append(clause)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        sql = f"""
            SELECT category_id, category_name, description, is_suspended
            FROM category
            {where_sql}
            ORDER BY category_name COLLATE NOCASE
        """

        conn = get_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return {"categories": [dict(r) for r in rows]}, 200
        finally:
            conn.close()

    def list_categories_with_public_activities(self):
        """Active categories each with non-suspended FRAs (for public home)."""
        from backend.entity.fra import apply_fra_completed_past_end_date

        sql = """
            SELECT
                c.category_id,
                c.category_name,
                c.description AS category_description,
                fr.activity_id,
                fr.activity_name,
                fr.description AS activity_description,
                fr.start_date,
                fr.end_date,
                fr.target_amount,
                fr.status
            FROM category c
            LEFT JOIN FRA fr
                ON fr.category_id = c.category_id
                AND fr.is_suspended = 0
                AND LOWER(TRIM(COALESCE(fr.status, 'active'))) = 'active'
            WHERE c.is_suspended = 0
            ORDER BY c.category_name COLLATE NOCASE, fr.activity_id
        """
        conn = get_connection()
        try:
            apply_fra_completed_past_end_date(conn)
            rows = conn.execute(sql).fetchall()
        finally:
            conn.close()

        out = []
        by_id = {}
        for r in rows:
            d = dict(r)
            cid = d["category_id"]
            if cid not in by_id:
                cat = {
                    "category_id": cid,
                    "category_name": d["category_name"],
                    "description": d["category_description"],
                    "is_suspended": 0,
                    "activities": [],
                }
                by_id[cid] = cat
                out.append(cat)
            if d.get("activity_id") is not None:
                by_id[cid]["activities"].append(
                    {
                        "activity_id": d["activity_id"],
                        "activity_name": d["activity_name"],
                        "description": d["activity_description"],
                        "start_date": d["start_date"],
                        "end_date": d["end_date"],
                        "target_amount": d["target_amount"],
                        "status": d["status"],
                    }
                )

        return {"categories": out}, 200

    def create_category(self, category_name, description):
        """category_name: non-empty str. description: optional."""
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO category (category_name, description, is_suspended)
                VALUES (?, ?, 0)
                """,
                (category_name, description),
            )
            category_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.commit()
            row = conn.execute(
                """
                SELECT category_id, category_name, description, is_suspended
                FROM category
                WHERE category_id = ?
                """,
                (category_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"category": dict(row) if row else None}, 201

    def update_category(self, category_id, category_name, description):
        """All inputs already validated by the Boundary."""
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM category WHERE category_id = ?",
                (category_id,),
            ).fetchone()
            if not existing:
                return {"message": "Category not found."}, 404

            conn.execute(
                """
                UPDATE category
                SET category_name = ?, description = ?
                WHERE category_id = ?
                """,
                (category_name, description, category_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT category_id, category_name, description, is_suspended
                FROM category
                WHERE category_id = ?
                """,
                (category_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"category": dict(row) if row else None}, 200

    def suspend_category(self, category_id, suspend):
        """category_id: int, suspend: bool."""
        suspend_val = 1 if suspend else 0
        conn = get_connection()
        try:
            existing = conn.execute(
                "SELECT 1 FROM category WHERE category_id = ?",
                (category_id,),
            ).fetchone()
            if not existing:
                return {"message": "Category not found."}, 404

            conn.execute(
                "UPDATE category SET is_suspended = ? WHERE category_id = ?",
                (suspend_val, category_id),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT category_id, category_name, description, is_suspended
                FROM category
                WHERE category_id = ?
                """,
                (category_id,),
            ).fetchone()
        finally:
            conn.close()

        return {"category": dict(row) if row else None}, 200
