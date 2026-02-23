
import sqlite3
import os
import sys
from pathlib import Path

# Add backend to path to use config
sys.path.append(str(Path(__file__).parent))
from config import DB_PATH

def migrate():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check current columns
        cursor.execute("PRAGMA table_info(pain_logs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # 1. Add 'side' column if it doesn't exist
        if 'side' not in columns:
            print("Adding 'side' column to pain_logs...")
            cursor.execute("ALTER TABLE pain_logs ADD COLUMN side TEXT DEFAULT 'derecha'")
        else:
            print("'side' column already exists.")

        # 2. Add 'source' column if it doesn't exist
        if 'source' not in columns:
            print("Adding 'source' column to pain_logs...")
            cursor.execute("ALTER TABLE pain_logs ADD COLUMN source TEXT DEFAULT 'user_manual'")
        else:
            print("'source' column already exists.")

        # Update existing records to reflect they were manual/pre-migration if needed
        # (Already handled by DEFAULT values)

        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
