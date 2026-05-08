"""Boundary layer: category HTTP routes (Flask).

Performs input/format validation (presence) before calling the controller.
DB-level validation lives in the entity.
"""

from flask import Blueprint, jsonify, request

from backend.control.category_control import CategoryService

category_bp = Blueprint("category", __name__, url_prefix="/api")


class CategoryBoundary:
    def __init__(self):
        self._service = CategoryService()

    def list_categories(self):
        search = (request.args.get("search") or "").strip()
        body, status = self._service.get_categories(search)
        return jsonify(body), status

    def create_category(self):
        data = request.get_json(silent=True) or {}
        category_name = (data.get("category_name") or "").strip()
        description = (data.get("description") or "").strip() or None

        if not category_name:
            return jsonify({"ok": False, "message": "category_name is required."}), 400

        body, status = self._service.create(category_name, description)
        return jsonify(body), status

    def update_category(self, category_id: int):
        data = request.get_json(silent=True) or {}
        category_name = (data.get("category_name") or "").strip()
        description = (data.get("description") or "").strip() or None

        if not category_name:
            return jsonify({"ok": False, "message": "category_name is required."}), 400

        body, status = self._service.update(category_id, category_name, description)
        return jsonify(body), status

    def suspend_category(self, category_id: int):
        data = request.get_json(silent=True) or {}
        suspend = bool(data.get("suspend", True))
        body, status = self._service.suspend(category_id, suspend)
        return jsonify(body), status


_handler = CategoryBoundary()


@category_bp.get("/categories")
def list_categories():
    return _handler.list_categories()


@category_bp.post("/categories")
def create_category():
    return _handler.create_category()


@category_bp.put("/categories/<int:category_id>")
def update_category(category_id: int):
    return _handler.update_category(category_id)


@category_bp.post("/categories/<int:category_id>/suspend")
def suspend_category(category_id: int):
    return _handler.suspend_category(category_id)
