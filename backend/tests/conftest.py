"""
Pytest fixtures: each test session runs against a fresh temporary SQLite file.

The production `backend/app.sqlite` is never touched. We monkey-patch
`backend.entity.db.DB_PATH` to a temp file BEFORE importing `backend.app` so
that the module-level `app = create_app()` triggers `init_db()` against the
test DB, including the default `admin@gmail.com` seed.
"""
from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import pytest


@pytest.fixture(scope="session")
def _app(tmp_path_factory):
    test_db = tmp_path_factory.mktemp("ofs-tests") / "test.sqlite"

    from backend.entity import db as db_module

    db_module.DB_PATH = test_db

    from backend.app import app as flask_app

    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(_app):
    return _app.test_client()


@pytest.fixture(scope="session")
def admin_profile_id(_app):
    """profile_id of the seeded 'User Admin' profile in the test DB."""
    import sqlite3

    from backend.entity.db import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT profile_id FROM user_profile WHERE profile_name = ?",
            ("User Admin",),
        ).fetchone()
        assert row, "User Admin profile not seeded in test DB"
        return row["profile_id"]
    finally:
        conn.close()
