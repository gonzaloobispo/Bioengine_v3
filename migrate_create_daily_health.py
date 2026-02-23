"""
Migración: Crear tabla daily_health
Crea la tabla daily_health para almacenar datos de salud diarios de Garmin
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('db/bioengine_v3.db')
    c = conn.cursor()
    
    print("🔄 Verificando tabla daily_health...")
    
    # Verificar si la tabla ya existe
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_health'")
    exists = c.fetchone()
    
    if exists:
        print("  ✅ Tabla daily_health ya existe")
        conn.close()
        return
    
    print("  ➕ Creando tabla daily_health...")
    
    c.execute('''
        CREATE TABLE daily_health (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATE UNIQUE NOT NULL,
            sleep_hours REAL,
            hrv_value REAL,
            readiness_score REAL,
            body_battery INTEGER,
            resting_hr INTEGER,
            stress_level INTEGER,
            spo2_avg INTEGER,
            spo2_min INTEGER,
            respiration_avg REAL,
            floors_ascended REAL
        )
    ''')
    
    conn.commit()
    conn.close()
    
    print("✅ Tabla daily_health creada exitosamente")
    print("   Ahora puedes sincronizar datos de salud desde Garmin")

if __name__ == '__main__':
    migrate()
