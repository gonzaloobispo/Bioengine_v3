import os
import sqlite3
from openai import OpenAI

# Get API key
db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"
api_key = None
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT api_key FROM api_keys WHERE provider = 'openai' AND enabled = 1")
    row = cursor.fetchone()
    if row: api_key = row[0]
    conn.close()

if not api_key:
    from dotenv import load_dotenv
    load_dotenv("c:\\BioEngine_V3\\.env")
    api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("Error: No OpenAI key found.")
    exit(1)

client = OpenAI(api_key=api_key)

print(f"Testing OpenAI with key: {api_key[:10]}...")
try:
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Hola, di 'OK'"}],
        max_tokens=10
    )
    print(f"RESULT: {response.choices[0].message.content.strip()}")
except Exception as e:
    print(f"ERROR: {e}")
