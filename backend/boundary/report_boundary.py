"""Boundary layer: platform manager fundraising reports (Flask)."""

from datetime import date

from flask import Blueprint, jsonify, request

from backend.control.report_control import ReportControl

report_bp = Blueprint("report", __name__, url_prefix="/api")


class ReportBoundary:
    def __init__(self):
        self._control = ReportControl()

    def fundraising_performance(self):
        account_id_raw = (request.args.get("account_id") or "").strip()
        period = (request.args.get("period") or "").strip().lower()
        date_raw = (request.args.get("date") or "").strip()
        month_raw = (request.args.get("month") or "").strip()

        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        if period not in ("daily", "weekly", "monthly"):
            return jsonify({"message": "period must be daily, weekly, or monthly."}), 400

        anchor = None
        month_year = None
        try:
            if period == "monthly":
                if not month_raw:
                    return jsonify({"message": "month is required (YYYY-MM)."}), 400
                parts = month_raw.split("-", 2)
                if len(parts) != 2:
                    return jsonify({"message": "month must be YYYY-MM."}), 400
                y, m = int(parts[0]), int(parts[1])
                if y < 1 or m < 1 or m > 12:
                    return jsonify({"message": "Invalid month."}), 400
                month_year = (y, m)
                anchor = date(y, m, 1)
            else:
                if not date_raw:
                    return jsonify({"message": "date is required (YYYY-MM-DD)."}), 400
                anchor = date.fromisoformat(date_raw)
        except ValueError:
            return jsonify({"message": "Invalid date or month."}), 400

        body, status = self._control.fundraising_performance(
            account_id, period, anchor, month_year
        )
        return jsonify(body), status


_handler = ReportBoundary()


@report_bp.get("/platform/reports/fundraising")
def fundraising_report():
    return _handler.fundraising_performance()
