import sqlite3
from pathlib import Path

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')

def list_zero_km():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--- Actividades con 0 km que deberían tener distancia ---")
    query = """
        SELECT fuente, tipo, SUBSTR(fecha, 1, 7) as mes, COUNT(*) 
        FROM activities 
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND (LOWER(tipo) LIKE '%running%' 
             OR LOWER(tipo) LIKE '%carrera%' 
             OR LOWER(tipo) LIKE '%caminata%' 
             OR LOWER(tipo) LIKE '%walking%' 
             OR LOWER(tipo) LIKE '%tenis%' 
             OR LOWER(tipo) LIKE '%tennis%'
             OR LOWER(tipo) LIKE '%cycling%'
             OR LOWER(tipo) LIKE '%bici%')
        GROUP BY fuente, tipo, mes 
        ORDER BY mes DESC
    """
    rows = cursor.execute(query).fetchall()
    for row in rows:
        print(row)
    
    conn.close()

if __name__ == "__main__":
    list_zero_km()
