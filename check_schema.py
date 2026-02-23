
import sqlite3

try:
    conn = sqlite3.connect(r'c:\BioEngine_V3\bioengine.db')
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_health'")
    schema = cursor.fetchone()
    if schema:
        print(f"Schema for daily_health: {schema[0]}")
    else:
        print("Table daily_health not found.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
