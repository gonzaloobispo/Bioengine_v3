import sqlite3
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from config import DB_PATH

def check_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Checking DB at: {DB_PATH}")
    cursor.execute("PRAGMA table_info(activities);")
    columns = cursor.fetchall()
    print(f"\nSchema of activities:")
    for col in columns:
        print(f" - {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    check_schema()
