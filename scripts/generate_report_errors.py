import sqlite3
import pandas as pd
import os

DB_PATH = os.path.join(os.getcwd(), 'db', 'bioengine_v3.db')
OUTPUT_CSV = os.path.join(os.getcwd(), 'docs', 'report_registros_apple.csv')

def generate_error_report():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    
    # Cargar todos los datos relevantes para clasificar en Python con flexibilidad
    query = """
    SELECT 
        id, fecha, tipo, distancia_km, duracion_min, calorias, fuente, nombre
    FROM activities 
    ORDER BY fecha DESC
    """
    
    try:
        df = pd.read_sql_query(query, conn)
        
        # Definir Actividades
        DYNAMIC_SPORTS = [
            'Running', 'Carrera', 'Cycling', 'Ciclismo', 'Biking', 'Hiking', 'Senderismo', 
            'Walking', 'Caminata', 'Swimming', 'Natación', 'Tenis', 'Tennis', 'Paddle', 'Padel'
        ]
        
        def classify_status(row):
            # 1. Si ya fue reparado (tiene [Est]) -> OK Reparado
            if isinstance(row['nombre'], str) and '[Est]' in row['nombre']:
                return 'REPARADO (Estimado)'
            
            # 2. Verificar integridad básica
            dist = row['distancia_km'] if pd.notnull(row['distancia_km']) else 0
            cal = row['calorias'] if pd.notnull(row['calorias']) else 0
            tipo = row['tipo'] if pd.notnull(row['tipo']) else ""
            
            # 3. Regla por Tipo de Deporte
            es_dinamico = any(d.lower() in tipo.lower() for d in DYNAMIC_SPORTS)
            
            if es_dinamico:
                # Debe tener distancia. Si tiene casi 0 es Error.
                if dist < 0.05:
                    return 'ERROR (Falta Distancia)'
            else:
                # Deportes estáticos (Cardio, Yoga, etc) aceptan distancia 0
                pass

            # Regla de Calorías (general para todo deporte intenso, excluyendo Breathwork/Yoga suave)
            if cal < 5:
                 # Breathwork puede ser muy bajo, pero generalicemos advertencia
                 if 'breath' not in tipo.lower() and 'respiracion' not in tipo.lower():
                     return 'ADVERTENCIA (Sin Calorías)'

            return 'OK'

        df['estado'] = df.apply(classify_status, axis=1)
        
        # Separar en dos reportes
        pendientes_df = df[df['estado'].str.contains('ERROR|ADVERTENCIA')]
        reparados_df = df[df['estado'].str.contains('REPARADO')]
        
        # CSV PARA ACCIÓN DEL USUARIO (Pendientes)
        FILE_PENDIENTES = os.path.join(os.getcwd(), 'docs', 'report_pendientes_accion.csv')
        pendientes_df.to_csv(FILE_PENDIENTES, sep=';', index=False, encoding='utf-8-sig')
        
        # CSV INFORMATIVO (Reparados)
        FILE_REPARADOS = os.path.join(os.getcwd(), 'docs', 'report_reparados_info.csv')
        reparados_df.to_csv(FILE_REPARADOS, sep=';', index=False, encoding='utf-8-sig')
        
        print(f"\n✅ Reportes generados:")
        print(f"   1. {FILE_PENDIENTES} ({len(pendientes_df)} registros) -> PARA TU REVISIÓN")
        print(f"   2. {FILE_REPARADOS} ({len(reparados_df)} registros) -> INFORMATIVO")
        print("\nPrimeros 5 registros:")
        print(df.head().to_string(index=False))
        
    except Exception as e:
        print(f"Error generando reporte: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    generate_error_report()
