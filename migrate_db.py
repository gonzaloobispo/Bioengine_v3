
import sqlite3
import os
import sys

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
try:
    from config import DB_PATH
except ImportError:
    # Fallback if import fails
    DB_PATH = r'c:\BioEngine_V3\db\bioengine_v3.db'

def init_db():
    print(f"Using database at: {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    
    # Create daily_health table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT UNIQUE NOT NULL,
        sleep_hours REAL,
        hrv_value REAL,
        readiness_score REAL,
        body_battery INTEGER,
        resting_hr INTEGER,
        stress_level INTEGER,
        spo2_avg INTEGER,
        spo2_min INTEGER,
        respiration_avg REAL,
        floors_ascended REAL,
        fuente TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    # Create activities table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        tipo TEXT,
        distancia_km REAL,
        duracion_min REAL,
        calorias INTEGER,
        fc_media REAL,
        fc_max REAL,
        elevacion_m REAL,
        cadencia_media REAL,
        fuente TEXT,
        nombre TEXT,
        training_load REAL,
        aerobic_te REAL,
        anaerobic_te REAL,
        training_effect_label TEXT,
        hr_zone_1 INTEGER,
        hr_zone_2 INTEGER,
        hr_zone_3 INTEGER,
        hr_zone_4 INTEGER,
        hr_zone_5 INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    # Create biometrics table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS biometrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        peso REAL,
        grasa_pct REAL,
        masa_muscular_kg REAL,
        fuente TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    # Create sync_logs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        service TEXT,
        status TEXT,
        message TEXT
    );
    ''')

    # Create system_logs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT,
        description TEXT,
        data_json TEXT
    );
    ''')
    
    print("MIGRATION: core tables created (or already existed).")
    
    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Tables in DB:", [t[0] for t in tables])
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
