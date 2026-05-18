"""
Donee -- search favourites list (Story #23).

Data-driven tests: search scenarios are defined in SEARCH_CASES and executed
via pytest.mark.parametrize. Each row maps to a report-style test step.

BCE flow under test:
    GET /api/donee/favorites?account_id=&search=
    -> DoneeFavoriteBoundary.list_favorites()
    -> DoneeFavoriteControl.list_favorites(account_id, search)
    -> DoneeFavorite.list_favorites(account_id, search)
"""
from __future__ import annotations

from uuid import uuid4

import pytest

# ---------------------------------------------------------------------------
# Test data table (data-driven development)
# ---------------------------------------------------------------------------
# Columns: step_id, search, expected_activity_names (set), description
SEARCH_CASES = [
    (
        "23-Sprint1-1",
        "",
        {"Fav Search Alpha", "Fav Search Beta"},
        "No search term returns all favourites for the donee",
    ),
    (
        "23-Sprint1-2",
        "Alpha",
        {"Fav Search Alpha"},
        "Search matches activity_name",
    ),
    (
        "23-Sprint1-3",
        "Beta Cat",  # matches category name prefix from fixture
        {"Fav Search Beta"},
        "Search matches category_name",
    ),
    (
        "23-Sprint1-4",
        "999",  # activity_id filled in at runtime via fixture
        set(),
        "Search matches numeric activity_id (id injected in test)",
    ),
    (
        "23-Sprint1-5",
        "NoMatchXYZ",
        set(),
        "Search with no matches returns empty favourites list",
    ),
]


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


def _create_category(client, category_name):
    response = client.post(
        "/api/categories",
        json={"category_name": category_name},
    )
    assert response.status_code == 201
    return response.get_json()["category"]["category_id"]


def _create_activity(client, account_id, category_id, activity_name):
    response = client.post(
        "/api/fundraising-activities",
        json={
            "account_id": account_id,
            "activity_name": activity_name,
            "category_id": category_id,
            "status": "active",
        },
    )
    assert response.status_code == 201
    return response.get_json()["activity"]["activity_id"]


@pytest.fixture
def favorite_search_setup(client, admin_profile_id):
    """Two favourited active campaigns with distinct names and categories."""
    donee_profile_id = _profile_id(client, "Donee")
    donee_account_id = _create_account(client, donee_profile_id, "Donee Fav Search")
    fundraiser_account_id = _create_account(client, admin_profile_id, "FR Fav Search")

    suffix = uuid4().hex[:8]
    cat_alpha_id = _create_category(client, f"Alpha Cat {suffix}")
    cat_beta_id = _create_category(client, f"Beta Cat {suffix}")

    alpha_name = f"Fav Search Alpha {suffix}"
    beta_name = f"Fav Search Beta {suffix}"
    activity_alpha_id = _create_activity(
        client,
        fundraiser_account_id,
        cat_alpha_id,
        alpha_name,
    )
    activity_beta_id = _create_activity(
        client,
        fundraiser_account_id,
        cat_beta_id,
        beta_name,
    )

    for activity_id in (activity_alpha_id, activity_beta_id):
        add = client.post(
            "/api/donee/favorites",
            json={"account_id": donee_account_id, "activity_id": activity_id},
        )
        assert add.status_code == 201

    return {
        "donee_account_id": donee_account_id,
        "activity_alpha_id": activity_alpha_id,
        "activity_beta_id": activity_beta_id,
        "alpha_name": alpha_name,
        "beta_name": beta_name,
    }


@pytest.mark.parametrize(
    "step_id,search,expected_names,description",
    SEARCH_CASES,
    ids=[row[0] for row in SEARCH_CASES],
)
def test_23_search_favorites_data_driven(
    client,
    favorite_search_setup,
    step_id,
    search,
    expected_names,
    description,
):
    """Story #23: parameterized search cases from SEARCH_CASES."""
    account_id = favorite_search_setup["donee_account_id"]
    alpha_name = favorite_search_setup["alpha_name"]
    beta_name = favorite_search_setup["beta_name"]

    if step_id == "23-Sprint1-1":
        expected_names = {alpha_name, beta_name}
    elif step_id == "23-Sprint1-2":
        expected_names = {alpha_name}
    elif step_id == "23-Sprint1-3":
        expected_names = {beta_name}
    elif step_id == "23-Sprint1-4":
        search = str(favorite_search_setup["activity_beta_id"])
        expected_names = {beta_name}

    response = client.get(
        f"/api/donee/favorites?account_id={account_id}&search={search}"
    )
    assert response.status_code == 200, f"{step_id}: {description}"
    names = {f["activity_name"] for f in response.get_json()["favorites"]}
    assert names == expected_names, f"{step_id}: {description}"


def test_23_sprint1_6_missing_account_id(client):
    """23-Sprint1-6: Missing account_id -> 400."""
    response = client.get("/api/donee/favorites?search=Alpha")
    assert response.status_code == 400
    assert "account_id" in response.get_json()["message"].lower()


def test_23_sprint1_7_invalid_account_id(client):
    """23-Sprint1-7: Non-numeric account_id -> 400."""
    response = client.get("/api/donee/favorites?account_id=abc&search=Alpha")
    assert response.status_code == 400


def test_23_sprint1_8_not_donee_account(client, admin_profile_id):
    """23-Sprint1-8: Non-donee account -> 403."""
    admin_account = client.get("/api/user-accounts?search=admin@gmail.com")
    assert admin_account.status_code == 200
    accounts = admin_account.get_json()["accounts"]
    assert accounts
    account_id = accounts[0]["account_id"]

    response = client.get(
        f"/api/donee/favorites?account_id={account_id}&search=Alpha"
    )
    assert response.status_code == 403
    assert "donee" in response.get_json()["message"].lower()
