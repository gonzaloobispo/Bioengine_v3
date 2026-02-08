import sqlite3
import os

db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT provider, api_key, enabled, priority FROM api_keys")
    rows = cursor.fetchall()
    print("API Keys in DB:")
    for row in rows:
        provider, key, enabled, priority = row
        # Mask the key
        masked_key = key[:5] + "..." + key[-5:] if len(key) > 10 else "SHORT_KEY"
        print(f"Provider: {provider}, Enabled: {enabled}, Priority: {priority}, Key: {masked_key}")
    conn.close()
else:
    print(f"DB not found at {db_path}")
