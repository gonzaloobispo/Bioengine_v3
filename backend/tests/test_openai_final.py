import sqlite3
import os
from openai import OpenAI

db_path = "c:/BioEngine_V3/db/bioengine_v3.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT api_key FROM api_keys WHERE provider = 'openai' AND enabled = 1")
    row = cursor.fetchone()
    if row:
        api_key = row[0]
        client = OpenAI(api_key=api_key)
        try:
            res = client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": "Ping"}], max_tokens=5)
            print(f"SUCCESS: {res.choices[0].message.content.strip()}")
        except Exception as e:
            print(f"FAILED: {e}")
    else:
        print("No OpenAI key in DB")
    conn.close()
else:
    print("DB not found")
