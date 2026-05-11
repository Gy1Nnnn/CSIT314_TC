import sqlite3
from pathlib import Path


def main() -> int:
    db_path = Path(__file__).resolve().parents[1] / "app.sqlite"
    if not db_path.exists():
        raise SystemExit(f"Database not found at: {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    with conn:
        old_profiles = conn.execute(
            "SELECT profile_id, profile_name FROM user_profile WHERE lower(profile_name) = lower(?)",
            ("Platform management",),
        ).fetchall()

        if not old_profiles:
            print('No profile named "Platform management" found. Nothing to remove.')
            return 0

        new_profile = conn.execute(
            "SELECT profile_id, profile_name FROM user_profile WHERE lower(profile_name) = lower(?)",
            ("Platform Manager",),
        ).fetchone()

        for p in old_profiles:
            old_id = p["profile_id"]
            referenced = conn.execute(
                "SELECT count(*) c FROM user_account WHERE profile_id = ?",
                (old_id,),
            ).fetchone()["c"]

            if referenced and new_profile is not None:
                conn.execute(
                    "UPDATE user_account SET profile_id = ? WHERE profile_id = ?",
                    (new_profile["profile_id"], old_id),
                )
                print(
                    f'Migrated {referenced} user_account row(s) from "{p["profile_name"]}" '
                    f'to "{new_profile["profile_name"]}".'
                )
            elif referenced:
                conn.execute("DELETE FROM user_account WHERE profile_id = ?", (old_id,))
                print(
                    f'Deleted {referenced} user_account row(s) that referenced "{p["profile_name"]}".'
                )

            conn.execute("DELETE FROM user_profile WHERE profile_id = ?", (old_id,))
            print(f'Removed profile "{p["profile_name"]}" (profile_id={old_id}).')

    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
