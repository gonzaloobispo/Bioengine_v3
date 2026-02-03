import sqlite3
import sys
import os
from datetime import datetime, timedelta
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from config import DB_PATH

def find_overlaps_and_merge():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Buscar registros de "Apple" con datos en cero o nulos
    # Nota: Usamos LIKE por si figura como 'Apple Health', 'AppleWatch', etc.
    apple_query = """
    SELECT * FROM activities 
    WHERE (fuente LIKE '%Apple%' OR fuente IS NULL OR fuente = '')
      AND (distancia_km = 0 OR distancia_km IS NULL OR calorias = 0 OR calorias IS NULL)
    """
    apple_records = cursor.execute(apple_query).fetchall()
    
    print(f"Buscando coincidencias para {len(apple_records)} registros de Apple incompletos...")
    
    merges_found = 0
    
    for apple in apple_records:
        # Convertir fecha a objeto datetime para comparar
        # Asumimos formato ISO o similar: 2026-01-30T17:24:48 o 2026-01-30 17:24:48
        try:
            a_date = datetime.fromisoformat(apple['fecha'].replace(' ', 'T'))
        except:
            continue
            
        # Buscar en Runkeeper (u otros) en una ventana de +/- 5 minutos
        start_win = (a_date - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
        end_win = (a_date + timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
        
        # Corregir formato para SQLite (reemplazar T por espacio si es necesario)
        start_win = start_win.replace('T', ' ')
        end_win = end_win.replace('T', ' ')

        runkeeper_query = """
        SELECT * FROM activities 
        WHERE fuente LIKE '%Runkeeper%'
          AND fecha BETWEEN ? AND ?
          AND (distancia_km > 0 AND duracion_min > 0)
        """
        rk_match = cursor.execute(runkeeper_query, (start_win, end_win)).fetchone()
        
        if rk_match:
            merges_found += 1
            print(f"\n[COINCIDENCIA ENCONTRADA]")
            print(f" -> Apple (ID {apple['id']}): {apple['fecha']} | {apple['tipo']} | Dist: {apple['distancia_km']}")
            print(f" -> Runkeeper (ID {rk_match['id']}): {rk_match['fecha']} | {rk_match['tipo']} | Dist: {rk_match['distancia_km']} | Cal: {rk_match['calorias']}")
            
            # Unificar: Actualizar el de Apple con los mejores datos y luego podríamos borrar el de Runkeeper
            # O mejor, actualizar Runkeeper con los datos de Apple si este tiene algo mejor (raro si Apple está en 0)
            # En este caso, el de Runkeeper parece ser el "maestro".
            
            # Decisión: Vamos a actualizar el registro que tenga más datos y eliminar el duplicado.
            best_dist = max(apple['distancia_km'] or 0, rk_match['distancia_km'] or 0)
            best_dur = max(apple['duracion_min'] or 0, rk_match['duracion_min'] or 0)
            best_cal = max(apple['calorias'] or 0, rk_match['calorias'] or 0)
            
            # Actualizamos el de Runkeeper (maestro) y marcamos el de Apple para borrar
            cursor.execute("""
                UPDATE activities 
                SET distancia_km = ?, duracion_min = ?, calorias = ?, fuente = ?
                WHERE id = ?
            """, (best_dist, best_dur, best_cal, f"{rk_match['fuente']} + Apple", rk_match['id']))
            
            cursor.execute("DELETE FROM activities WHERE id = ?", (apple['id'],))
            print(f" ✅ Unificado en ID {rk_match['id']}. ID {apple['id']} eliminado.")

    conn.commit()
    print(f"\nProceso finalizado. Se unificaron {merges_found} registros.")
    conn.close()

if __name__ == "__main__":
    find_overlaps_and_merge()
