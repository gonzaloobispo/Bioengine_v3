import os
import sqlite3
import json
from google import genai

# Setup
db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"
api_key = None
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT api_key FROM api_keys WHERE provider = 'gemini' AND enabled = 1")
        row = cursor.fetchone()
        if row: api_key = row[0]
        conn.close()
    except Exception as e:
        print(f"Error reading DB: {e}")

if not api_key:
    from dotenv import load_dotenv
    load_dotenv("c:\\BioEngine_V3\\.env")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: No GEMINI_API_KEY found.")
    exit(1)

client = genai.Client(api_key=api_key)

models_to_test = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash", "gemini-1.5-flash-002", "gemini-2.5-flash"]

for model_name in models_to_test:
    print(f"\nTesting model: {model_name}")
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Say 'OK' if you can read this."
        )
        print(f"  SUCCESS: {response.text.strip()}")
    except Exception as e:
        print(f"  FAILED: {e}")
