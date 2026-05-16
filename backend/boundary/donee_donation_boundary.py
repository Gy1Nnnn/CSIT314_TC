"""Boundary layer: donee donation history HTTP routes (Flask)."""

from datetime import date, datetime

from flask import Blueprint, jsonify, request

from backend.control.donee_donation_control import DoneeDonationControl

donee_donation_bp = Blueprint("donee_donation", __name__, url_prefix="/api")


class DoneeDonationBoundary:
    def __init__(self):
        self._control = DoneeDonationControl()

    def list_donations(self):
        account_id_raw = (request.args.get("account_id") or "").strip()
        category_id_raw = (request.args.get("category_id") or "").strip()
        date_from_raw = (request.args.get("date_from") or "").strip()
        date_to_raw = (request.args.get("date_to") or "").strip()
        search = (request.args.get("search") or "").strip()

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

        body, status = self._control.list_donations(
            account_id, category_id, date_from, date_to, search
        )
        return jsonify(body), status

    def create_donation(self):
        data = request.get_json(silent=True) or {}
        account_id_raw = data.get("account_id")
        activity_id_raw = data.get("activity_id")
        amount_raw = data.get("amount")
        donated_at_raw = (data.get("donated_at") or "").strip()

        account_id = None
        if account_id_raw is not None and str(account_id_raw).strip() != "":
            try:
                account_id = int(account_id_raw)
            except (TypeError, ValueError):
                return jsonify({"message": "account_id must be a number."}), 400
            if account_id <= 0:
                return jsonify({"message": "account_id must be positive."}), 400

        try:
            activity_id = int(activity_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "activity_id is required."}), 400
        if activity_id <= 0:
            return jsonify({"message": "activity_id is required."}), 400

        try:
            amount = float(amount_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "amount must be a number."}), 400
        if amount <= 0:
            return jsonify({"message": "amount must be greater than zero."}), 400

        if donated_at_raw:
            try:
                d = date.fromisoformat(donated_at_raw)
            except ValueError:
                return jsonify({"message": "Invalid donated_at date."}), 400
            donated_at = f"{d.isoformat()} 12:00:00"
        else:
            donated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        body, status = self._control.create_donation(
            account_id, activity_id, amount, donated_at
        )
        return jsonify(body), status


_handler = DoneeDonationBoundary()


@donee_donation_bp.get("/donee/donations")
def list_donations():
    return _handler.list_donations()


@donee_donation_bp.post("/donee/donations")
def create_donation():
    return _handler.create_donation()
