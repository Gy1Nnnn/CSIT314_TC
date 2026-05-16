"""Boundary layer: manage user profile HTTP routes (Flask)."""

from flask import Blueprint, jsonify, request

from backend.control.user_profile_control import UserProfileControl

user_profile_bp = Blueprint("manage_user_profile", __name__, url_prefix="/api")


class UserProfileBoundary:
    def __init__(self):
        self._control = UserProfileControl()

    def search_profiles(self):
        profile_id_or_profile_name = (request.args.get("search") or "").strip()
        body, status = self._control.search_profiles(profile_id_or_profile_name)
        return jsonify(body), status

    def view(self, profile_id: int):
        body, status = self._control.view(profile_id)
        return jsonify(body), status

    def create(self):
        data = request.get_json(silent=True) or {}
        profile_name = (data.get("profile_name") or "").strip()
        description = (data.get("description") or "").strip() or None
        access_control = (data.get("access_control") or "").strip() or None

        if not profile_name:
            return jsonify({"message": "profile_name is required."}), 400

        body, status = self._control.create(profile_name, description, access_control)
        return jsonify(body), status

    def update(self, profile_id: int):
        data = request.get_json(silent=True) or {}
        profile_name = (data.get("profile_name") or "").strip()
        description = (data.get("description") or "").strip() or None
        access_control = (data.get("access_control") or "").strip() or None

        if not profile_name:
            return jsonify({"message": "profile_name is required."}), 400

        body, status = self._control.update(profile_id, profile_name, description, access_control)
        return jsonify(body), status

    def suspend(self, profile_id: int):
        data = request.get_json(silent=True) or {}
        suspend = bool(data.get("suspend", True))
        body, status = self._control.suspend(profile_id, suspend)
        return jsonify(body), status


_handler = UserProfileBoundary()


@user_profile_bp.get("/user-profiles")
def search_profiles():
    return _handler.search_profiles()


@user_profile_bp.get("/user-profiles/<int:profile_id>")
def view(profile_id: int):
    return _handler.view(profile_id)


@user_profile_bp.post("/user-profiles")
def create():
    return _handler.create()


@user_profile_bp.put("/user-profiles/<int:profile_id>")
def update(profile_id: int):
    return _handler.update(profile_id)


@user_profile_bp.post("/user-profiles/<int:profile_id>/suspend")
def suspend(profile_id: int):
    return _handler.suspend(profile_id)
