import sqlite3
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from config import DB_PATH

def migrate_to_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Create evolutionary_memory table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evolutionary_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        lesson TEXT NOT NULL,
        context TEXT,
        source TEXT DEFAULT 'chat',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Create pain_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pain_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        level INTEGER NOT NULL,
        location TEXT DEFAULT 'Rodilla Derecha',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    print("Tables evolutionary_memory and pain_logs created or already exist.")
    
    # 3. Import from JSON files
    base_path = os.path.join(os.getcwd(), 'BioEngine_V3_Contexto_Base', 'data_cloud_sync')
    user_context_file = os.path.join(base_path, 'user_context.json')
    pain_file = os.path.join(base_path, 'dolor_rodilla.json')
    
    import json
    
    # Import Pain Logs
    if os.path.exists(pain_file):
        with open(pain_file, 'r', encoding='utf-8') as f:
            pain_data = json.load(f)
            registros = pain_data.get('registros', [])
            for r in registros:
                cursor.execute("""
                INSERT INTO pain_logs (date, level, notes)
                VALUES (?, ?, ?)
                """, (r.get('fecha'), r.get('nivel'), r.get('notas')))
            print(f"Imported {len(registros)} pain records.")

    # Import Evolutionary Memory
    if os.path.exists(user_context_file):
        with open(user_context_file, 'r', encoding='utf-8') as f:
            user_data = json.load(f)
            memories = user_data.get('conversaciones_relevantes', [])
            for m in memories:
                cursor.execute("""
                INSERT INTO evolutionary_memory (date, lesson, context)
                VALUES (?, ?, ?)
                """, (m.get('fecha'), m.get('aprendizaje'), m.get('contexto')))
            print(f"Imported {len(memories)} evolutionary memories.")
            
            # Key-value migration for the rest
            other_data = {k: v for k, v in user_data.items() if k != 'conversaciones_relevantes'}
            for key, val in other_data.items():
                cursor.execute("""
                INSERT OR REPLACE INTO user_context (key, value_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                """, (key, json.dumps(val, ensure_ascii=False)))
            print("Imported user profile and metadata to user_context table.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate_to_db()
