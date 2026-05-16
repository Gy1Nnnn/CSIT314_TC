"""
User Admin Login tests -- mirrors report Story #11, Test Case ID 11-Sprint1
(Taiga #129). Each test function corresponds to one row of the report's test
case table. A failing line in CI output (e.g.
`test_11_sprint1_2_invalid_email FAILED`) maps directly back to the report.

BCE flow under test (BCE diagram #125):
    User Admin -> LoginUI -> LoginController -> UserAccount

LoginUI (the React form) is out of scope for backend tests. These tests
exercise the login_boundary -> LoginControl -> UserAccount entity chain.
"""
from __future__ import annotations


def test_11_sprint1_1_valid_credentials(client, admin_profile_id):
    """11-Sprint1-1: Valid email + valid password -> 200, seeded admin returned."""
    response = client.post(
        "/api/login",
        json={
            "profile_id": admin_profile_id,
            "email": "admin@gmail.com",
            "password": "qwertyui",
        },
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["email"] == "admin@gmail.com"
    assert body["user"]["profile_name"] == "User Admin"


def test_11_sprint1_2_invalid_email(client, admin_profile_id):
    """11-Sprint1-2: Email not in the system -> 401 Invalid combination."""
    response = client.post(
        "/api/login",
        json={
            "profile_id": admin_profile_id,
            "email": "bb@gmail.com",
            "password": "qwertyui",
        },
    )
    assert response.status_code == 401


def test_11_sprint1_3_invalid_password(client, admin_profile_id):
    """11-Sprint1-3: Valid email + wrong password -> 401 Invalid combination."""
    response = client.post(
        "/api/login",
        json={
            "profile_id": admin_profile_id,
            "email": "admin@gmail.com",
            "password": "123456",
        },
    )
    assert response.status_code == 401


def test_11_sprint1_4_empty_credentials(client):
    """11-Sprint1-4: Empty fields -> 400 (boundary 'fill all fields' guard)."""
    response = client.post(
        "/api/login",
        json={
            "profile_id": "",
            "email": "",
            "password": "",
        },
    )
    assert response.status_code == 400
