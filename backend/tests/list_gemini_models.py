import os
import json
import sqlite3
from google import genai

# Try to get API key from SQLite
db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"
api_key = None

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        # Check secrets table
        row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", ('gemini',)).fetchone()
        if row:
            data = json.loads(row['credentials_json'])
            if isinstance(data, dict):
                for key in ['GEMINI_API_KEY', 'api_key', 'key']:
                    if key in data:
                        api_key = data[key]
                        break
        
        # Check api_keys table if not found
        if not api_key:
            row = conn.execute("SELECT api_key FROM api_keys WHERE provider = 'gemini' AND enabled = 1").fetchone()
            if row:
                api_key = row['api_key']
        conn.close()
    except Exception as e:
        print(f"Error reading DB: {e}")

# Fallback to .env
if not api_key:
    from dotenv import load_dotenv
    load_dotenv("c:\\BioEngine_V3\\.env")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: No GEMINI_API_KEY found.")
    exit(1)

client = genai.Client(api_key=api_key)

try:
    print(f"Using API Key (first 5 chars): {api_key[:5]}...")
    for model in client.models.list():
        # print(f"DEBUG: {model}")
        print(f"- {model.name}")
except Exception as e:
    print(f"Error listing models: {e}")
