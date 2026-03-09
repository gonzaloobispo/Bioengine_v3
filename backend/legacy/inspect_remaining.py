import sqlite3
from pathlib import Path

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')

def inspect_remaining():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    query = """
        SELECT id, fecha, tipo, fuente 
        FROM activities 
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND (LOWER(tipo) LIKE '%running%' 
             OR LOWER(tipo) LIKE '%carrera%' 
             OR LOWER(tipo) LIKE '%caminata%' 
             OR LOWER(tipo) LIKE '%walking%' 
             OR LOWER(tipo) LIKE '%tenis%' 
             OR LOWER(tipo) LIKE '%tennis%')
        ORDER BY fecha DESC
    """
    rows = cursor.execute(query).fetchall()
    for row in rows:
        print(row)
    
    conn.close()

if __name__ == "__main__":
    inspect_remaining()
