import sqlite3
import csv
import os
from pathlib import Path

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')
BACKUP_PATH = Path('c:/BioEngine_V3/backend/backup_registros_eliminados_sin_datos.csv')

def purge_empty_activities():
    if not DB_PATH.exists():
        print("Base de datos no encontrada.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Identificar registros a eliminar (0 distancia Y 0 calorías)
    # Excluimos tipos que NO suelen tener métricas como "Respiración" si quieres, 
    # pero el usuario pidió eliminar los que "no tienen datos".
    query_select = """
        SELECT id, fecha, tipo, fuente, distancia_km, calorias, duracion_min 
        FROM activities 
        WHERE (distancia_km = 0 OR distancia_km IS NULL)
        AND (calorias = 0 OR calorias IS NULL)
    """
    to_delete = cursor.execute(query_select).fetchall()
    
    if not to_delete:
        print("No se encontraron registros vacíos para eliminar.")
        conn.close()
        return

    # 2. Respaldar en CSV
    headers = ['ID', 'Fecha', 'Tipo', 'Fuente', 'Distancia (km)', 'Calorías', 'Duración (min)']
    with open(BACKUP_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(to_delete)
    
    print(f"Respaldo creado con {len(to_delete)} registros en: {BACKUP_PATH}")

    # 3. Eliminar de la base de datos
    ids_to_purge = [row[0] for row in to_delete]
    cursor.execute(f"DELETE FROM activities WHERE id IN ({','.join(['?']*len(ids_to_purge))})", ids_to_purge)
    
    conn.commit()
    print(f"Limpieza completada. Se eliminaron {cursor.rowcount} registros de la base de datos.")
    
    conn.close()

if __name__ == "__main__":
    purge_empty_activities()
