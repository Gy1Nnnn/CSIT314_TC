"""Boundary layer: category HTTP routes (Flask)."""

from flask import Blueprint, jsonify, request

from backend.control.category_control import CategoryControl

category_bp = Blueprint("category", __name__, url_prefix="/api")


class CategoryBoundary:
    def __init__(self):
        self._control = CategoryControl()

    def get_categories(self):
        search = (request.args.get("search") or "").strip()
        body, status = self._control.get_categories(search)
        return jsonify(body), status

    def get_categories_with_public_activities(self):
        body, status = self._control.get_categories_with_public_activities()
        return jsonify(body), status

    def view(self, category_id: int):
        body, status = self._control.view(category_id)
        return jsonify(body), status

    def create(self):
        data = request.get_json(silent=True) or {}
        category_name = (data.get("category_name") or "").strip()
        description = (data.get("description") or "").strip() or None

        if not category_name:
            return jsonify({"message": "category_name is required."}), 400

        body, status = self._control.create(category_name, description)
        return jsonify(body), status

    def update(self, category_id: int):
        data = request.get_json(silent=True) or {}
        category_name = (data.get("category_name") or "").strip()
        description = (data.get("description") or "").strip() or None

        if not category_name:
            return jsonify({"message": "category_name is required."}), 400

        body, status = self._control.update(category_id, category_name, description)
        return jsonify(body), status

    def delete(self, category_id: int):
        body, status = self._control.delete(category_id)
        return jsonify(body), status


_handler = CategoryBoundary()


@category_bp.get("/categories")
def get_categories():
    return _handler.get_categories()


@category_bp.get("/categories-with-activities")
def get_categories_with_public_activities():
    return _handler.get_categories_with_public_activities()


@category_bp.get("/categories/<int:category_id>")
def view(category_id: int):
    return _handler.view(category_id)


@category_bp.post("/categories")
def create():
    return _handler.create()


@category_bp.put("/categories/<int:category_id>")
def update(category_id: int):
    return _handler.update(category_id)


@category_bp.delete("/categories/<int:category_id>")
def delete(category_id: int):
    return _handler.delete(category_id)
