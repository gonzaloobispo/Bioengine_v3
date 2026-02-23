"""
Script de Backfill para Métricas Avanzadas de Garmin (Versión por Lotes)
Actualiza actividades históricas con Training Effect Label y Zonas Cardíacas

Uso:
    python backfill_garmin_metrics.py [días_atrás] [límite]
    
Ejemplos:
    python backfill_garmin_metrics.py 90 20    # Últimos 90 días, máximo 20 actividades
    python backfill_garmin_metrics.py 180 50   # Últimos 180 días, máximo 50 actividades
    python backfill_garmin_metrics.py 365 100  # Último año, máximo 100 actividades
"""
from garminconnect import Garmin
import sqlite3
import json
import sys

def get_garmin_credentials():
    """Obtener credenciales de Garmin desde la base de datos"""
    conn = sqlite3.connect('db/bioengine_v3.db')
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT credentials_json FROM secrets WHERE service = 'garmin'").fetchone()
    conn.close()
    return json.loads(row['credentials_json']) if row else None

def backfill_activities(days_back=90, limit=50):
    print(f"🔄 Iniciando backfill de métricas avanzadas...")
    print(f"   📅 Rango: Últimos {days_back} días")
    print(f"   🔢 Límite: {limit} actividades\n")
    
    # Conectar a Garmin
    creds = get_garmin_credentials()
    if not creds:
        print("❌ No se encontraron credenciales de Garmin")
        return
    
    client = Garmin(creds['email'], creds['password'])
    client.login()
    print("✅ Conectado a Garmin\n")
    
    # Conectar a DB
    conn = sqlite3.connect('db/bioengine_v3.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Obtener actividades en el rango especificado
    c.execute(f"""
        SELECT id, fecha, tipo, nombre 
        FROM activities 
        WHERE fecha >= date('now', '-{days_back} days')
        ORDER BY fecha DESC
        LIMIT {limit}
    """)
    activities = c.fetchall()
    
    print(f"📊 Encontradas {len(activities)} actividades para procesar\n")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for idx, act_row in enumerate(activities, 1):
        fecha = act_row['fecha']
        tipo = act_row['tipo']
        nombre = act_row['nombre'] or 'Sin nombre'
        act_id = act_row['id']
        
        nombre_display = nombre[:40] if nombre else 'Sin nombre'
        print(f"[{idx}/{len(activities)}] Procesando: {fecha[:10]} - {nombre_display}...", end=' ')
        
        try:
            # Extraer solo la parte de fecha (YYYY-MM-DD) del timestamp ISO
            fecha_str = fecha.split('T')[0] if 'T' in fecha else fecha.split(' ')[0]
            garmin_acts = client.get_activities_by_date(fecha_str, fecha_str)
            
            # Buscar la actividad que coincida por tipo y nombre
            matching_act = None
            for g_act in garmin_acts:
                g_tipo = g_act.get('activityType', {}).get('typeKey', 'otros')
                g_nombre = g_act.get('activityName', '')
                
                # Intentar match por tipo o nombre
                if g_tipo.lower() == tipo.lower() or g_nombre == nombre:
                    matching_act = g_act
                    break
            
            if not matching_act:
                print("⏭️ No encontrada en Garmin")
                skipped_count += 1
                continue
            
            # Extraer métricas avanzadas con manejo seguro de None
            te_label = matching_act.get('trainingEffectLabel')
            hr_z1 = int(matching_act.get('hrTimeInZone_1') or 0)
            hr_z2 = int(matching_act.get('hrTimeInZone_2') or 0)
            hr_z3 = int(matching_act.get('hrTimeInZone_3') or 0)
            hr_z4 = int(matching_act.get('hrTimeInZone_4') or 0)
            hr_z5 = int(matching_act.get('hrTimeInZone_5') or 0)
            
            total_hr_time = hr_z1 + hr_z2 + hr_z3 + hr_z4 + hr_z5
            
            # Actualizar solo si hay datos nuevos
            if te_label or total_hr_time > 0:
                c.execute('''
                UPDATE activities 
                SET training_effect_label = ?,
                    hr_zone_1 = ?,
                    hr_zone_2 = ?,
                    hr_zone_3 = ?,
                    hr_zone_4 = ?,
                    hr_zone_5 = ?
                WHERE id = ?
                ''', (te_label, hr_z1, hr_z2, hr_z3, hr_z4, hr_z5, act_id))
                
                updated_count += 1
                z2_min = hr_z2 // 60
                z3_min = hr_z3 // 60
                print(f"✅ TE: {te_label or 'N/A'} | Z2: {z2_min}m, Z3: {z3_min}m")
            else:
                print("⏭️ Sin datos de zonas HR")
                skipped_count += 1
                
        except Exception as e:
            print(f"❌ Error: {str(e)[:50]}")
            error_count += 1
            continue
    
    conn.commit()
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"🎉 Backfill completado:")
    print(f"   ✅ Actualizadas: {updated_count}")
    print(f"   ⏭️ Omitidas: {skipped_count}")
    print(f"   ❌ Errores: {error_count}")
    print(f"{'='*60}")
    print(f"\n💡 Refresca el navegador (F5) para ver las zonas cardíacas")
    
    if updated_count > 0:
        print(f"\n📊 Para procesar más actividades, ejecuta:")
        print(f"   python backfill_garmin_metrics.py {days_back + 90} {limit + 50}")

if __name__ == '__main__':
    # Parámetros por defecto
    days = 90
    max_activities = 50
    
    # Leer argumentos de línea de comandos
    if len(sys.argv) > 1:
        days = int(sys.argv[1])
    if len(sys.argv) > 2:
        max_activities = int(sys.argv[2])
    
    backfill_activities(days, max_activities)
