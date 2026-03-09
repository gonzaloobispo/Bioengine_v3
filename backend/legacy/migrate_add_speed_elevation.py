
import sqlite3
from config import DB_PATH

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if columns exist
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(activities)")]
    
    new_cols = {
        "velocidad_media": "REAL DEFAULT 0",
        "velocidad_maxima": "REAL DEFAULT 0",
        "elevacion_perdida": "REAL DEFAULT 0"
    }
    
    for col, definition in new_cols.items():
        if col not in columns:
            print(f"Adding column {col}...")
            cursor.execute(f"ALTER TABLE activities ADD COLUMN {col} {definition}")
            
    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
