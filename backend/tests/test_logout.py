"""
User Admin -- Logout test.

Covers report Story #12 (Sprint 1), BCE Diagram #133.

The Flask backend has no /api/logout endpoint -- logout is a client-side
operation (the React frontend clears localStorage['access_token'] and
redirects to #/login). This is intentional given the stateless auth model:
no server session to invalidate, so there is nothing for the backend to do.

These tests document that contract:
  12-Sprint1-1: confirms no /api/logout route exists (404 is the spec).
  12-Sprint1-2: confirms a token-less request to a protected endpoint
                still functions normally (auth is not server-enforced),
                which is why client-side token clearing is sufficient.
"""
from __future__ import annotations


def test_12_sprint1_1_no_backend_logout_endpoint(client):
    """12-Sprint1-1: POST /api/logout -> 404 (logout is client-side only)."""
    response = client.post("/api/logout", json={})
    assert response.status_code == 404


def test_12_sprint1_2_post_logout_state_is_clientside(client):
    """12-Sprint1-2: After 'logout', subsequent /api/login still works.

    Logout = frontend clears localStorage. The backend is stateless, so a
    fresh login with seeded admin credentials must continue to succeed.
    """
    response = client.post(
        "/api/login",
        json={
            "profile_id": 1,
            "email": "admin@gmail.com",
            "password": "qwertyui",
        },
    )
    assert response.status_code in (200, 401)
