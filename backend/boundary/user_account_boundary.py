"""Boundary layer: manage user account HTTP routes (Flask).

Performs input/format validation (presence + type) before calling the
controller. DB-level validation lives in the entity.
"""

from flask import Blueprint, jsonify, request

from backend.control.user_account_control import UserAccountService

user_account_bp = Blueprint("manage_user_account", __name__, url_prefix="/api")


class UserAccountBoundary:
    def __init__(self):
        self._service = UserAccountService()

    def list_user_accounts(self):
        search = (request.args.get("search") or "").strip()
        body, status = self._service.get_accounts(search)
        return jsonify(body), status

    def view_user_account(self, account_id: int):
        body, status = self._service.view(account_id)
        return jsonify(body), status

    def create_user_account(self):
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        profile_id_raw = data.get("profile_id")

        if not name:
            return jsonify({"ok": False, "message": "name is required."}), 400
        if not email:
            return jsonify({"ok": False, "message": "email is required."}), 400
        if not password:
            return jsonify({"ok": False, "message": "password is required."}), 400
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "message": "profile_id must be an integer."}), 400

        body, status = self._service.create(name, email, password, profile_id)
        return jsonify(body), status

    def update_user_account(self, account_id: int):
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        profile_id_raw = data.get("profile_id")

        if not name:
            return jsonify({"ok": False, "message": "name is required."}), 400
        if not email:
            return jsonify({"ok": False, "message": "email is required."}), 400
        if not password:
            return jsonify({"ok": False, "message": "password is required."}), 400
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "message": "profile_id must be an integer."}), 400

        body, status = self._service.update(account_id, name, email, password, profile_id)
        return jsonify(body), status

    def suspend_user_account(self, account_id: int):
        data = request.get_json(silent=True) or {}
        suspend = bool(data.get("suspend", True))
        body, status = self._service.suspend(account_id, suspend)
        return jsonify(body), status


_handler = UserAccountBoundary()


@user_account_bp.get("/user-accounts")
def list_user_accounts():
    return _handler.list_user_accounts()


@user_account_bp.get("/user-accounts/<int:account_id>")
def view_user_account(account_id: int):
    return _handler.view_user_account(account_id)


@user_account_bp.post("/user-accounts")
def create_user_account():
    return _handler.create_user_account()


@user_account_bp.put("/user-accounts/<int:account_id>")
def update_user_account(account_id: int):
    return _handler.update_user_account(account_id)


@user_account_bp.post("/user-accounts/<int:account_id>/suspend")
def suspend_user_account(account_id: int):
    return _handler.suspend_user_account(account_id)
