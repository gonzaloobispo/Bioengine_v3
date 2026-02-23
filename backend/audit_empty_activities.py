import sqlite3
import csv
from pathlib import Path

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')
OUTPUT_PATH = Path('c:/BioEngine_V3/backend/actividades_sin_metricas.csv')

def audit_empty_activities():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Query for activities with 0/NULL distance AND 0/NULL calories
    query = """
        SELECT fecha, tipo, fuente, distancia_km, calorias, duracion_min 
        FROM activities 
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND (calorias = 0 OR calorias IS NULL)
        ORDER BY fecha DESC
    """
    
    rows = cursor.execute(query).fetchall()
    
    headers = ['Fecha', 'Tipo', 'Fuente', 'Distancia (km)', 'Calorías', 'Duración (min)']
    
    with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    
    print(f"Auditoría completada. Se encontraron {len(rows)} actividades sin distancia ni calorías.")
    print(f"Archivo guardado en: {OUTPUT_PATH}")
    
    # Show a summary of sources
    cursor.execute("""
        SELECT fuente, COUNT(*) 
        FROM activities 
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND (calorias = 0 OR calorias IS NULL)
        GROUP BY fuente
    """)
    summary = cursor.fetchall()
    print("\nResumen por Fuente:")
    for source, count in summary:
        print(f"- {source}: {count}")

    conn.close()

if __name__ == "__main__":
    audit_empty_activities()
