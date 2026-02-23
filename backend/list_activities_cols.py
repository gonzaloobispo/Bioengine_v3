import sqlite3
import json

def list_cols():
    conn = sqlite3.connect('db/bioengine_v3.db')
    cursor = conn.cursor()
    cursor.execute('PRAGMA table_info(activities)')
    cols = [row[1] for row in cursor.fetchall()]
    print(json.dumps(cols, indent=2))
    conn.close()

if __name__ == "__main__":
    list_cols()
