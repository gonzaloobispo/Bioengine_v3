import sqlite3
import pandas as pd
import os
import shutil
from datetime import datetime

DB_PATH = os.path.join(os.getcwd(), 'db', 'bioengine_v3.db')
BACKUP_PATH = os.path.join(os.getcwd(), 'db', 'bioengine_v3.backup_repair.db')

def backup_db():
    if os.path.exists(DB_PATH):
        shutil.copy(DB_PATH, BACKUP_PATH)
        print(f"✅ Backup created at {BACKUP_PATH}")
    else:
        print("❌ DB not found!")
        exit(1)

def get_connection():
    return sqlite3.connect(DB_PATH)

def step_1_merge_confirmed_duplicates(conn):
    """
    Fusiona el caso específico detectado o re-escanea buscando duplicados exactos de tiempo.
    En este caso, sabemos que el ID de Apple debe ser eliminado en favor del de Garmin.
    """
    print("\n--- Step 1: Merging Duplicates ---")
    cursor = conn.cursor()
    
    # Lógica de detección rápida: Ventana de 15 min, distinta fuente
    # Buscar pares Apple (malo) vs Otro (bueno)
    query = """
    SELECT a.id as bad_id, b.id as good_id, a.fecha, a.duracion_min, b.fuente as good_source
    FROM activities a
    JOIN activities b ON abs(strftime('%s', a.fecha) - strftime('%s', b.fecha)) < 900 -- 15 mins diff
    WHERE a.fuente = 'Apple' 
      AND (a.distancia_km < 0.1 OR a.calorias < 5)
      AND b.fuente != 'Apple'
      AND b.distancia_km > 0.1
    """
    
    rows = cursor.execute(query).fetchall()
    print(f"Found {len(rows)} duplicates to merge.")
    
    for row in rows:
        bad_id, good_id, date, dur, source = row
        print(f"Merging: Deleting Apple Activity {bad_id} ({date}, {dur}min) in favor of {source} {good_id}")
        cursor.execute("DELETE FROM activities WHERE id = ?", (bad_id,))
    
    conn.commit()

def step_2_repair_ghosts(conn):
    """
    Para los registros restantes de Apple con distancia 0:
    1. Calcular ritmo promedio por deporte.
    2. Estimar distancia y calorias.
    """
    print("\n--- Step 2: Repairing Ghost Activities ---")
    
    # A. Calcular promedios históricos (Benchmark)
    print("Calculating benchmarks from valid data...")
    query_bench = """
    SELECT tipo, 
           AVG(duracion_min / distancia_km) as avg_pace_min_km,
           AVG(calorias / duracion_min) as avg_cal_min
    FROM activities
    WHERE distancia_km > 0.5 AND duracion_min > 5 AND calorias > 0
    GROUP BY tipo
    """
    benchmarks = pd.read_sql_query(query_bench, conn)
    print(benchmarks)
    
    # Convertir a dict para acceso rápido
    pace_map = benchmarks.set_index('tipo')['avg_pace_min_km'].to_dict()
    cal_map = benchmarks.set_index('tipo')['avg_cal_min'].to_dict()
    
    # B. Buscar fantasmas para reparar
    query_ghosts = """
    SELECT id, tipo, duracion_min, nombre 
    FROM activities 
    WHERE fuente = 'Apple' 
      AND (distancia_km < 0.05 OR distancia_km IS NULL)
      AND duracion_min > 0
    """
    cursor = conn.cursor()
    ghosts = cursor.execute(query_ghosts).fetchall()
    
    print(f"\nFound {len(ghosts)} ghost activities to repair.")
    
    fixed_count = 0
    for g in ghosts:
        gid, tipo, dur, nombre = g
        
        # Obtener métricas de referencia (o defaults conservadores si es deporte nuevo)
        pace = pace_map.get(tipo, 8.0) # Default 8 min/km (trote suave/caminata)
        cal_rate = cal_map.get(tipo, 8.0) # Default 8 kcal/min (moderado)
        
        if pace <= 0: pace = 8.0 # Evitar div por cero locos
        
        est_dist = round(dur / pace, 2)
        est_cal = int(dur * cal_rate)
        
        new_name = f"{nombre} [Est]" if nombre else f"{tipo} [Est]"
        if "[Est]" in (nombre or ""): # Evitar doble etiqueta
             new_name = nombre

        cursor.execute("""
            UPDATE activities 
            SET distancia_km = ?, calorias = ?, nombre = ?
            WHERE id = ?
        """, (est_dist, est_cal, new_name, gid))
        
        fixed_count += 1
        
    print(f"✅ Repaired {fixed_count} activities.")
    conn.commit()

if __name__ == "__main__":
    backup_db()
    conn = get_connection()
    try:
        step_1_merge_confirmed_duplicates(conn)
        step_2_repair_ghosts(conn)
        print("\n🎉 Repair process completed successfully.")
    except Exception as e:
        print(f"\n❌ Error during repair: {e}")
        conn.rollback()
    finally:
        conn.close()
