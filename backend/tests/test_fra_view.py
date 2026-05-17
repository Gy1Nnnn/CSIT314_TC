from __future__ import annotations

from uuid import uuid4


def _create_category(client):
    response = client.post(
        "/api/categories",
        json={"category_name": f"FRA View Category {uuid4().hex[:8]}", "description": "test"},
    )
    assert response.status_code == 201
    return response.get_json()["category"]["category_id"]


def _create_fundraiser_account(client, admin_profile_id):
    response = client.post(
        "/api/user-accounts",
        json={
            "name": "FRA View Fundraiser",
            "email": "fra_view_fundraiser@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 201
    return response.get_json()["account"]["account_id"]


def test_fundraiser_view_existing_activity(client, admin_profile_id):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    created = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": "FRA View Target",
            "category_id": category_id,
            "description": "view detail test",
            "status": "active",
        },
    )
    assert created.status_code == 201
    activity_id = created.get_json()["activity"]["activity_id"]

    response = client.get(
        f"/api/fundraising-activities/{activity_id}?account_id={account_id}"
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["activity"]["activity_id"] == activity_id
    assert body["activity"]["activity_name"] == "FRA View Target"
    assert body["activity"]["account_id"] == account_id


def test_fundraiser_view_activity_requires_owner_account(client, admin_profile_id):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    other_account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    created = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": "FRA Owner Only",
            "category_id": category_id,
            "status": "active",
        },
    )
    assert created.status_code == 201
    activity_id = created.get_json()["activity"]["activity_id"]

    response = client.get(
        f"/api/fundraising-activities/{activity_id}?account_id={other_account_id}"
    )
    assert response.status_code == 404


def test_fundraiser_view_activity_requires_account_id(client):
    response = client.get("/api/fundraising-activities/999999")
    assert response.status_code == 400


def test_fundraiser_view_completed_activity(client, admin_profile_id):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    created = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": "Completed FRA Detail",
            "category_id": category_id,
            "status": "completed",
        },
    )
    assert created.status_code == 201
    activity_id = created.get_json()["activity"]["activity_id"]

    response = client.get(
        f"/api/fundraising-activities/history/{activity_id}?account_id={account_id}"
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["activity"]["activity_id"] == activity_id
    assert body["activity"]["status"] == "completed"


def test_fundraiser_view_completed_activity_rejects_active_activity(
    client, admin_profile_id
):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    created = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": "Active Not History Detail",
            "category_id": category_id,
            "status": "active",
        },
    )
    assert created.status_code == 201
    activity_id = created.get_json()["activity"]["activity_id"]

    response = client.get(
        f"/api/fundraising-activities/history/{activity_id}?account_id={account_id}"
    )
    assert response.status_code == 404


def test_fundraiser_view_completed_activity_requires_account_id(client):
    response = client.get("/api/fundraising-activities/history/999999")
    assert response.status_code == 400


def test_fundraiser_cannot_update_completed_activity(client, admin_profile_id):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    created = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": "Completed Cannot Update",
            "category_id": category_id,
            "status": "completed",
        },
    )
    assert created.status_code == 201
    activity_id = created.get_json()["activity"]["activity_id"]

    response = client.put(
        f"/api/fundraising-activities/{activity_id}",
        json={
            "account_id": account_id,
            "activity_name": "Updated Completed Activity",
            "category_id": category_id,
            "status": "active",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Completed activities cannot be updated."
