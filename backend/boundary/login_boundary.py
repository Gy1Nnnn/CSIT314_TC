"""Boundary layer: login-related HTTP routes (Flask)."""

from flask import Blueprint, jsonify, request

from backend.control.login_control import LoginControl

login_bp = Blueprint("login", __name__, url_prefix="/api")


class LoginBoundary:
    def __init__(self):
        self._control = LoginControl()

    def list_profiles(self):
        body, status = self._control.get_profiles_for_login()
        return jsonify(body), status

    def do_login(self):
        data = request.get_json(silent=True) or {}
        profile_id_raw = data.get("profile_id")
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if profile_id_raw in (None, ""):
            return jsonify({"message": "Please select a profile first."}), 400
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "Invalid profile selection."}), 400
        if not email or not password:
            return jsonify({"message": "Email and password are required."}), 400

        body, status = self._control.login(profile_id, email, password)
        return jsonify(body), status


_handler = LoginBoundary()


@login_bp.get("/profiles")
def list_profiles():
    return _handler.list_profiles()


@login_bp.post("/login")
def do_login():
    return _handler.do_login()
