"""Entity layer: database connection + schema init."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "app.sqlite"


def _ensure_fra_amount_raised_column(conn):
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(FRA)").fetchall()}
    if "amount_raised" not in cols:
        conn.execute(
            "ALTER TABLE FRA ADD COLUMN amount_raised REAL NOT NULL DEFAULT 0"
        )


def _ensure_donee_donation_nullable_account(conn):
    cols = conn.execute("PRAGMA table_info(donee_donation)").fetchall()
    acc = next((c for c in cols if c[1] == "account_id"), None)
    if acc is None or acc[3] == 0:
        return
    conn.execute("PRAGMA foreign_keys=OFF")
    conn.executescript(
        """
        CREATE TABLE donee_donation_mig (
            donation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER,
            activity_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            donated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (account_id) REFERENCES user_account (account_id),
            FOREIGN KEY (activity_id) REFERENCES FRA (activity_id)
        );
        INSERT INTO donee_donation_mig (donation_id, account_id, activity_id, amount, donated_at)
        SELECT donation_id, account_id, activity_id, amount, donated_at FROM donee_donation;
        DROP TABLE donee_donation;
        ALTER TABLE donee_donation_mig RENAME TO donee_donation;
        """
    )
    conn.execute("PRAGMA foreign_keys=ON")


SCHEMA = """
CREATE TABLE IF NOT EXISTS user_profile (
    profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_name TEXT NOT NULL,
    description TEXT,
    access_control TEXT,
    is_suspended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_account (
    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    profile_id INTEGER NOT NULL,
    is_suspended INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (profile_id) REFERENCES user_profile (profile_id)
);

CREATE TABLE IF NOT EXISTS category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL,
    description TEXT,
    is_suspended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS FRA (
    activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_name TEXT NOT NULL,
    category_id INTEGER,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    duration TEXT,
    target_amount REAL,
    amount_raised REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    account_id INTEGER NOT NULL,
    is_suspended INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES category (category_id),
    FOREIGN KEY (account_id) REFERENCES user_account (account_id)
);

CREATE TABLE IF NOT EXISTS donee_favorite (
    favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, activity_id),
    FOREIGN KEY (account_id) REFERENCES user_account (account_id),
    FOREIGN KEY (activity_id) REFERENCES FRA (activity_id)
);

CREATE TABLE IF NOT EXISTS donee_donation (
    donation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    activity_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    donated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES user_account (account_id),
    FOREIGN KEY (activity_id) REFERENCES FRA (activity_id)
);
"""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_default_data(conn):
    row = conn.execute(
        "SELECT profile_id FROM user_profile WHERE profile_name = ?",
        ("User Admin",),
    ).fetchone()
    if not row:
        conn.execute(
            """
            INSERT INTO user_profile (profile_name, description, access_control)
            VALUES (?, ?, ?)
            """,
            ("User Admin", "Default administrator profile", "all"),
        )
        user_admin_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    else:
        user_admin_id = row["profile_id"]

    if not conn.execute(
        "SELECT 1 FROM user_account WHERE email = ?",
        ("admin@gmail.com",),
    ).fetchone():
        conn.execute(
            """
            INSERT INTO user_account (name, email, password, profile_id)
            VALUES (?, ?, ?, ?)
            """,
            ("User Admin", "admin@gmail.com", "qwertyui", user_admin_id),
        )

    row_donee = conn.execute(
        "SELECT profile_id FROM user_profile WHERE profile_name = ?",
        ("Donee",),
    ).fetchone()
    if not row_donee:
        conn.execute(
            """
            INSERT INTO user_profile (profile_name, description, access_control)
            VALUES (?, ?, ?)
            """,
            ("Donee", "Browse and save fundraising activities.", None),
        )
        donee_profile_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    else:
        donee_profile_id = row_donee["profile_id"]

    if not conn.execute(
        "SELECT 1 FROM user_account WHERE email = ?",
        ("donee@gmail.com",),
    ).fetchone():
        conn.execute(
            """
            INSERT INTO user_account (name, email, password, profile_id)
            VALUES (?, ?, ?, ?)
            """,
            ("Demo Donee", "donee@gmail.com", "qwertyui", donee_profile_id),
        )


def _ensure_user_profile_unique_normalized_name_index(conn):
    """Enforce unique profile names (trim + case-insensitive) at the DB layer."""
    if conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        ("ux_user_profile_name_normalized",),
    ).fetchone():
        return
    dup = conn.execute(
        """
        SELECT 1 FROM (
            SELECT lower(trim(profile_name)) AS n
            FROM user_profile
            GROUP BY lower(trim(profile_name))
            HAVING COUNT(*) > 1
        )
        LIMIT 1
        """
    ).fetchone()
    if dup:
        return
    try:
        conn.execute(
            """
            CREATE UNIQUE INDEX ux_user_profile_name_normalized
            ON user_profile (lower(trim(profile_name)))
            """
        )
    except sqlite3.OperationalError:
        return


def _ensure_user_account_unique_normalized_email_index(conn):
    """Enforce unique account emails (trim + case-insensitive) at the DB layer."""
    if conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        ("ux_user_account_email_normalized",),
    ).fetchone():
        return
    dup = conn.execute(
        """
        SELECT 1 FROM (
            SELECT lower(trim(email)) AS e
            FROM user_account
            GROUP BY lower(trim(email))
            HAVING COUNT(*) > 1
        )
        LIMIT 1
        """
    ).fetchone()
    if dup:
        return
    try:
        conn.execute(
            """
            CREATE UNIQUE INDEX ux_user_account_email_normalized
            ON user_account (lower(trim(email)))
            """
        )
    except sqlite3.OperationalError:
        return


def _ensure_user_account_unique_normalized_username_index(conn):
    """Enforce unique account usernames (name column, trim + case-insensitive)."""
    if conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        ("ux_user_account_username_normalized",),
    ).fetchone():
        return
    dup = conn.execute(
        """
        SELECT 1 FROM (
            SELECT lower(trim(name)) AS n
            FROM user_account
            GROUP BY lower(trim(name))
            HAVING COUNT(*) > 1
        )
        LIMIT 1
        """
    ).fetchone()
    if dup:
        return
    try:
        conn.execute(
            """
            CREATE UNIQUE INDEX ux_user_account_username_normalized
            ON user_account (lower(trim(name)))
            """
        )
    except sqlite3.OperationalError:
        return


def _ensure_category_unique_normalized_name_index(conn):
    """Enforce unique category names (trim + case-insensitive) at the DB layer."""
    if conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        ("ux_category_name_normalized",),
    ).fetchone():
        return
    dup = conn.execute(
        """
        SELECT 1 FROM (
            SELECT lower(trim(category_name)) AS n
            FROM category
            GROUP BY lower(trim(category_name))
            HAVING COUNT(*) > 1
        )
        LIMIT 1
        """
    ).fetchone()
    if dup:
        return
    try:
        conn.execute(
            """
            CREATE UNIQUE INDEX ux_category_name_normalized
            ON category (lower(trim(category_name)))
            """
        )
    except sqlite3.OperationalError:
        return


def init_db():
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        cols = {
            r["name"]
            for r in conn.execute("PRAGMA table_info(user_profile)").fetchall()
        }
        if "is_suspended" not in cols:
            conn.execute(
                "ALTER TABLE user_profile ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0"
            )

        account_cols = {
            r["name"]
            for r in conn.execute("PRAGMA table_info(user_account)").fetchall()
        }
        if "is_suspended" not in account_cols:
            conn.execute(
                "ALTER TABLE user_account ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0"
            )

        category_cols = {
            r["name"] for r in conn.execute("PRAGMA table_info(category)").fetchall()
        }
        if not category_cols:
            # table may not exist in older DB; create it
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS category (
                    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_name TEXT NOT NULL,
                    description TEXT,
                    is_suspended INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            category_cols = {
                r["name"]
                for r in conn.execute("PRAGMA table_info(category)").fetchall()
            }
        if "is_suspended" not in category_cols:
            conn.execute(
                "ALTER TABLE category ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0"
            )

        fra_cols = {
            r["name"] for r in conn.execute("PRAGMA table_info(FRA)").fetchall()
        }
        if "is_suspended" not in fra_cols:
            conn.execute(
                "ALTER TABLE FRA ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0"
            )
        if "category_id" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN category_id INTEGER")
        if "description" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN description TEXT")
        if "duration" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN duration TEXT")
        if "start_date" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN start_date TEXT")
        if "end_date" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN end_date TEXT")
        if "target_amount" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN target_amount REAL")
        if "status" not in fra_cols:
            conn.execute("ALTER TABLE FRA ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
        if "view_count" not in fra_cols:
            conn.execute(
                "ALTER TABLE FRA ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0"
            )
        # FRA status: only active | completed | suspended (migrate legacy values).
        conn.execute(
            """
            UPDATE FRA
            SET status = 'completed'
            WHERE LOWER(TRIM(COALESCE(status, ''))) = 'expired'
            """
        )
        conn.execute(
            """
            UPDATE FRA
            SET status = 'suspended'
            WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
            """
        )

        # Backward-compat: if older column 'category' exists, keep it (do not drop),
        # but new code will use category_id.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS donee_favorite (
                favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                activity_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(account_id, activity_id),
                FOREIGN KEY (account_id) REFERENCES user_account (account_id),
                FOREIGN KEY (activity_id) REFERENCES FRA (activity_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS donee_donation (
                donation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER,
                activity_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                donated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (account_id) REFERENCES user_account (account_id),
                FOREIGN KEY (activity_id) REFERENCES FRA (activity_id)
            )
            """
        )
        _ensure_fra_amount_raised_column(conn)
        _ensure_donee_donation_nullable_account(conn)
        _ensure_default_data(conn)
        _ensure_user_profile_unique_normalized_name_index(conn)
        _ensure_user_account_unique_normalized_email_index(conn)
        _ensure_user_account_unique_normalized_username_index(conn)
        _ensure_category_unique_normalized_name_index(conn)
        from backend.entity.fra import apply_fra_auto_completed

        apply_fra_auto_completed(conn)
        conn.commit()
    finally:
        conn.close()
