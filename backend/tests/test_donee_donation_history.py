from __future__ import annotations

from uuid import uuid4


def _profile_id(client, profile_name):
    response = client.get(f"/api/user-profiles?search={profile_name}")
    assert response.status_code == 200
    for profile in response.get_json()["profiles"]:
        if profile["profile_name"] == profile_name:
            return profile["profile_id"]
    raise AssertionError(f"{profile_name} profile not found")


def _create_account(client, profile_id, name_prefix):
    unique = uuid4().hex[:8]
    response = client.post(
        "/api/user-accounts",
        json={
            "name": f"{name_prefix} {unique}",
            "email": f"{name_prefix.lower()}_{unique}@example.com",
            "password": "qwertyui",
            "profile_id": profile_id,
        },
    )
    assert response.status_code == 201
    return response.get_json()["account"]["account_id"]


def _create_category(client):
    response = client.post(
        "/api/categories",
        json={"category_name": f"Donation History {uuid4().hex[:8]}"},
    )
    assert response.status_code == 201
    return response.get_json()["category"]["category_id"]


def _create_activity(client, account_id, category_id):
    response = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": f"Donation History Activity {uuid4().hex[:8]}",
            "category_id": category_id,
            "status": "active",
        },
    )
    assert response.status_code == 201
    return response.get_json()["activity"]["activity_id"]


def test_donee_view_donation_history(client, admin_profile_id):
    donee_profile_id = _profile_id(client, "Donee")
    donee_account_id = _create_account(client, donee_profile_id, "Donee History")
    fundraiser_account_id = _create_account(client, admin_profile_id, "FR History")
    category_id = _create_category(client)
    activity_id = _create_activity(client, fundraiser_account_id, category_id)

    donation = client.post(
        "/api/donee/donations",
        json={
            "account_id": donee_account_id,
            "activity_id": activity_id,
            "amount": 25,
            "donated_at": "2026-05-17",
        },
    )
    assert donation.status_code == 201

    response = client.get(f"/api/donee/donations?account_id={donee_account_id}")

    assert response.status_code == 200
    body = response.get_json()
    assert len(body["donations"]) == 1
    assert body["donations"][0]["activity_id"] == activity_id
    assert body["donations"][0]["amount"] == 25


def test_donee_view_single_donation_history_record(client, admin_profile_id):
    donee_profile_id = _profile_id(client, "Donee")
    donee_account_id = _create_account(client, donee_profile_id, "Donee View Record")
    fundraiser_account_id = _create_account(client, admin_profile_id, "FR View Record")
    category_id = _create_category(client)
    activity_id = _create_activity(client, fundraiser_account_id, category_id)

    donation = client.post(
        "/api/donee/donations",
        json={
            "account_id": donee_account_id,
            "activity_id": activity_id,
            "amount": 88,
            "donated_at": "2026-05-18",
        },
    )
    assert donation.status_code == 201
    donation_id = donation.get_json()["donation"]["donation_id"]

    response = client.get(
        f"/api/donee/donations/{donation_id}?account_id={donee_account_id}"
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["donation"]["donation_id"] == donation_id
    assert body["donation"]["activity_id"] == activity_id
    assert body["donation"]["amount"] == 88


def test_donee_view_single_donation_requires_owner(client, admin_profile_id):
    donee_profile_id = _profile_id(client, "Donee")
    owner_account_id = _create_account(client, donee_profile_id, "Donee Owner")
    other_account_id = _create_account(client, donee_profile_id, "Donee Other")
    fundraiser_account_id = _create_account(client, admin_profile_id, "FR Owner")
    category_id = _create_category(client)
    activity_id = _create_activity(client, fundraiser_account_id, category_id)

    donation = client.post(
        "/api/donee/donations",
        json={
            "account_id": owner_account_id,
            "activity_id": activity_id,
            "amount": 35,
            "donated_at": "2026-05-18",
        },
    )
    assert donation.status_code == 201
    donation_id = donation.get_json()["donation"]["donation_id"]

    response = client.get(
        f"/api/donee/donations/{donation_id}?account_id={other_account_id}"
    )

    assert response.status_code == 404


def test_donee_view_single_donation_requires_account_id(client):
    response = client.get("/api/donee/donations/999999")
    assert response.status_code == 400

