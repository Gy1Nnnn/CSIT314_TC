"""
User Admin -- user profile management tests.

Covers report Stories #1-#5 (Sprint 1). Each test function corresponds to
one row of the report's Test Step table. Function names follow the report's
Test Case ID format: test_{story_id}_sprint{N}_{step}_{description}.

BCE flow under test:
    #1 Create profile  -> BCE #45  -> POST /api/user-profiles
    #2 View profile    -> BCE #53  -> GET  /api/user-profiles, GET /api/user-profiles/<id>
    #3 Update profile  -> BCE #61  -> PUT  /api/user-profiles/<id>
    #4 Suspend profile -> BCE #69  -> POST /api/user-profiles/<id>/suspend
    #5 Search profile  -> BCE #77  -> GET  /api/user-profiles?search=
"""
from __future__ import annotations


# ---------------------------------------------------------------------------
# Story #1 -- Create user profile (BCE #45)
# ---------------------------------------------------------------------------

def test_1_sprint1_1_create_valid_profile(client):
    """1-Sprint1-1: Submit name + description -> 201, profile returned."""
    response = client.post(
        "/api/user-profiles",
        json={
            "profile_name": "Test Profile 1-1",
            "description": "Created by automated test",
            "access_control": "limited",
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["profile"]["profile_name"] == "Test Profile 1-1"
    assert body["profile"]["is_suspended"] == 0


def test_1_sprint1_2_create_empty_name(client):
    """1-Sprint1-2: Empty profile_name -> 400 (boundary 'required' guard)."""
    response = client.post(
        "/api/user-profiles",
        json={"profile_name": "", "description": "no name"},
    )
    assert response.status_code == 400


def test_1_sprint1_3_create_minimal_fields(client):
    """1-Sprint1-3: Only profile_name supplied -> 201 (description optional)."""
    response = client.post(
        "/api/user-profiles",
        json={"profile_name": "Test Profile 1-3"},
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["profile"]["profile_name"] == "Test Profile 1-3"


# ---------------------------------------------------------------------------
# Story #2 -- View user profile (BCE #53)
# ---------------------------------------------------------------------------

def test_2_sprint1_1_view_lists_seeded_profiles(client):
    """2-Sprint1-1: GET with no search -> 200, includes seeded User Admin."""
    response = client.get("/api/user-profiles")
    assert response.status_code == 200
    body = response.get_json()
    names = [p["profile_name"] for p in body["profiles"]]
    assert "User Admin" in names


def test_2_sprint1_2_view_returns_full_fields(client):
    """2-Sprint1-2: Each row exposes profile_id, profile_name, is_suspended."""
    response = client.get("/api/user-profiles")
    assert response.status_code == 200
    body = response.get_json()
    assert body["profiles"], "expected at least one profile"
    sample = body["profiles"][0]
    for field in ("profile_id", "profile_name", "is_suspended"):
        assert field in sample


def test_2_sprint1_3_view_single_profile_by_id(client, admin_profile_id):
    """2-Sprint1-3: GET one profile by id -> 200, same fields as list row."""
    response = client.get(f"/api/user-profiles/{admin_profile_id}")
    assert response.status_code == 200
    body = response.get_json()
    assert "profile" in body
    prof = body["profile"]
    for field in ("profile_id", "profile_name", "description", "access_control", "is_suspended"):
        assert field in prof
    assert prof["profile_id"] == admin_profile_id


def test_2_sprint1_4_view_nonexistent_profile(client):
    """2-Sprint1-4: GET profile id that does not exist -> 404."""
    response = client.get("/api/user-profiles/999999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Story #3 -- Update user profile (BCE #61)
# ---------------------------------------------------------------------------

def test_3_sprint1_1_update_existing_profile(client):
    """3-Sprint1-1: Update name/description on a fresh profile -> 200."""
    created = client.post(
        "/api/user-profiles",
        json={"profile_name": "Profile-To-Rename", "description": "original"},
    ).get_json()
    profile_id = created["profile"]["profile_id"]

    response = client.put(
        f"/api/user-profiles/{profile_id}",
        json={"profile_name": "Profile-Renamed", "description": "updated"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["profile"]["profile_name"] == "Profile-Renamed"
    assert body["profile"]["description"] == "updated"


def test_3_sprint1_2_update_nonexistent_profile(client):
    """3-Sprint1-2: Update profile_id that does not exist -> 404."""
    response = client.put(
        "/api/user-profiles/999999",
        json={"profile_name": "ghost"},
    )
    assert response.status_code == 404


def test_3_sprint1_3_update_empty_name(client):
    """3-Sprint1-3: Empty profile_name on update -> 400."""
    created = client.post(
        "/api/user-profiles",
        json={"profile_name": "Profile-Update-Empty"},
    ).get_json()
    profile_id = created["profile"]["profile_id"]

    response = client.put(
        f"/api/user-profiles/{profile_id}",
        json={"profile_name": ""},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Story #4 -- Suspend user profile (BCE #69)
# ---------------------------------------------------------------------------

def test_4_sprint1_1_suspend_profile(client):
    """4-Sprint1-1: Suspend a fresh profile -> 200, is_suspended=1."""
    created = client.post(
        "/api/user-profiles",
        json={"profile_name": "Profile-To-Suspend"},
    ).get_json()
    profile_id = created["profile"]["profile_id"]

    response = client.post(
        f"/api/user-profiles/{profile_id}/suspend",
        json={"suspend": True},
    )
    assert response.status_code == 200
    assert response.get_json()["profile"]["is_suspended"] == 1


def test_4_sprint1_2_unsuspend_profile(client):
    """4-Sprint1-2: Re-enable a suspended profile -> 200, is_suspended=0."""
    created = client.post(
        "/api/user-profiles",
        json={"profile_name": "Profile-To-Unsuspend"},
    ).get_json()
    profile_id = created["profile"]["profile_id"]
    client.post(f"/api/user-profiles/{profile_id}/suspend", json={"suspend": True})

    response = client.post(
        f"/api/user-profiles/{profile_id}/suspend",
        json={"suspend": False},
    )
    assert response.status_code == 200
    assert response.get_json()["profile"]["is_suspended"] == 0


def test_4_sprint1_3_suspend_nonexistent_profile(client):
    """4-Sprint1-3: Suspend non-existent profile_id -> 404."""
    response = client.post(
        "/api/user-profiles/999999/suspend",
        json={"suspend": True},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Story #5 -- Search user profile (BCE #77)
# ---------------------------------------------------------------------------

def test_5_sprint1_1_search_by_exact_name(client):
    """5-Sprint1-1: Exact profile_name match -> 200, result contains it."""
    client.post("/api/user-profiles", json={"profile_name": "Search-Exact-Match"})

    response = client.get("/api/user-profiles?search=Search-Exact-Match")
    assert response.status_code == 200
    names = [p["profile_name"] for p in response.get_json()["profiles"]]
    assert "Search-Exact-Match" in names


def test_5_sprint1_2_search_by_partial_name(client):
    """5-Sprint1-2: Partial substring (LIKE %x%) -> 200, finds match."""
    client.post("/api/user-profiles", json={"profile_name": "Partial-Search-XYZ"})

    response = client.get("/api/user-profiles?search=XYZ")
    assert response.status_code == 200
    names = [p["profile_name"] for p in response.get_json()["profiles"]]
    assert any("XYZ" in n for n in names)


def test_5_sprint1_3_search_no_results(client):
    """5-Sprint1-3: Search string with no matches -> 200, empty list."""
    response = client.get("/api/user-profiles?search=__nope_no_such_profile__")
    assert response.status_code == 200
    assert response.get_json()["profiles"] == []
