"""Boundary layer: platform manager fundraising reports (Flask)."""

from datetime import date

from flask import Blueprint, jsonify, request

from backend.control.report_control import ReportControl

report_bp = Blueprint("report", __name__, url_prefix="/api")


class ReportBoundary:
    def __init__(self):
        self._control = ReportControl()

    def _parse_account_id(self):
        account_id_raw = (request.args.get("account_id") or "").strip()
        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return None, ({"message": "account_id is required."}, 400)
        if account_id <= 0:
            return None, ({"message": "account_id is required."}, 400)
        return account_id, None

    def _parse_date(self):
        date_raw = (request.args.get("date") or "").strip()
        if not date_raw:
            return None, ({"message": "date is required (YYYY-MM-DD)."}, 400)
        try:
            return date.fromisoformat(date_raw), None
        except ValueError:
            return None, ({"message": "Invalid date."}, 400)

    def _parse_month(self):
        month_raw = (request.args.get("month") or "").strip()
        if not month_raw:
            return None, ({"message": "month is required (YYYY-MM)."}, 400)
        try:
            parts = month_raw.split("-", 2)
            if len(parts) != 2:
                return None, ({"message": "month must be YYYY-MM."}, 400)
            y, m = int(parts[0]), int(parts[1])
            if y < 1 or m < 1 or m > 12:
                return None, ({"message": "Invalid month."}, 400)
            return (y, m), None
        except ValueError:
            return None, ({"message": "Invalid month."}, 400)

    def get_daily_report(self):
        account_id, error = self._parse_account_id()
        if error:
            return jsonify(error[0]), error[1]
        anchor, error = self._parse_date()
        if error:
            return jsonify(error[0]), error[1]

        body, status = self._control.get_daily_report(account_id, anchor)
        return jsonify(body), status

    def get_weekly_report(self):
        account_id, error = self._parse_account_id()
        if error:
            return jsonify(error[0]), error[1]
        anchor, error = self._parse_date()
        if error:
            return jsonify(error[0]), error[1]

        body, status = self._control.get_weekly_report(account_id, anchor)
        return jsonify(body), status

    def get_monthly_report(self):
        account_id, error = self._parse_account_id()
        if error:
            return jsonify(error[0]), error[1]
        month_year, error = self._parse_month()
        if error:
            return jsonify(error[0]), error[1]

        body, status = self._control.get_monthly_report(account_id, month_year)
        return jsonify(body), status

_handler = ReportBoundary()


@report_bp.get("/platform/reports/fundraising/daily")
def get_daily_report():
    return _handler.get_daily_report()


@report_bp.get("/platform/reports/fundraising/weekly")
def get_weekly_report():
    return _handler.get_weekly_report()


@report_bp.get("/platform/reports/fundraising/monthly")
def get_monthly_report():
    return _handler.get_monthly_report()

