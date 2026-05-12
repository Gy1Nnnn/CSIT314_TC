"""Boundary layer: fundraising activity (FRA) HTTP routes (Flask).

Performs input/format validation (presence, types, status enum, date format,
date order, numeric range) before calling the controller. DB-level validation
(does the activity belong to this account) lives in the entity.
"""

from datetime import date

from flask import Blueprint, jsonify, request

from backend.control.fra_control import FRAService

fra_bp = Blueprint("fundraising_activity", __name__, url_prefix="/api")

STATUSES = {"active", "completed", "suspended"}


class FRABoundary:
    def __init__(self):
        self._service = FRAService()

    def list_fundraising_activities(self):
        account_id_raw = (request.args.get("account_id") or "").strip()
        search = (request.args.get("search") or "").strip()

        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        body, status = self._service.get_activities(account_id, search)
        return jsonify(body), status

    def list_completed_history(self):
        """Completed FRAs for owner with optional category + end-date range + name search."""
        account_id_raw = (request.args.get("account_id") or "").strip()
        search = (request.args.get("search") or "").strip()
        category_id_raw = (request.args.get("category_id") or "").strip()
        date_from_raw = (request.args.get("date_from") or "").strip()
        date_to_raw = (request.args.get("date_to") or "").strip()

        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        category_id = None
        if category_id_raw:
            try:
                category_id = int(category_id_raw)
            except (TypeError, ValueError):
                return jsonify({"message": "category_id must be a number."}), 400
            if category_id <= 0:
                return jsonify({"message": "category_id must be positive."}), 400

        date_from = None
        date_to = None
        try:
            if date_from_raw:
                date_from = date.fromisoformat(date_from_raw).isoformat()
            if date_to_raw:
                date_to = date.fromisoformat(date_to_raw).isoformat()
        except ValueError:
            return jsonify({"message": "Invalid date_from or date_to."}), 400
        if date_from and date_to and date_from > date_to:
            return jsonify({"message": "date_from must be <= date_to."}), 400

        body, status = self._service.list_completed_history(
            account_id, search, category_id, date_from, date_to
        )
        return jsonify(body), status

    def get_fundraising_activity(self, activity_id: int):
        """Owner-only detail: includes ``view_count`` and ``favorite_count``."""
        account_id_raw = (request.args.get("account_id") or "").strip()
        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        body, status = self._service.get_activity(activity_id, account_id)
        return jsonify(body), status

    def _parse_activity_payload(self, data):
        """Validate & normalise the body of a create/update request.

        Returns ``(error_response, parsed_dict)`` where exactly one is None.
        """
        account_id_raw = data.get("account_id")
        activity_name = (data.get("activity_name") or "").strip()
        category_id_raw = data.get("category_id")
        description = (data.get("description") or "").strip() or None
        start_date_raw = (data.get("start_date") or "").strip() or None
        end_date_raw = (data.get("end_date") or "").strip() or None
        status_in = (data.get("status") or "active").strip().lower() or "active"
        target_amount_raw = data.get("target_amount")

        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return ({"message": "account_id is required."}, 400), None
        if account_id <= 0:
            return ({"message": "account_id is required."}, 400), None

        if not activity_name:
            return ({"message": "activity_name is required."}, 400), None
        if status_in not in STATUSES:
            return ({"message": "Invalid status."}, 400), None
        try:
            category_id = int(category_id_raw)
        except (TypeError, ValueError):
            return ({"message": "category_id is required."}, 400), None

        start_date = None
        end_date = None
        try:
            if start_date_raw:
                start_date = date.fromisoformat(start_date_raw).isoformat()
            if end_date_raw:
                end_date = date.fromisoformat(end_date_raw).isoformat()
        except ValueError:
            return ({"message": "Invalid start_date or end_date."}, 400), None
        if start_date and end_date and start_date > end_date:
            return ({"message": "start_date must be <= end_date."}, 400), None

        target_amount = None
        if target_amount_raw not in (None, ""):
            try:
                target_amount = float(target_amount_raw)
            except (TypeError, ValueError):
                return ({"message": "target_amount must be a number."}, 400), None
            if target_amount < 0:
                return ({"message": "target_amount must be >= 0."}, 400), None

        return None, {
            "account_id": account_id,
            "activity_name": activity_name,
            "category_id": category_id,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "target_amount": target_amount,
            "status": status_in,
        }

    def create_fundraising_activity(self):
        data = request.get_json(silent=True) or {}
        error, parsed = self._parse_activity_payload(data)
        if error is not None:
            body, status = error
            return jsonify(body), status

        body, status = self._service.create(
            parsed["account_id"],
            parsed["activity_name"],
            parsed["category_id"],
            parsed["description"],
            parsed["start_date"],
            parsed["end_date"],
            parsed["target_amount"],
            parsed["status"],
        )
        return jsonify(body), status

    def update_fundraising_activity(self, activity_id: int):
        data = request.get_json(silent=True) or {}
        error, parsed = self._parse_activity_payload(data)
        if error is not None:
            body, status = error
            return jsonify(body), status

        body, status = self._service.update(
            activity_id,
            parsed["account_id"],
            parsed["activity_name"],
            parsed["category_id"],
            parsed["description"],
            parsed["start_date"],
            parsed["end_date"],
            parsed["target_amount"],
            parsed["status"],
        )
        return jsonify(body), status

    def suspend_fundraising_activity(self, activity_id: int):
        data = request.get_json(silent=True) or {}
        account_id_raw = data.get("account_id")
        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        suspend = bool(data.get("suspend", True))
        body, status = self._service.suspend(activity_id, account_id, suspend)
        return jsonify(body), status

    def list_public_activities(self):
        search = (request.args.get("search") or "").strip()
        body, status = self._service.list_public(search)
        return jsonify(body), status

    def view_public_activity(self, activity_id: int):
        body, status = self._service.view_public(activity_id)
        return jsonify(body), status


_handler = FRABoundary()


@fra_bp.get("/public/activities")
def list_public_activities():
    return _handler.list_public_activities()


@fra_bp.get("/public/activities/<int:activity_id>")
def view_public_activity(activity_id: int):
    return _handler.view_public_activity(activity_id)


@fra_bp.get("/fundraising-activities")
def list_fundraising_activities():
    return _handler.list_fundraising_activities()


@fra_bp.get("/fundraising-activities/history")
def list_fundraising_activity_history():
    return _handler.list_completed_history()


@fra_bp.get("/fundraising-activities/<int:activity_id>")
def get_fundraising_activity(activity_id: int):
    return _handler.get_fundraising_activity(activity_id)


@fra_bp.post("/fundraising-activities")
def create_fundraising_activity():
    return _handler.create_fundraising_activity()


@fra_bp.put("/fundraising-activities/<int:activity_id>")
def update_fundraising_activity(activity_id: int):
    return _handler.update_fundraising_activity(activity_id)


@fra_bp.post("/fundraising-activities/<int:activity_id>/suspend")
def suspend_fundraising_activity(activity_id: int):
    return _handler.suspend_fundraising_activity(activity_id)
