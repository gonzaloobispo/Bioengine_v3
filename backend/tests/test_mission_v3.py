import os
import sqlite3
import json
from google import genai

# Setup
db_path = "c:\\BioEngine_V3\\db\\bioengine_v3.db"
gemini_key = None
openai_key = None

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT provider, api_key FROM api_keys WHERE enabled = 1")
        rows = cursor.fetchall()
        for row in rows:
            if row[0] == 'gemini': gemini_key = row[1]
            if row[0] == 'openai': openai_key = row[1]
        conn.close()
    except Exception as e:
        print(f"Error reading DB: {e}")

# Gemini Test
if gemini_key:
    client = genai.Client(api_key=gemini_key)
    # The user wants Gemini 3 Pro Preview! 
    # From previous 'list_models', we saw 'models/gemini-3-pro-preview'
    models_to_test = ["gemini-3-pro-preview", "gemini-2.0-flash", "gemini-flash-latest"]
    
    for m in models_to_test:
        print(f"\n--- Testing Gemini Model: {m} ---")
        try:
            response = client.models.generate_content(model=m, contents="Ping")
            print(f"  SUCCESS: {response.text.strip()}")
            break # If one works, we are good
        except Exception as e:
            print(f"  FAILED {m}: {e}")
else:
    print("No Gemini key found.")

# OpenAI Test
if openai_key:
    print("\n--- Testing OpenAI (as fallback) ---")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Ping"}]
        )
        print(f"  SUCCESS OpenAI: {response.choices[0].message.content.strip()}")
    except ImportError:
        print("  FAILED: openai package not installed.")
    except Exception as e:
        print(f"  FAILED OpenAI: {e}")
