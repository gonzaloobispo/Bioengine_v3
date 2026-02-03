import sqlite3
import pandas as pd
import os
from datetime import datetime

DB_PATH = os.path.join(os.getcwd(), 'db', 'bioengine_v3.db')

def analyze_day_matches():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    
    # 1. Buscar registros de Apple que AUN sean sospechosos (distancia <= 0.1 o marcados como estimados recientemente)
    # Nota: Como ya corrimos el repair, muchos tendrán datos estimados. 
    # Buscaremos por fuente='Apple' y veremos chocar con otros del mismo día.
    
    print("🔍 Buscando posibles duplicados en el MISMO DÍA (ventana de 24hs)...")
    
    # Query: Apple vs No-Apple en el mismo día y mismo tipo
    query = """
    SELECT 
        a.id as apple_id, 
        a.fecha as apple_date, 
        a.duracion_min as apple_dur,
        a.tipo as apple_type,
        b.id as other_id, 
        b.fecha as other_date, 
        b.fuente as other_source,
        b.distancia_km as other_dist,
        (strftime('%s', a.fecha) - strftime('%s', b.fecha))/60 as diff_min
    FROM activities a
    JOIN activities b ON date(a.fecha) = date(b.fecha) AND a.tipo = b.tipo
    WHERE a.fuente = 'Apple' 
      AND b.fuente != 'Apple'
      AND a.id != b.id
    ORDER BY abs(diff_min) ASC
    """
    
    try:
        matches = pd.read_sql_query(query, conn)
    except Exception as e:
        print(f"Error SQL: {e}")
        return

    if matches.empty:
        print("✅ No se encontraron coincidencias adicionales en el mismo día.")
    else:
        print(f"⚠️  Se encontraron {len(matches)} posibles duplicados en el mismo día.")
        print("\nEjemplos encontrados:")
        print(matches.head(20).to_string(index=False))
        
        # Guardar para análisis
        matches.to_csv("docs/deep_duplicates_analysis.csv", index=False)
        print("\nReporte guardado en docs/deep_duplicates_analysis.csv")

    conn.close()

if __name__ == "__main__":
    analyze_day_matches()
