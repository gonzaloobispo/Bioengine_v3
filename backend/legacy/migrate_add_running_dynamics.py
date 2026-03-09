import sqlite3
import sys
from pathlib import Path

# Add backend to path to import config
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def migrate():
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    new_columns = [
        ("running_power_avg", "REAL"),
        ("running_power_max", "REAL"),
        ("vertical_oscillation", "REAL"),
        ("ground_contact_time", "REAL"),
        ("stride_length", "REAL"),
        ("vertical_ratio", "REAL")
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE activities ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e).lower():
                print(f"Column '{col_name}' already exists. Skipping.")
            else:
                print(f"Error adding '{col_name}': {e}")
                
    conn.commit()
    conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate()
