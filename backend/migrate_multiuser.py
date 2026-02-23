import sqlite3
import sys
from pathlib import Path
import json

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def migrate_multiuser():
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create the `users` table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user',
            feature_flags TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("Checked/Created `users` table.")

    # 2. Insert Gonzalo as the primary admin user if not exists
    cursor.execute("SELECT id FROM users WHERE id = 1")
    if not cursor.fetchone():
        print("Inserting primary admin user (Gonzalo)...")
        # Note: password_hash should ideally be generated via passlib, but for now we put a placeholder
        # until the auth system is fully implemented and we can reset it.
        default_flags = json.dumps({
            "can_use_coach_ai": True,
            "can_use_advanced_analytics": True
        })
        cursor.execute('''
            INSERT INTO users (id, email, password_hash, name, role, feature_flags)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (1, 'gonzalo@bioengine.com', 'to_be_hashed', 'Gonzalo', 'admin', default_flags))
    else:
        print("Primary admin user already exists.")

    # 3. Add `user_id` to all private tables and assign existing rows to user 1
    private_tables = [
        'activities',
        'biometrics',
        'daily_health',
        'pain_logs',
        'training_plans',
        'user_context',
        'evolutionary_memory'
    ]

    for table in private_tables:
        # Check if user_id exists
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'user_id' not in columns:
            try:
                print(f"Adding user_id to {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER DEFAULT 1 REFERENCES users(id)")
                # Force existing records to 1 just in case default doesn't apply cleanly to all rows
                cursor.execute(f"UPDATE {table} SET user_id = 1 WHERE user_id IS NULL")
            except Exception as e:
                print(f"Error migrating {table}: {e}")
        else:
            print(f"Table {table} already has user_id.")

    conn.commit()
    conn.close()
    print("Multiuser Database Migration Completed Successfully.")

if __name__ == "__main__":
    migrate_multiuser()
