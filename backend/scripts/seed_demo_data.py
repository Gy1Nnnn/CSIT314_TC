"""Seed bulk demo data on top of the existing curated dataset.

Spec requirement: "test data sufficiently large to simulate the system
(e.g. 100 records to each datatype)" (Project Specification, page 3).

This script ADDS ~95 user_accounts, ~12 categories, ~100 FRAs,
~100 favorites and ~100 donations to whatever's already in app.sqlite.
The team's hand-curated rows (Messi, Diamond, etc.) are preserved.

Usage (from backend/):
    python -m scripts.seed_demo_data            # safe: skip if already seeded
    python -m scripts.seed_demo_data --reset    # wipe seeded rows + re-insert
    python -m scripts.seed_demo_data --force    # re-seed without wiping

Reset works by identifying seeded rows without polluting their content:
  - Accounts use natural-looking gmail addresses with a two-digit suffix
    (fundraiser01@gmail.com, donee01@gmail.com, pm01@gmail.com). The team's
    existing fundraiser@gmail.com / donee@gmail.com are left alone because
    they have no digit suffix.
  - FRAs are identified by ownership (account_id belongs to a seeded account).
  - Categories are identified by name (must match an entry in EXTRA_CATEGORIES).
  - Favorites and donations cascade off the seeded accounts/FRAs.
"""
from __future__ import annotations

import argparse
import random
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "app.sqlite"

SEED = 314  # deterministic across runs

# Seeded accounts use these LIKE patterns. The '__' is two single-char
# wildcards in SQL LIKE, so each pattern matches exactly two digits between
# the role prefix and '@gmail.com'. The team's existing fundraiser@gmail.com /
# donee@gmail.com do not match (zero chars between prefix and '@').
SEED_EMAIL_PATTERNS = (
    "fundraiser__@gmail.com",
    "donee__@gmail.com",
    "pm__@gmail.com",
)
SEED_EMAIL_DOMAIN = "@gmail.com"

DEFAULT_PASSWORD = "password123"

# How much bulk data to add ON TOP of whatever already exists.
TARGET_ACCOUNTS = 95   # ~40 fundraisers + ~50 donees + ~5 platform managers
TARGET_CATEGORIES = 12
TARGET_FRAS = 100
TARGET_FAVORITES = 100
TARGET_DONATIONS = 100

FIRST_NAMES = [
    "Alice", "Ben", "Cara", "Dan", "Ella", "Felix", "Gia", "Hugo",
    "Iris", "Jack", "Kira", "Leo", "Mia", "Noah", "Olive", "Pia",
    "Quinn", "Ravi", "Sara", "Tom", "Uma", "Vik", "Wren", "Xan",
    "Yuki", "Zoe", "Amir", "Bea", "Cyrus", "Dara", "Emi", "Faye",
    "Gus", "Hana", "Ivo", "Jules",
]

LAST_NAMES = [
    "Adler", "Brennan", "Cho", "Diaz", "Edwards", "Fischer", "Gomez",
    "Hassan", "Iyer", "Jensen", "Khan", "Lopez", "Mori", "Nakamura",
    "Owen", "Patel", "Quan", "Romero", "Singh", "Tanaka", "Ueda",
    "Vargas", "Wong", "Xu", "Yamada", "Zhao",
]

# Realistic FRA category set (separate from the team's curated 3).
EXTRA_CATEGORIES = [
    ("Health", "Medical bills, treatments, and health emergencies."),
    ("Sports", "Local teams, equipment, and youth athletic programs."),
    ("Environment", "Conservation projects and climate initiatives."),
    ("Technology", "Open-source tools, makerspaces, and STEM education."),
    ("Disaster Relief", "Emergency support after natural disasters."),
    ("Arts", "Performances, exhibitions, and creative projects."),
    ("Women", "Programs supporting women and girls."),
    ("Children", "Youth welfare, schooling, and child healthcare."),
    ("Veterans", "Support for veterans and their families."),
    ("Religious", "Faith-based community initiatives."),
    ("Memorial", "Funerary and memorial fundraisers."),
    ("Emergency", "Urgent short-term fundraising needs."),
]

# Word banks for FRA names/descriptions. Combining a word from each list
# gives 20*20 = 400 possible names, plenty of variety for ~100 FRAs.
FRA_NAME_LEFT = [
    "Hope", "Bright", "Stronger", "Together", "Helping",
    "Caring", "Rising", "Open", "Future", "Kind",
    "United", "Green", "Safe", "New", "Better",
    "Joyful", "Heartfelt", "Shared", "Local", "Global",
]
FRA_NAME_RIGHT = [
    "Tomorrow", "Hearts", "Hands", "Communities", "Beginnings",
    "Horizons", "Generations", "Paths", "Voices", "Dreams",
    "Roots", "Lights", "Steps", "Bridges", "Harvest",
    "Shelter", "Smiles", "Wings", "Pages", "Threads",
]

FRA_DESCRIPTIONS = [
    "Every contribution brings us one step closer to our goal.",
    "Join our community in making a real and lasting difference.",
    "Help us support those who need it most right now.",
    "Your generosity changes lives every single day.",
    "We are raising funds to expand a programme that has already changed many lives.",
    "Small donations add up to big change when we work together.",
    "Stand with us in this important moment and help us push forward.",
    "We need your help to bring this project to the people who depend on it.",
    "Together we can turn a difficult situation into a story of hope.",
    "A simple act of generosity can spark a chain of positive impact.",
    "Every dollar raised goes directly to the families and individuals we serve.",
    "Be part of a meaningful effort built on care, transparency, and trust.",
    "Our team has been working on this initiative for months - please help us cross the line.",
    "When neighbours support neighbours, communities become stronger.",
    "Your support means more than you might realise. Thank you for being here.",
]


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise SystemExit(
            f"Database not found at {DB_PATH}. "
            "Run the app once (python app.py) to create it, then re-run this script."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _profile_id(conn: sqlite3.Connection, name: str) -> int | None:
    row = conn.execute(
        "SELECT profile_id FROM user_profile WHERE LOWER(profile_name) = LOWER(?)",
        (name,),
    ).fetchone()
    return row["profile_id"] if row else None


def _seeded_account_where_clause() -> tuple[str, list[str]]:
    """SQL WHERE fragment + params that match every seeded account email."""
    clauses = " OR ".join(["email LIKE ?"] * len(SEED_EMAIL_PATTERNS))
    return f"({clauses})", list(SEED_EMAIL_PATTERNS)


def _already_seeded(conn: sqlite3.Connection) -> bool:
    where, params = _seeded_account_where_clause()
    n = conn.execute(
        f"SELECT COUNT(*) FROM user_account WHERE {where}", params,
    ).fetchone()[0]
    return n > 0


def _count_table(conn: sqlite3.Connection, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


# ---------------------------------------------------------------------------
# Reset (only seeded rows; preserves curated data)
# ---------------------------------------------------------------------------

def reset_bulk_data(conn: sqlite3.Connection) -> None:
    """Delete only the rows this script inserted, leaving curated data intact.

    Identification rules:
      - Seeded accounts: email ends with SEED_EMAIL_DOMAIN.
      - Seeded FRAs: owned by a seeded account.
      - Seeded categories: category_name is in the EXTRA_CATEGORIES list.
      - Favorites and donations: cascade off seeded accounts or seeded FRAs.
    """
    where, params = _seeded_account_where_clause()
    seeded_account_ids = [
        r["account_id"]
        for r in conn.execute(
            f"SELECT account_id FROM user_account WHERE {where}", params,
        )
    ]
    if seeded_account_ids:
        placeholders = ",".join("?" * len(seeded_account_ids))
        seeded_activity_ids = [
            r["activity_id"]
            for r in conn.execute(
                f"SELECT activity_id FROM FRA WHERE account_id IN ({placeholders})",
                seeded_account_ids,
            )
        ]
    else:
        seeded_activity_ids = []

    if seeded_account_ids:
        placeholders = ",".join("?" * len(seeded_account_ids))
        conn.execute(
            f"DELETE FROM donee_favorite WHERE account_id IN ({placeholders})",
            seeded_account_ids,
        )
        conn.execute(
            f"DELETE FROM donee_donation WHERE account_id IN ({placeholders})",
            seeded_account_ids,
        )

    if seeded_activity_ids:
        placeholders = ",".join("?" * len(seeded_activity_ids))
        conn.execute(
            f"DELETE FROM donee_favorite WHERE activity_id IN ({placeholders})",
            seeded_activity_ids,
        )
        conn.execute(
            f"DELETE FROM donee_donation WHERE activity_id IN ({placeholders})",
            seeded_activity_ids,
        )
        conn.execute(
            f"DELETE FROM FRA WHERE activity_id IN ({placeholders})",
            seeded_activity_ids,
        )

    if seeded_account_ids:
        placeholders = ",".join("?" * len(seeded_account_ids))
        conn.execute(
            f"DELETE FROM user_account WHERE account_id IN ({placeholders})",
            seeded_account_ids,
        )

    extra_names = [name for name, _ in EXTRA_CATEGORIES]
    placeholders = ",".join("?" * len(extra_names))
    conn.execute(
        f"DELETE FROM category WHERE category_name IN ({placeholders})",
        extra_names,
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Seed steps
# ---------------------------------------------------------------------------

def seed_user_accounts(
    conn: sqlite3.Connection,
    fundraiser_pid: int,
    donee_pid: int,
    pm_pid: int | None,
) -> tuple[list[int], list[int]]:
    """Insert ~95 accounts. Returns (fundraiser_ids, donee_ids)."""
    fundraiser_ids: list[int] = []
    donee_ids: list[int] = []

    def _insert(name: str, email: str, profile_id: int) -> int:
        cur = conn.execute(
            "INSERT INTO user_account (name, email, password, profile_id, is_suspended) "
            "VALUES (?, ?, ?, ?, 0)",
            (name, email, DEFAULT_PASSWORD, profile_id),
        )
        return cur.lastrowid

    for i in range(1, 41):  # 40 fundraisers
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"fundraiser{i:02d}{SEED_EMAIL_DOMAIN}"
        fundraiser_ids.append(_insert(name, email, fundraiser_pid))

    for i in range(1, 51):  # 50 donees
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"donee{i:02d}{SEED_EMAIL_DOMAIN}"
        donee_ids.append(_insert(name, email, donee_pid))

    if pm_pid is not None:
        for i in range(1, 6):  # 5 platform managers
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            email = f"pm{i:02d}{SEED_EMAIL_DOMAIN}"
            _insert(name, email, pm_pid)

    conn.commit()
    return fundraiser_ids, donee_ids


def seed_categories(conn: sqlite3.Connection) -> list[int]:
    """Insert ~12 extra categories. Returns all category_ids (existing + new)."""
    for name, desc in EXTRA_CATEGORIES:
        conn.execute(
            "INSERT INTO category (category_name, description, is_suspended) "
            "VALUES (?, ?, 0)",
            (name, desc),
        )
    conn.commit()
    return [r["category_id"] for r in conn.execute("SELECT category_id FROM category")]


def seed_fras(
    conn: sqlite3.Connection,
    fundraiser_ids: list[int],
    category_ids: list[int],
) -> list[int]:
    """Insert 100 FRAs spread across fundraisers + categories."""
    today = date.today()
    activity_ids: list[int] = []

    for i in range(1, TARGET_FRAS + 1):
        owner = random.choice(fundraiser_ids)
        cat = random.choice(category_ids)
        left = random.choice(FRA_NAME_LEFT)
        right = random.choice(FRA_NAME_RIGHT)
        name = f"{left} {right}"
        desc = random.choice(FRA_DESCRIPTIONS)

        # ~70 active, ~25 completed, ~5 suspended
        roll = random.random()
        target = round(random.uniform(500, 20000), 2)

        if roll < 0.05:
            status = "suspended"
            raised = round(random.uniform(0, target * 0.6), 2)
            start_offset = -random.randint(5, 60)
            end_offset = random.randint(10, 60)
            is_suspended = 1
        elif roll < 0.30:
            status = "completed"
            raised = round(random.uniform(target, target * 1.4), 2)
            start_offset = -random.randint(60, 365)
            end_offset = -random.randint(1, 30)
            is_suspended = 0
        else:
            status = "active"
            raised = round(random.uniform(0, target * 0.9), 2)
            start_offset = -random.randint(0, 30)
            end_offset = random.randint(15, 120)
            is_suspended = 0

        start_d = (today + timedelta(days=start_offset)).isoformat()
        end_d = (today + timedelta(days=end_offset)).isoformat()
        duration = f"{(end_offset - start_offset)} days"
        views = random.randint(0, 500)

        cur = conn.execute(
            """
            INSERT INTO FRA
                (activity_name, category_id, description, start_date, end_date,
                 duration, target_amount, amount_raised, status, account_id,
                 is_suspended, view_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name, cat, desc, start_d, end_d, duration,
                target, raised, status, owner, is_suspended, views,
            ),
        )
        activity_ids.append(cur.lastrowid)

    conn.commit()
    return activity_ids


def seed_favorites(
    conn: sqlite3.Connection,
    donee_ids: list[int],
    activity_ids: list[int],
) -> int:
    """Insert ~100 favorites (respects UNIQUE constraint)."""
    seen: set[tuple[int, int]] = set()
    inserted = 0
    attempts = 0
    while inserted < TARGET_FAVORITES and attempts < TARGET_FAVORITES * 5:
        attempts += 1
        donee = random.choice(donee_ids)
        activity = random.choice(activity_ids)
        if (donee, activity) in seen:
            continue
        seen.add((donee, activity))
        # The created_at column has a default of datetime('now'); leave it.
        conn.execute(
            "INSERT OR IGNORE INTO donee_favorite (account_id, activity_id) VALUES (?, ?)",
            (donee, activity),
        )
        inserted += 1
    conn.commit()
    return inserted


def seed_donations(
    conn: sqlite3.Connection,
    donee_ids: list[int],
    activity_ids: list[int],
) -> int:
    """Insert ~100 donations spread over the last 6 months."""
    today = date.today()
    for _ in range(TARGET_DONATIONS):
        donee = random.choice(donee_ids)
        activity = random.choice(activity_ids)
        amount = round(random.uniform(5, 500), 2)
        days_ago = random.randint(0, 180)
        donated_at = (today - timedelta(days=days_ago)).isoformat() + " 12:00:00"
        conn.execute(
            "INSERT INTO donee_donation (account_id, activity_id, amount, donated_at) "
            "VALUES (?, ?, ?, ?)",
            (donee, activity, amount, donated_at),
        )
    conn.commit()
    return TARGET_DONATIONS


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def print_counts(conn: sqlite3.Connection, label: str) -> None:
    print(f"\n--- {label} ---")
    for t in ("user_profile", "user_account", "category", "FRA",
              "donee_favorite", "donee_donation"):
        print(f"  {t}: {_count_table(conn, t)}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed bulk demo data into app.sqlite.")
    parser.add_argument(
        "--reset", action="store_true",
        help="Delete previously-seeded rows before inserting (preserves curated data).",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Insert another round even if seed data already exists (creates duplicates).",
    )
    args = parser.parse_args(argv)

    random.seed(SEED)
    conn = _connect()

    try:
        print_counts(conn, "BEFORE")

        if args.reset:
            print("\nResetting previously-seeded rows...")
            reset_bulk_data(conn)
            print_counts(conn, "AFTER RESET")
        elif _already_seeded(conn) and not args.force:
            print(
                "\nSeed data already present (found accounts matching "
                "fundraiserNN@gmail.com / doneeNN@gmail.com / pmNN@gmail.com). "
                "Use --reset to wipe and re-seed, or --force to add another round."
            )
            return 0

        fundraiser_pid = _profile_id(conn, "Fundraiser")
        donee_pid = _profile_id(conn, "Donee")
        pm_pid = _profile_id(conn, "Platform Manager")

        if fundraiser_pid is None or donee_pid is None:
            raise SystemExit(
                "Missing required profiles: Fundraiser and/or Donee. "
                "Run the app once to seed default profiles, then retry."
            )

        print("\nSeeding accounts...")
        fundraiser_ids, donee_ids = seed_user_accounts(
            conn, fundraiser_pid, donee_pid, pm_pid,
        )
        print(f"  +{len(fundraiser_ids)} fundraisers, +{len(donee_ids)} donees")

        print("Seeding categories...")
        category_ids = seed_categories(conn)
        print(f"  +{len(EXTRA_CATEGORIES)} categories")

        print("Seeding FRAs...")
        activity_ids = seed_fras(conn, fundraiser_ids, category_ids)
        print(f"  +{len(activity_ids)} fundraising activities")

        print("Seeding favorites...")
        n_fav = seed_favorites(conn, donee_ids, activity_ids)
        print(f"  +{n_fav} favorites")

        print("Seeding donations...")
        n_don = seed_donations(conn, donee_ids, activity_ids)
        print(f"  +{n_don} donations")

        print_counts(conn, "AFTER")
        print("\nDone. Seeded accounts: fundraiserNN@gmail.com, doneeNN@gmail.com, pmNN@gmail.com.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
