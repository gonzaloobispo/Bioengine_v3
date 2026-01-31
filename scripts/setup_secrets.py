import sqlite3
import os
import json

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def setup_sync_tables():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Tabla para Tokens y Credenciales
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS secrets (
        service TEXT PRIMARY KEY,
        credentials_json TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Tabla para Logs de Sincronización
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT,
        status TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Tabla para Logs Generales del Sistema y Pruebas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        description TEXT,
        data_json TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    conn.close()
    print("DONE: Tablas de secretos y logs creadas.")

def migrate_secrets():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Garmin (desde config.py hardcoded o env)
    garmin_creds = {
        "email": "gonzaloobispo@hotmail.com",
        "password": "Gob29041976$"
    }
    conn.execute('INSERT OR REPLACE INTO secrets (service, credentials_json) VALUES (?, ?)',
                 ('garmin', json.dumps(garmin_creds)))
    
    # 2. Withings (IDs y Secretos)
    withings_creds = {
        "client_id": "ab42901f472e68a9f8dc6503387ee3a28d9e6ce3b0c71c9a4b097550cb679ce8",
        "client_secret": "1cce12d853f3ba00bf06c23a3d776c6666e41bad4010d19dd3045091f3b393a4",
        "redirect_uri": "http://localhost:8080/"
    }
    conn.execute('INSERT OR REPLACE INTO secrets (service, credentials_json) VALUES (?, ?)',
                 ('withings_app', json.dumps(withings_creds)))
    
    # 3. Withings Tokens (Si existen)
    tokens_v2_path = r"c:\BioEngine_Gonzalo\BioEngine_Master_Sync\Sistema_y_APIs\withings_tokens.json"
    if os.path.exists(tokens_v2_path):
        with open(tokens_v2_path, 'r') as f:
            tokens = json.load(f)
            conn.execute('INSERT OR REPLACE INTO secrets (service, credentials_json) VALUES (?, ?)',
                         ('withings_tokens', json.dumps(tokens)))
            print("DONE: Tokens de Withings migrados.")
            
    # 4. Gemini API Key
    gemini_path = r"c:\BioEngine_Gonzalo\BioEngine_Master_Sync\Sistema_y_APIs\secrets.json"
    if os.path.exists(gemini_path):
        with open(gemini_path, 'r') as f:
            gemini_data = json.load(f)
            conn.execute('INSERT OR REPLACE INTO secrets (service, credentials_json) VALUES (?, ?)',
                         ('gemini', json.dumps(gemini_data)))
            print("DONE: API Key de Gemini migrada.")
            
    conn.commit()
    conn.close()
    print("DONE: Secretos migrados a la DB.")

if __name__ == "__main__":
    setup_sync_tables()
    migrate_secrets()
