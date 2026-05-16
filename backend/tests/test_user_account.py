"""
User Admin -- user account management tests.

Covers report Stories #6-#10. Each test function corresponds to one row of
the report's Test Step table. Function names follow the report's Test Case
ID format: test_{story_id}_sprint{N}_{step}_{description}.

BCE flow under test:
    #6  Create account  -> POST   /api/user-accounts
    #7  View account    -> GET    /api/user-accounts/<id>
    #8  Update account  -> PUT    /api/user-accounts/<id>
    #9  Suspend account -> POST   /api/user-accounts/<id>/suspend
    #10 Search account  -> GET    /api/user-accounts?search=
"""
from __future__ import annotations


# ---------------------------------------------------------------------------
# Story #6 -- Create user account
# ---------------------------------------------------------------------------

def test_6_sprint1_1_create_valid_account(client, admin_profile_id):
    """6-Sprint1-1: All fields valid -> 201, account returned."""
    response = client.post(
        "/api/user-accounts",
        json={
            "name": "Test User 6-1",
            "email": "user6_1@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["account"]["email"] == "user6_1@example.com"
    assert body["account"]["is_suspended"] == 0


def test_6_sprint1_2_create_missing_name(client, admin_profile_id):
    """6-Sprint1-2: Missing name -> 400."""
    response = client.post(
        "/api/user-accounts",
        json={
            "name": "",
            "email": "user6_2@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 400


def test_6_sprint1_3_create_missing_email(client, admin_profile_id):
    """6-Sprint1-3: Missing email -> 400."""
    response = client.post(
        "/api/user-accounts",
        json={
            "name": "Test User 6-3",
            "email": "",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 400


def test_6_sprint1_4_create_invalid_profile_id(client):
    """6-Sprint1-4: Non-numeric profile_id -> 400."""
    response = client.post(
        "/api/user-accounts",
        json={
            "name": "Test User 6-4",
            "email": "user6_4@example.com",
            "password": "qwertyui",
            "profile_id": "not-a-number",
        },
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Story #7 -- View user account
# ---------------------------------------------------------------------------

def test_7_sprint1_1_view_existing_account(client, admin_profile_id):
    """7-Sprint1-1: View an account that exists -> 200, full record."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "View-Target",
            "email": "view_target@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]

    response = client.get(f"/api/user-accounts/{account_id}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["account"]["email"] == "view_target@example.com"
    assert body["account"]["profile_name"] == "User Admin"


def test_7_sprint1_2_view_nonexistent_account(client):
    """7-Sprint1-2: View account_id that doesn't exist -> 404."""
    response = client.get("/api/user-accounts/999999")
    assert response.status_code == 404


def test_7_sprint1_3_view_invalid_account_id(client):
    """7-Sprint1-3: account_id <= 0 -> 400."""
    response = client.get("/api/user-accounts/0")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Story #8 -- Update user account
# ---------------------------------------------------------------------------

def test_8_sprint1_1_update_existing_account(client, admin_profile_id):
    """8-Sprint1-1: Update name/email -> 200, new values persisted."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "Update-Target",
            "email": "update_target@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]

    response = client.put(
        f"/api/user-accounts/{account_id}",
        json={
            "name": "Update-Target-Renamed",
            "email": "update_renamed@example.com",
            "password": "",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["account"]["name"] == "Update-Target-Renamed"
    assert body["account"]["email"] == "update_renamed@example.com"


def test_8_sprint1_2_update_empty_password_keeps_old(client, admin_profile_id):
    """8-Sprint1-2: Blank password on update leaves stored password intact."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "Keep-Password",
            "email": "keep_pwd@example.com",
            "password": "original-pw",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]

    client.put(
        f"/api/user-accounts/{account_id}",
        json={
            "name": "Keep-Password",
            "email": "keep_pwd@example.com",
            "password": "",
            "profile_id": admin_profile_id,
        },
    )

    viewed = client.get(f"/api/user-accounts/{account_id}").get_json()
    assert viewed["account"]["password"] == "original-pw"


def test_8_sprint1_3_update_nonexistent_account(client, admin_profile_id):
    """8-Sprint1-3: Update account_id that does not exist -> 404."""
    response = client.put(
        "/api/user-accounts/999999",
        json={
            "name": "ghost",
            "email": "ghost@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Story #9 -- Suspend user account
# ---------------------------------------------------------------------------

def test_9_sprint1_1_suspend_account(client, admin_profile_id):
    """9-Sprint1-1: Suspend a fresh account -> 200, is_suspended=1."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "Suspend-Target",
            "email": "suspend_target@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]

    response = client.post(
        f"/api/user-accounts/{account_id}/suspend",
        json={"suspend": True},
    )
    assert response.status_code == 200
    assert response.get_json()["account"]["is_suspended"] == 1


def test_9_sprint1_2_unsuspend_account(client, admin_profile_id):
    """9-Sprint1-2: Re-enable a suspended account -> 200, is_suspended=0."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "Unsuspend-Target",
            "email": "unsuspend_target@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]
    client.post(f"/api/user-accounts/{account_id}/suspend", json={"suspend": True})

    response = client.post(
        f"/api/user-accounts/{account_id}/suspend",
        json={"suspend": False},
    )
    assert response.status_code == 200
    assert response.get_json()["account"]["is_suspended"] == 0


def test_9_sprint1_3_suspend_nonexistent_account(client):
    """9-Sprint1-3: Suspend non-existent account_id -> 404."""
    response = client.post(
        "/api/user-accounts/999999/suspend",
        json={"suspend": True},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Story #10 -- Search user account
# ---------------------------------------------------------------------------

def test_10_sprint1_1_search_by_name_not_supported(client, admin_profile_id):
    """10-Sprint1-1: Search only supports account_id/email, not name."""
    client.post(
        "/api/user-accounts",
        json={
            "name": "Searchable-By-Name",
            "email": "search_name@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )

    response = client.get("/api/user-accounts?search=Searchable-By-Name")
    assert response.status_code == 200
    assert response.get_json()["accounts"] == []


def test_10_sprint1_2_search_by_email(client, admin_profile_id):
    """10-Sprint1-2: Search by email substring -> 200, finds match."""
    client.post(
        "/api/user-accounts",
        json={
            "name": "Search-By-Email",
            "email": "uniquesearchemail@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    )

    response = client.get("/api/user-accounts?search=uniquesearchemail")
    assert response.status_code == 200
    emails = [a["email"] for a in response.get_json()["accounts"]]
    assert "uniquesearchemail@example.com" in emails


def test_10_sprint1_3_search_by_account_id(client, admin_profile_id):
    """10-Sprint1-3: Numeric search hits account_id branch -> 200, finds it."""
    created = client.post(
        "/api/user-accounts",
        json={
            "name": "Search-By-Id",
            "email": "search_by_id@example.com",
            "password": "qwertyui",
            "profile_id": admin_profile_id,
        },
    ).get_json()
    account_id = created["account"]["account_id"]

    response = client.get(f"/api/user-accounts?search={account_id}")
    assert response.status_code == 200
    ids = [a["account_id"] for a in response.get_json()["accounts"]]
    assert account_id in ids


def test_10_sprint1_4_search_no_results(client):
    """10-Sprint1-4: Search string with no matches -> 200, empty list."""
    response = client.get("/api/user-accounts?search=__no_such_account_anywhere__")
    assert response.status_code == 200
    assert response.get_json()["accounts"] == []
