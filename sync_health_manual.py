"""
Script para sincronizar 30 días de datos de salud de Garmin
"""
import sys
import datetime
sys.path.append('backend')

from services.sync_service import SyncService
from config import DB_PATH
import sqlite3

def backfill_health(days=30):
    print(f"🔄 Iniciando backfill de {days} días de salud de Garmin...")
    
    sync_service = SyncService()
    creds = sync_service.get_secret('garmin')
    if not creds:
        print("❌ Error: No se encontraron credenciales de Garmin")
        return

    from garminconnect import Garmin
    try:
        client = Garmin(creds['email'], creds['password'])
        client.login()
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        
        hoy = datetime.date.today()
        added_count = 0
        
        for i in range(days):
            fecha_dt = hoy - datetime.timedelta(days=i)
            fecha = fecha_dt.isoformat()
            print(f"   [{i+1}/{days}] Sincronizando {fecha}...", end='\r')
            
            # 1. Obtener Sueño
            sleep_data = client.get_sleep_data(fecha)
            sleep_seconds = sleep_data.get('dailySleepDTO', {}).get('sleepTimeSeconds') if sleep_data.get('dailySleepDTO') else 0
            sleep_hours = (sleep_seconds or 0) / 3600
            
            # 2. Obtener HRV
            hrv_data = client.get_hrv_data(fecha)
            hrv_value = None
            if hrv_data and 'hrvSummary' in hrv_data:
                hrv_value = hrv_data['hrvSummary'].get('lastNightAvg')

            # 3. Obtener Stats Diarios
            stats = client.get_stats(fecha)
            body_battery = stats.get('bodyBatteryMostRecentValue')
            resting_hr = stats.get('restingHeartRate')
            stress_level = stats.get('averageStressLevel')
            spo2_avg = stats.get('averageSpo2')
            spo2_min = stats.get('lowestSpo2')
            respiration_avg = stats.get('avgWakingRespirationValue')
            floors_ascended = stats.get('floorsAscended')
            
            if sleep_hours > 0 or hrv_value or body_battery:
                conn.execute('''
                INSERT INTO daily_health (fecha, sleep_hours, hrv_value, readiness_score, body_battery, resting_hr, stress_level, spo2_avg, spo2_min, respiration_avg, floors_ascended, fuente)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(fecha) DO UPDATE SET 
                    sleep_hours=excluded.sleep_hours,
                    hrv_value=excluded.hrv_value,
                    body_battery=excluded.body_battery,
                    resting_hr=excluded.resting_hr,
                    stress_level=excluded.stress_level,
                    spo2_avg=excluded.spo2_avg,
                    spo2_min=excluded.spo2_min,
                    respiration_avg=excluded.respiration_avg,
                    floors_ascended=excluded.floors_ascended,
                    fuente=excluded.fuente
                ''', (
                    fecha, round(sleep_hours, 1), hrv_value, 85.0,
                    body_battery, resting_hr, stress_level,
                    spo2_avg, spo2_min, respiration_avg, floors_ascended, 'Garmin Sync'
                ))
                added_count += 1
        
        conn.commit()
        conn.close()
        print(f"\n✅ Backfill completado: {added_count} registros procesados.")
        
    except Exception as e:
        print(f"\n❌ Error durante el backfill: {e}")

if __name__ == '__main__':
    backfill_health(30)
