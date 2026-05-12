"""Boundary layer: donee favorites HTTP routes (Flask)."""

from flask import Blueprint, jsonify, request

from backend.control.donee_favorite_control import DoneeFavoriteService

donee_favorite_bp = Blueprint("donee_favorite", __name__, url_prefix="/api")


class DoneeFavoriteBoundary:
    def __init__(self):
        self._service = DoneeFavoriteService()

    def list_favorites(self):
        account_id_raw = (request.args.get("account_id") or "").strip()
        search = (request.args.get("search") or "").strip()
        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        body, status = self._service.list_favorites(account_id, search)
        return jsonify(body), status

    def add_favorite(self):
        data = request.get_json(silent=True) or {}
        account_id_raw = data.get("account_id")
        activity_id_raw = data.get("activity_id")
        try:
            account_id = int(account_id_raw)
            activity_id = int(activity_id_raw)
        except (TypeError, ValueError):
            return (
                jsonify({"message": "account_id and activity_id are required."}),
                400,
            )
        if account_id <= 0 or activity_id <= 0:
            return (
                jsonify({"message": "account_id and activity_id are required."}),
                400,
            )

        body, status = self._service.add_favorite(account_id, activity_id)
        return jsonify(body), status

    def remove_favorite(self, activity_id: int):
        account_id_raw = (request.args.get("account_id") or "").strip()
        try:
            account_id = int(account_id_raw)
        except (TypeError, ValueError):
            return jsonify({"message": "account_id is required."}), 400
        if account_id <= 0:
            return jsonify({"message": "account_id is required."}), 400

        body, status = self._service.remove_favorite(account_id, activity_id)
        return jsonify(body), status


_handler = DoneeFavoriteBoundary()


@donee_favorite_bp.get("/donee/favorites")
def list_donee_favorites():
    return _handler.list_favorites()


@donee_favorite_bp.post("/donee/favorites")
def add_donee_favorite():
    return _handler.add_favorite()


@donee_favorite_bp.delete("/donee/favorites/<int:activity_id>")
def remove_donee_favorite(activity_id: int):
    return _handler.remove_favorite(activity_id)

