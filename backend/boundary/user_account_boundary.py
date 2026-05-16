"""Boundary layer: manage user account HTTP routes (Flask)."""

from flask import Blueprint, jsonify, request

from backend.control.user_account_control import UserAccountControl

user_account_bp = Blueprint("manage_user_account", __name__, url_prefix="/api")


class UserAccountBoundary:
    def __init__(self):
        self._control = UserAccountControl()

    def get_accounts(self):
        account_id_or_email = (request.args.get("search") or "").strip()
        body, status = self._control.get_accounts(account_id_or_email)
        return jsonify(body), status

    def view(self, account_id: int):
        if account_id <= 0:
            return jsonify({"message": "Invalid account id."}), 400
        body, status = self._control.view(account_id)
        return jsonify(body), status

    def create(self):
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        profile_id_raw = data.get("profile_id")

        if not name:
            return jsonify({"message": "name is required."}), 400
        if not email:
            return jsonify({"message": "email is required."}), 400
        if not password:
            return jsonify({"message": "password is required."}), 400
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "profile_id must be an integer."}), 400

        body, status = self._control.create(name, email, password, profile_id)
        return jsonify(body), status

    def update(self, account_id: int):
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        profile_id_raw = data.get("profile_id")

        if not name:
            return jsonify({"message": "name is required."}), 400
        if not email:
            return jsonify({"message": "email is required."}), 400
        password = (data.get("password") or "").strip()
        if not password:
            password = None
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "profile_id must be an integer."}), 400

        body, status = self._control.update(account_id, name, email, password, profile_id)
        return jsonify(body), status

    def suspend(self, account_id: int):
        data = request.get_json(silent=True) or {}
        suspend = bool(data.get("suspend", True))
        body, status = self._control.suspend(account_id, suspend)
        return jsonify(body), status


_handler = UserAccountBoundary()


@user_account_bp.get("/user-accounts")
def get_accounts():
    return _handler.get_accounts()


@user_account_bp.get("/user-accounts/<int:account_id>")
def view(account_id: int):
    return _handler.view(account_id)


@user_account_bp.post("/user-accounts")
def create():
    return _handler.create()


@user_account_bp.put("/user-accounts/<int:account_id>")
def update(account_id: int):
    return _handler.update(account_id)


@user_account_bp.post("/user-accounts/<int:account_id>/suspend")
def suspend(account_id: int):
    return _handler.suspend(account_id)
