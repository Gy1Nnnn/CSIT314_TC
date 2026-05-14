"""Boundary layer: manage user profile HTTP routes (Flask).

Performs input/format validation (presence) before calling the controller.
DB-level validation lives in the entity.
"""

from flask import Blueprint, jsonify, request

from backend.control.user_profile_control import UserProfileService

user_profile_bp = Blueprint("manage_user_profile", __name__, url_prefix="/api")


class UserProfileBoundary:
    def __init__(self):
        self._service = UserProfileService()

    def list_user_profiles(self):
        search = (request.args.get("search") or "").strip()
        body, status = self._service.get_profiles(search)
        return jsonify(body), status

    def create_user_profile(self):
        data = request.get_json(silent=True) or {}
        profile_name = (data.get("profile_name") or "").strip()
        description = (data.get("description") or "").strip() or None
        access_control = (data.get("access_control") or "").strip() or None

        if not profile_name:
            return jsonify({"message": "profile_name is required."}), 400

        body, status = self._service.create(profile_name, description, access_control)
        return jsonify(body), status

    def update_user_profile(self, profile_id: int):
        data = request.get_json(silent=True) or {}
        profile_name = (data.get("profile_name") or "").strip()
        description = (data.get("description") or "").strip() or None
        access_control = (data.get("access_control") or "").strip() or None

        if not profile_name:
            return jsonify({"message": "profile_name is required."}), 400

        body, status = self._service.update(profile_id, profile_name, description, access_control)
        return jsonify(body), status

    def suspend_user_profile(self, profile_id: int):
        data = request.get_json(silent=True) or {}
        suspend = bool(data.get("suspend", True))
        body, status = self._service.suspend(profile_id, suspend)
        return jsonify(body), status


_handler = UserProfileBoundary()


@user_profile_bp.get("/user-profiles")
def list_user_profiles():
    return _handler.list_user_profiles()


@user_profile_bp.post("/user-profiles")
def create_user_profile():
    return _handler.create_user_profile()


@user_profile_bp.put("/user-profiles/<int:profile_id>")
def update_user_profile(profile_id: int):
    return _handler.update_user_profile(profile_id)


@user_profile_bp.post("/user-profiles/<int:profile_id>/suspend")
def suspend_user_profile(profile_id: int):
    return _handler.suspend_user_profile(profile_id)
