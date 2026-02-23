
import sqlite3
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def check_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='activities'")
    schema = cursor.fetchone()[0]
    print(schema)
    conn.close()

if __name__ == "__main__":
    check_schema()
