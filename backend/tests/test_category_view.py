from __future__ import annotations

from uuid import uuid4


def test_platform_manager_view_category(client):
    category_name = f"View Category {uuid4().hex[:8]}"
    created = client.post(
        "/api/categories",
        json={"category_name": category_name, "description": "view category test"},
    )
    assert created.status_code == 201
    category_id = created.get_json()["category"]["category_id"]

    response = client.get(f"/api/categories/{category_id}")

    assert response.status_code == 200
    body = response.get_json()
    assert body["category"]["category_id"] == category_id
    assert body["category"]["category_name"] == category_name
    assert body["category"]["description"] == "view category test"


def test_platform_manager_view_missing_category(client):
    response = client.get("/api/categories/999999")

    assert response.status_code == 404
    assert response.get_json()["message"] == "Category not found."


def test_platform_manager_cannot_create_duplicate_category_name(client):
    category_name = f"Unique Category {uuid4().hex[:8]}"
    created = client.post(
        "/api/categories",
        json={"category_name": category_name, "description": "first"},
    )
    assert created.status_code == 201

    duplicate = client.post(
        "/api/categories",
        json={"category_name": f"  {category_name.upper()}  ", "description": "second"},
    )

    assert duplicate.status_code == 400
    assert duplicate.get_json()["message"] == (
        "This category's name already exists. Choose another name"
    )


def test_platform_manager_cannot_update_to_duplicate_category_name(client):
    first_name = f"First Category {uuid4().hex[:8]}"
    second_name = f"Second Category {uuid4().hex[:8]}"
    first = client.post("/api/categories", json={"category_name": first_name})
    second = client.post("/api/categories", json={"category_name": second_name})
    assert first.status_code == 201
    assert second.status_code == 201
    second_id = second.get_json()["category"]["category_id"]

    response = client.put(
        f"/api/categories/{second_id}",
        json={"category_name": first_name.upper(), "description": "duplicate"},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == (
        "This category's name already exists. Choose another name"
    )
