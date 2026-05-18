from __future__ import annotations

from uuid import uuid4


def _profile_id(client, profile_name):
    response = client.get(f"/api/user-profiles?search={profile_name}")
    assert response.status_code == 200
    for profile in response.get_json()["profiles"]:
        if profile["profile_name"] == profile_name:
            return profile["profile_id"]
    created = client.post(
        "/api/user-profiles",
        json={"profile_name": profile_name, "access_control": "reports"},
    )
    assert created.status_code == 201
    return created.get_json()["profile"]["profile_id"]


def _create_platform_manager(client):
    profile_id = _profile_id(client, "Platform Manager")
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/user-accounts",
        json={
            "name": f"report_manager_{suffix}",
            "email": f"report_manager_{suffix}@example.com",
            "password": "qwertyui",
            "profile_id": profile_id,
        },
    )
    assert response.status_code == 201
    return response.get_json()["account"]["account_id"]


def test_platform_manager_get_daily_report(client):
    account_id = _create_platform_manager(client)

    response = client.get(
        f"/api/platform/reports/fundraising/daily?account_id={account_id}&date=2026-05-17"
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["period"] == "daily"
    assert body["range"] == {"start": "2026-05-17", "end": "2026-05-17"}


def test_platform_manager_get_weekly_report(client):
    account_id = _create_platform_manager(client)

    response = client.get(
        f"/api/platform/reports/fundraising/weekly?account_id={account_id}&date=2026-05-17"
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["period"] == "weekly"
    assert body["range"] == {"start": "2026-05-11", "end": "2026-05-17"}


def test_platform_manager_get_monthly_report(client):
    account_id = _create_platform_manager(client)

    response = client.get(
        f"/api/platform/reports/fundraising/monthly?account_id={account_id}&month=2026-05"
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["period"] == "monthly"
    assert body["range"] == {"start": "2026-05-01", "end": "2026-05-31"}


def test_daily_report_requires_date(client):
    account_id = _create_platform_manager(client)

    response = client.get(
        f"/api/platform/reports/fundraising/daily?account_id={account_id}"
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "date is required (YYYY-MM-DD)."
