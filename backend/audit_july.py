
import sqlite3

DB_PATH = 'C:/BioEngine_V3/db/bioengine_v3.db'

def audit_july_2024():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Search for activities around July 2024 with 0 distance
    cursor = conn.execute("""
        SELECT id, fecha, tipo, nombre, distancia_km, duracion_min, fc_media, fuente 
        FROM activities 
        WHERE fecha LIKE '2024-07%' 
        ORDER BY fecha DESC
    """)
    rows = cursor.fetchall()
    
    print(f"Audit Results for July 2024 ({len(rows)} activities):")
    for row in rows:
        print(f"Date: {row['fecha']} | Type: {row['tipo']} | Name: {row['nombre']} | Dist: {row['distancia_km']} | Dur: {row['duracion_min']} | Source: {row['fuente']}")
    
    conn.close()

if __name__ == "__main__":
    audit_july_2024()
