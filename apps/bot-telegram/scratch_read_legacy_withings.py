import sqlite3
import json

try:
    conn = sqlite3.connect(r'c:\BioEngine_V3\_legacy\db\bioengine_v3.db')
    cur = conn.cursor()
    cur.execute("SELECT service, credentials_json FROM secrets")
    rows = cur.fetchall()
    for row in rows:
        print(f"Service: {row[0]}")
        print(f"Data: {row[1]}")
        print("-" * 20)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
