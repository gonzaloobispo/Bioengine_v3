import sqlite3
import os

db_path = 'db/bioengine_v3.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("Creando tabla daily_health...")
c.execute('''
CREATE TABLE IF NOT EXISTS daily_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT UNIQUE,
    sleep_hours REAL,
    hrv_value REAL,
    readiness_score REAL,
    fuente TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Verificar si existe la columna cadencia_media en activities (ya existe, pero por si acaso)
c.execute("PRAGMA table_info(activities)")
columns = [r[1] for r in c.fetchall()]
if 'cadencia_media' not in columns:
    print("Añadiendo columna cadencia_media a activities...")
    c.execute("ALTER TABLE activities ADD COLUMN cadencia_media REAL")

conn.commit()
conn.close()
print("Migración completada con éxito.")
