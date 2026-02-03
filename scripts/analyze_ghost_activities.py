import sqlite3
import pandas as pd
import os
import sys
from datetime import datetime, timedelta

# Asegurar path para imports si fuera necesario (aunque usaremos sqlite directo)
DB_PATH = os.path.join(os.getcwd(), 'db', 'bioengine_v3.db')

def analyze_ghosts():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    
    # 1. Buscar registros sospechosos de Apple
    # Criterio: Distancia casi nula O Calorías casi nulas O Duración muy corta
    query_bad = """
    SELECT id, fecha, tipo, distancia_km, duracion_min, calorias, fuente 
    FROM activities 
    WHERE fuente='Apple' 
      AND (distancia_km < 0.05 OR calorias < 5 OR duracion_min < 2)
    ORDER BY fecha DESC
    """
    
    try:
        bad_df = pd.read_sql_query(query_bad, conn)
    except Exception as e:
        print(f"Error reading DB: {e}")
        conn.close()
        return

    print(f"🔍 SCAN RESULT: Found {len(bad_df)} potential 'ghost' records from Apple.\n")
    
    if bad_df.empty:
        return

    print("Sample of bad records:")
    print(bad_df.head(5).to_string(index=False))
    print("-" * 50)
    print("Attempting to match with valid records (Runkeeper/Garmin) within +/- 15 mins...\n")

    matches = []
    
    for _, row in bad_df.iterrows():
        try:
            bad_date = datetime.fromisoformat(row['fecha'].replace('Z', ''))
        except ValueError:
            continue
            
        # Ventana de tiempo +/- 15 min
        t_start = (bad_date - timedelta(minutes=15)).isoformat()
        t_end = (bad_date + timedelta(minutes=15)).isoformat()
        
        # Buscar "salvadores"
        query_match = f"""
        SELECT id, fecha, tipo, distancia_km, duracion_min, calorias, fuente 
        FROM activities 
        WHERE fuente != 'Apple'
          AND fecha BETWEEN '{t_start}' AND '{t_end}'
          AND distancia_km > 0.1  -- Al menos 100m para considerarlo válido
          AND calorias > 10
        """
        
        match_df = pd.read_sql_query(query_match, conn)
        
        if not match_df.empty:
            best_match = match_df.iloc[0] # Tomar el primero por ahora
            matches.append({
                "ghost_id": row['id'],
                "ghost_date": row['fecha'],
                "ghost_source": row['fuente'],
                "match_id": best_match['id'],
                "match_source": best_match['fuente'],
                "match_data": f"{best_match['distancia_km']}km / {best_match['calorias']}kcal"
            })

    print(f"✅ MATCHING RESULT: Found {len(matches)} valid matches that can replace ghost records.")
    
    if matches:
        matches_df = pd.DataFrame(matches)
        print("\nProposed Merges (Ghost -> Valid Source):")
        print(matches_df[['ghost_date', 'ghost_source', 'match_source', 'match_data']].head(10).to_string(index=False))
        
        # Guardar parches propuestos en CSV para revisión si son muchos
        matches_df.to_csv("docs/proposed_merges.csv", index=False)
        print(f"\nSaved full proposal to docs/proposed_merges.csv")

    conn.close()

if __name__ == "__main__":
    analyze_ghosts()
