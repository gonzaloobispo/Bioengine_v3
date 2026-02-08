import os
import sqlite3
from google import genai
import time

# Get API key
db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"
api_key = None
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT api_key FROM api_keys WHERE provider = 'gemini' AND enabled = 1")
    row = cursor.fetchone()
    if row: api_key = row[0]
    conn.close()

if not api_key:
    from dotenv import load_dotenv
    load_dotenv("c:\\BioEngine_V3\\.env")
    api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

print(f"Testing Gemini Flash Latest with key: {api_key[:10]}...")
try:
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents="Hola, responde 'SISTEMA OPERATIVO'"
    )
    print(f"RESULT: {response.text.strip()}")
except Exception as e:
    print(f"ERROR: {e}")
