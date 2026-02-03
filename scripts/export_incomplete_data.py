import sqlite3
import sys
import os
import csv
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from config import DB_PATH

def export_audit_report():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obtener todas las actividades con algún campo en 0 o nulo
    query = """
    SELECT id, fecha, tipo, distancia_km, duracion_min, calorias, fuente
    FROM activities
    WHERE distancia_km IS NULL OR distancia_km = 0 
       OR duracion_min IS NULL OR duracion_min = 0
       OR calorias IS NULL OR calorias = 0
    ORDER BY fecha DESC
    """
    
    rows = cursor.execute(query).fetchall()
    
    report_path = os.path.join(os.getcwd(), 'logs', 'REPORTE_DATOS_INCOMPLETOS.csv')
    
    with open(report_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['ID', 'Fecha', 'Tipo', 'Distancia_actual', 'Duracion_actual', 'Calorias_actual', 'Fuente', 'Diagnostico']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()
        
        for row in rows:
            missing = []
            
            # Formatear decimales con coma
            def fmt_dec(val):
                if val is None: return "0,0"
                return str(val).replace('.', ',')

            if not row['distancia_km'] or row['distancia_km'] == 0: missing.append("Distancia")
            if not row['duracion_min'] or row['duracion_min'] == 0: missing.append("Duración")
            if not row['calorias'] or row['calorias'] == 0: missing.append("Calorías")
            
            writer.writerow({
                'ID': row['id'],
                'Fecha': row['fecha'],
                'Tipo': row['tipo'],
                'Distancia_actual': fmt_dec(row['distancia_km']),
                'Duracion_actual': fmt_dec(row['duracion_min']),
                'Calorias_actual': fmt_dec(row['calorias']),
                'Fuente': row['fuente'] or 'Desconocida',
                'Diagnostico': f"Falta/Cero: {', '.join(missing)}"
            })
            
    print(f"✅ Se ha generado un reporte detallado en: {report_path}")
    print(f"Total de registros incompletos: {len(rows)}")
    
    # Resumen por tipo para detectar patrones
    print("\n--- Patrones Detectados ---")
    types_count = {}
    for row in rows:
        types_count[row['tipo']] = types_count.get(row['tipo'], 0) + 1
    
    for tipo, count in types_count.items():
        print(f" - {tipo}: {count} casos")

    conn.close()

if __name__ == "__main__":
    export_audit_report()
