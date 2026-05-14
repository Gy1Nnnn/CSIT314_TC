"""Entity layer: platform manager fundraising performance reports."""

import calendar
from datetime import date, timedelta
from typing import Optional, Tuple

from backend.entity.db import get_connection


def _is_platform_manager(conn, account_id: int) -> bool:
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
    return (row["profile_name"] or "").strip().lower() == "platform manager"


def _date_range(
    period: str, anchor: date, month_year: Optional[Tuple[int, int]]
) -> Tuple[date, date]:
    if period == "daily":
        return anchor, anchor
    if period == "weekly":
        start = anchor - timedelta(days=anchor.weekday())
        end = start + timedelta(days=6)
        return start, end
    if period == "monthly":
        if month_year is None:
            y, m = anchor.year, anchor.month
        else:
            y, m = month_year
        start = date(y, m, 1)
        last_day = calendar.monthrange(y, m)[1]
        end = date(y, m, last_day)
        return start, end
    raise ValueError("period")


class Report:
    def fundraising_performance(
        self,
        account_id: int,
        period: str,
        anchor: date,
        month_year: Optional[Tuple[int, int]],
    ):
        conn = get_connection()
        try:
            if not _is_platform_manager(conn, account_id):
                return {"message": "Not a platform manager account."}, 403

            start, end = _date_range(period, anchor, month_year)
            start_s = start.isoformat()
            end_s = end.isoformat()

            row_d = conn.execute(
                """
                SELECT
                    COALESCE(SUM(dd.amount), 0) AS contributions_total,
                    COUNT(dd.donation_id) AS contributions_count
                FROM donee_donation dd
                WHERE date(dd.donated_at) >= date(?)
                  AND date(dd.donated_at) <= date(?)
                """,
                (start_s, end_s),
            ).fetchone()

            row_f = conn.execute(
                """
                SELECT COUNT(*) AS n
                FROM donee_favorite df
                WHERE date(df.created_at) >= date(?)
                  AND date(df.created_at) <= date(?)
                """,
                (start_s, end_s),
            ).fetchone()

            active_row = conn.execute(
                """
                SELECT COUNT(*) AS n
                FROM FRA fr
                WHERE fr.is_suspended = 0
                  AND LOWER(TRIM(COALESCE(fr.status, ''))) = 'active'
                """
            ).fetchone()

            completed_row = conn.execute(
                """
                SELECT COUNT(*) AS n
                FROM FRA fr
                WHERE fr.is_suspended = 0
                  AND LOWER(TRIM(COALESCE(fr.status, ''))) = 'completed'
                  AND fr.end_date IS NOT NULL
                  AND TRIM(fr.end_date) != ''
                  AND date(fr.end_date) >= date(?)
                  AND date(fr.end_date) <= date(?)
                """,
                (start_s, end_s),
            ).fetchone()

            cat_rows = conn.execute(
                """
                SELECT
                    fr.category_id,
                    COALESCE(c.category_name, 'Uncategorised') AS category_name,
                    COALESCE(SUM(dd.amount), 0) AS contributions_total,
                    COUNT(dd.donation_id) AS contributions_count
                FROM donee_donation dd
                JOIN FRA fr ON fr.activity_id = dd.activity_id
                LEFT JOIN category c ON c.category_id = fr.category_id
                WHERE date(dd.donated_at) >= date(?)
                  AND date(dd.donated_at) <= date(?)
                GROUP BY fr.category_id, c.category_name
                HAVING COUNT(dd.donation_id) > 0
                ORDER BY contributions_total DESC, category_name COLLATE NOCASE
                """,
                (start_s, end_s),
            ).fetchall()

            views_row = conn.execute(
                """
                SELECT COALESCE(SUM(fr.view_count), 0) AS total_views
                FROM FRA fr
                WHERE fr.is_suspended = 0
                """,
            ).fetchone()

        finally:
            conn.close()

        contributions_total = float(row_d["contributions_total"] or 0)
        contributions_count = int(row_d["contributions_count"] or 0)
        favorites_added = int(row_f["n"] or 0)
        active_campaigns = int(active_row["n"] or 0)
        campaigns_completed_in_range = int(completed_row["n"] or 0)
        total_views_all_time = int(views_row["total_views"] or 0)

        report = {
            "period": period,
            "range": {"start": start_s, "end": end_s},
            "contributions_total": contributions_total,
            "contributions_count": contributions_count,
            "favorites_added": favorites_added,
            "active_campaigns": active_campaigns,
            "campaigns_completed_in_range": campaigns_completed_in_range,
            "total_views_all_campaigns": total_views_all_time,
            "by_category": [dict(r) for r in cat_rows],
        }
        return report, 200
