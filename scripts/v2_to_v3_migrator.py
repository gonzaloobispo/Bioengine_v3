import sqlite3
import pandas as pd
import os
import json
from datetime import datetime

# Configuración de rutas
V2_PATH = r"c:\BioEngine_Gonzalo"
V3_PATH = r"c:\BioEngine_V3"
DB_PATH = os.path.join(V3_PATH, "db\bioengine_v3.db")

def create_schema(conn):
    cursor = conn.cursor()
    
    # Tabla de Actividades
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATETIME,
        tipo TEXT,
        distancia_km REAL,
        duracion_min REAL,
        calorias REAL,
        fc_media INTEGER,
        fc_max INTEGER,
        elevacion_m REAL,
        cadencia_media INTEGER,
        calzado TEXT,
        evento_nombre TEXT,
        stress_score REAL,
        fuente TEXT
    )
    ''')
    
    # Tabla de Peso
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS biometrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATETIME,
        peso REAL,
        grasa_pct REAL,
        masa_muscular_kg REAL,
        fuente TEXT
    )
    ''')
    
    # Tabla de Contexto / Config
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_context (
        key TEXT PRIMARY KEY,
        value_json TEXT,
        updated_at DATETIME
    )
    ''')
    
    conn.commit()

def migrate_sport_data(conn):
    csv_path = os.path.join(V2_PATH, "data_processed", "historial_deportivo_total_full.csv")
    if not os.path.exists(csv_path):
        # Intentar ruta alternativa
        csv_path = os.path.join(V2_PATH, "historial_deportivo_total.csv")
        
    if os.path.exists(csv_path):
        print(f"Migrando actividades desde {csv_path}...")
        df = pd.read_csv(csv_path, sep=';')
        
        # Limpiar datos para SQLite
        df['Fecha'] = pd.to_datetime(df['Fecha'])
        
        # Mapeo de columnas a nombres internos si es necesario
        # df.rename(columns={...}, inplace=True)
        
        # Insertar en bloques para eficiencia
        for idx, row in df.iterrows():
            conn.execute('''
            INSERT INTO activities (fecha, tipo, distancia_km, duracion_min, calorias, fc_media, fc_max, elevacion_m, cadencia_media, fuente)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row.get('Fecha').isoformat() if hasattr(row.get('Fecha'), 'isoformat') else row.get('Fecha'), 
                row.get('Tipo'), 
                row.get('Distancia (km)'), 
                row.get('Duracion (min)'), 
                row.get('Calorias'),
                row.get('FC Media'),
                row.get('FC Max'),
                row.get('Elevacion (m)'),
                row.get('Cadencia_Media'),
                row.get('Fuente')
            ))
        print(f"DONE: {len(df)} actividades migradas.")
    else:
        print("ERROR: No se encontró el archivo maestro de deportes.")

def migrate_weight_data(conn):
    csv_path = os.path.join(V2_PATH, "data_processed", "historial_completo_peso_full.csv")
    if os.path.exists(csv_path):
        print(f"Migrando biometría desde {csv_path}...")
        df = pd.read_csv(csv_path, sep=';')
        df['Fecha'] = pd.to_datetime(df['Fecha'])
        
        for idx, row in df.iterrows():
            conn.execute('''
            INSERT INTO biometrics (fecha, peso, grasa_pct, masa_muscular_kg, fuente)
            VALUES (?, ?, ?, ?, ?)
            ''', (
                row.get('Fecha').isoformat() if hasattr(row.get('Fecha'), 'isoformat') else row.get('Fecha'),
                row.get('Peso'),
                row.get('Grasa_Pct'),
                row.get('Masa_Muscular_Kg'),
                row.get('Fuente')
            ))
        print(f"DONE: {len(df)} registros de peso migrados.")

def migrate_context(conn):
    json_path = os.path.join(V2_PATH, "sync_data", "user_context.json")
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            conn.execute('INSERT INTO user_context (key, value_json, updated_at) VALUES (?, ?, ?)',
                        ('main_context', json.dumps(data), datetime.now().isoformat()))
        print("DONE: Contexto de usuario migrado.")

def main():
    if not os.path.exists(V3_PATH):
        os.makedirs(V3_PATH)
        
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH) # Empezar de cero para evitar duplicados en la prueba
        
    conn = sqlite3.connect(DB_PATH)
    try:
        create_schema(conn)
        migrate_sport_data(conn)
        migrate_weight_data(conn)
        migrate_context(conn)
        conn.commit()
        print("\nSUCCESS: MIGRACION COMPLETADA EXITOSAMENTE.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
