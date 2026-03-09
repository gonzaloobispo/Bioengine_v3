import sqlite3
from pathlib import Path

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')

def query_july():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--- Actividades de Julio 2024 en la DB actual ---")
    cursor.execute("""
        SELECT id, fecha, tipo, nombre, distancia_km, duracion_min, fuente 
        FROM activities 
        WHERE fecha LIKE '2024-07%'
        ORDER BY fecha
    """)
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    
    conn.close()

if __name__ == "__main__":
    query_july()
