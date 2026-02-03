import sqlite3
import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from config import DB_PATH

def audit_data():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=== AUDITORÍA DE DATOS DE BIOENGINE V3 ===\n")
    
    # 1. Auditoría de Actividades
    print("--- Actividades (Posibles Incompletas) ---")
    activities = cursor.execute("SELECT * FROM activities").fetchall()
    incomplete_act = 0
    for act in activities:
        missing = []
        if not act['distancia_km'] or act['distancia_km'] == 0: missing.append("distancia")
        if not act['duracion_min'] or act['duracion_min'] == 0: missing.append("duración")
        if not act['calorias'] or act['calorias'] == 0: missing.append("calorías")
        if not act['tipo']: missing.append("tipo")
        
        if missing:
            incomplete_act += 1
            print(f"ID {act['id']} | Fecha: {act['fecha']} | Faltan: {', '.join(missing)}")
    
    if incomplete_act == 0:
        print("Todas las actividades parecen tener datos básicos.")
    
    # 2. Auditoría de Biometría
    print("\n--- Biometría (Peso/Grasa) ---")
    biometrics = cursor.execute("SELECT * FROM biometrics").fetchall()
    incomplete_bio = 0
    for bio in biometrics:
        if not bio['peso'] or bio['peso'] == 0:
            incomplete_bio += 1
            print(f"ID {bio['id']} | Fecha: {bio['fecha']} | Error: Peso ausente o Cero")
    
    if incomplete_bio == 0:
        print("Todos los registros biométricos tienen peso.")

    # 3. Auditoría de Contexto (JSON check)
    print("\n--- Validación de Formato JSON en user_context ---")
    contexts = cursor.execute("SELECT key, value_json FROM user_context").fetchall()
    for ctx in contexts:
        try:
            json.loads(ctx['value_json'])
        except Exception as e:
            print(f"Error en Key '{ctx['key']}': JSON inválido -> {e}")

    conn.close()

if __name__ == "__main__":
    audit_data()
