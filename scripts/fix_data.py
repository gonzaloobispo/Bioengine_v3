import sqlite3

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def fix_decimal_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    def clean_val(val):
        if val is None or val == "":
            return None
        if isinstance(val, str):
            # Limpiar posibles caracteres extra y cambiar coma por punto
            cleaned = val.replace(',', '.').strip()
            try:
                return float(cleaned)
            except:
                return None
        return val

    # Limpiar Biometrics
    rows = cursor.execute("SELECT id, peso, grasa_pct, masa_muscular_kg FROM biometrics").fetchall()
    for row in rows:
        id_val, peso, grasa, musculo = row
        cursor.execute('''
            UPDATE biometrics 
            SET peso = ?, grasa_pct = ?, masa_muscular_kg = ? 
            WHERE id = ?
        ''', (clean_val(peso), clean_val(grasa), clean_val(musculo), id_val))
            
    # Limpiar Activities
    rows = cursor.execute("SELECT id, distancia_km, duracion_min, calorias, elevacion_m, stress_score FROM activities").fetchall()
    for row in rows:
        id_val, dist, dur, cal, elev, stress = row
        cursor.execute('''
            UPDATE activities 
            SET distancia_km = ?, duracion_min = ?, calorias = ?, elevacion_m = ?, stress_score = ?
            WHERE id = ?
        ''', (
            clean_val(dist), 
            clean_val(dur), 
            clean_val(cal), 
            clean_val(elev), 
            clean_val(stress), 
            id_val
        ))

    conn.commit()
    conn.close()
    print("DONE: Todos los datos decimales en actividades y biometria han sido corregidos.")

if __name__ == "__main__":
    fix_decimal_data()
