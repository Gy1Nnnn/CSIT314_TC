"""FRA create: campaign name uniqueness."""

from __future__ import annotations

from uuid import uuid4

from backend.tests.test_fra_view import _create_category, _create_fundraiser_account


def _create_activity(client, account_id, category_id, activity_name: str):
    return client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": activity_name,
            "category_id": category_id,
            "description": "Test campaign",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "target_amount": 1000,
            "status": "active",
        },
    )


def test_create_fra_rejects_duplicate_campaign_name(client, admin_profile_id):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)
    name = f"Unique Campaign {uuid4().hex[:8]}"

    assert _create_activity(client, account_id, category_id, name).status_code == 201

    response = _create_activity(client, account_id, category_id, name)
    assert response.status_code == 400
    assert "campaign name" in response.get_json()["message"].lower()


def test_create_fra_rejects_duplicate_campaign_name_case_insensitive(
    client, admin_profile_id,
):
    account_id = _create_fundraiser_account(client, admin_profile_id)
    category_id = _create_category(client)

    assert (
        _create_activity(client, account_id, category_id, "Case Campaign").status_code
        == 201
    )

    response = _create_activity(client, account_id, category_id, "case campaign")
    assert response.status_code == 400


def test_create_fra_duplicate_name_blocked_across_fundraisers(
    client, admin_profile_id,
):
    """Campaign names are unique platform-wide, not per fundraiser."""
    account_a = _create_fundraiser_account(client, admin_profile_id)
    suffix = uuid4().hex[:8]
    account_b = client.post(
        "/api/user-accounts",
        json={
            "name": f"fundraiser_b_{suffix}",
            "email": f"fra_b_{suffix}@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()["account"]["account_id"]
    category_id = _create_category(client)
    name = f"Shared Name Blocked {suffix}"

    assert _create_activity(client, account_a, category_id, name).status_code == 201
    assert _create_activity(client, account_b, category_id, name).status_code == 400
