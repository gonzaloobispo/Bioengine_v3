import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')

def generate_report():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Report 1: Total distance per year
    print("# REPORTE DE VOLUMEN DE DATOS RECUPERADOS\n")
    print("## Distancia Total por Año (km)")
    query_years = """
        SELECT SUBSTR(fecha, 1, 4) as year, SUM(distancia_km), COUNT(*)
        FROM activities
        WHERE distancia_km > 0
        GROUP BY year
        ORDER BY year DESC
    """
    rows_years = cursor.execute(query_years).fetchall()
    print("| Año | Distancia Total | Sesiones con Distancia |")
    print("| :--- | :--- | :--- |")
    for row in rows_years:
        print(f"| {row[0]} | {row[1]:.2f} km | {row[2]} |")
    
    # Report 2: Top recovered types
    print("\n## Distribución por Tipo de Actividad")
    query_types = """
        SELECT tipo, SUM(distancia_km), COUNT(*)
        FROM activities
        WHERE distancia_km > 0
        GROUP BY tipo
        ORDER BY SUM(distancia_km) DESC
    """
    rows_types = cursor.execute(query_types).fetchall()
    print("| Tipo | Total km | Sesiones |")
    print("| :--- | :--- | :--- |")
    for row in rows_types:
        print(f"| {row[0]} | {row[1]:.2f} km | {row[2]} |")

    # Report 3: Count of remaining zero-km for context
    print("\n## Actividades Pendientes (0 km)")
    query_zeros = """
        SELECT tipo, COUNT(*)
        FROM activities
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND tipo IN ('Tenis', 'Running', 'Carrera', 'Caminata')
        GROUP BY tipo
    """
    rows_zeros = cursor.execute(query_zeros).fetchall()
    if rows_zeros:
        print("| Tipo | Sesiones sin Distancia |")
        print("| :--- | :--- | :--- |")
        for row in rows_zeros:
            print(f"| {row[0]} | {row[1]} |")
    else:
        print("*No quedan actividades críticas sin distancia.*")

    conn.close()

if __name__ == "__main__":
    generate_report()
