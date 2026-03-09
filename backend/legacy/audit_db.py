import sqlite3
import pandas as pd
from config import DB_PATH

def audit_database():
    conn = sqlite3.connect(DB_PATH)
    
    print("=== AUDITORÍA DE DATOS DE PRUEBA / OUTLIERS ===")
    
    # 1. Activities Audit
    print("\n[Actividades]")
    query_act = """
    SELECT id, fecha, nombre, fuente, tipo, distancia_km, duracion_min, fc_media 
    FROM activities
    """
    df_act = pd.read_sql_query(query_act, conn)
    print(f"Total actividades: {len(df_act)}")
    
    mock_names = df_act[df_act['nombre'].str.contains('test|prueba|mock|demo|ejemplo', case=False, na=False)]
    if not mock_names.empty:
        print(f"⚠️ Encontradas {len(mock_names)} actividades con nombres sospechosos (Test/Prueba):")
        print(mock_names[['id', 'fecha', 'nombre', 'fuente']].head())
    else:
        print("✅ No se detectaron nombres sospechosos (test/mock) en actividades.")
    
    zero_dist = df_act[(df_act['distancia_km'] == 0) & (df_act['tipo'].isin(['running', 'cycling']))]
    if not zero_dist.empty:
        print(f"⚠️ Encontradas {len(zero_dist)} actividades de cardio con distancia 0.0 km.")
        
    outlier_hr = df_act[df_act['fc_media'] > 210]
    if not outlier_hr.empty:
        print(f"⚠️ Encontradas {len(outlier_hr)} actividades con FC Media irreal (> 210 bpm).")

    print("\nÚltimas 5 actividades:")
    print(df_act.sort_values(by='fecha', ascending=False).head())

    # 2. Biometrics Audit
    print("\n[Biometría]")
    query_bio = "SELECT * FROM biometrics"
    df_bio = pd.read_sql_query(query_bio, conn)
    print(f"Total registros biometría: {len(df_bio)}")
    
    outlier_weight = df_bio[(df_bio['peso'] < 40) | (df_bio['peso'] > 150)]
    if not outlier_weight.empty:
        print(f"⚠️ Encontrados {len(outlier_weight)} registros de peso fuera de rango (40-150kg).")
        print(outlier_weight[['id', 'fecha', 'peso']].head())
    else:
        print("✅ No se detectaron pesos fuera de rango.")

    print("\nÚltimos 5 pesos:")
    print(df_bio.sort_values(by='fecha', ascending=False).head())

    # 3. Daily Health Audit
    print("\n[Salud Diaria]")
    query_health = "SELECT count(*) as count FROM daily_health"
    count_health = conn.execute(query_health).fetchone()[0]
    print(f"Registros en daily_health: {count_health}")
    
    conn.close()

if __name__ == "__main__":
    audit_database()
