import sqlite3
import json
import datetime
import requests
from garminconnect import Garmin
from typing import Dict, Any, List, Optional
from config import DB_PATH

class SyncService:
    def __init__(self):
        self.db_path = DB_PATH

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False, timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn

    def get_secret(self, service: str) -> dict:
        conn = self.get_connection()
        row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", (service,)).fetchone()
        conn.close()
        return json.loads(row['credentials_json']) if row else None

    def save_secret(self, service: str, data: dict) -> None:
        conn = self.get_connection()
        conn.execute("INSERT OR REPLACE INTO secrets (service, credentials_json, updated_at) VALUES (?, ?, ?)",
                     (service, json.dumps(data), datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()

    def log_sync(self, service: str, status: str, message: str) -> None:
        conn = self.get_connection()
        conn.execute("INSERT INTO sync_logs (service, status, message) VALUES (?, ?, ?)",
                     (service, status, message))
        conn.commit()
        conn.close()

    def sync_garmin(self) -> dict:
        creds = self.get_secret('garmin')
        if not creds:
            return {"status": "error", "message": "No hay credenciales de Garmin"}

        try:
            client = Garmin(creds['email'], creds['password'])
            client.login()
            
            # Obtener última fecha en DB
            conn = self.get_connection()
            last_date_row = conn.execute("SELECT MAX(fecha) as last_date FROM activities WHERE fuente LIKE '%Garmin%'").fetchone()
            
            if last_date_row and last_date_row['last_date']:
                start_date = datetime.datetime.fromisoformat(last_date_row['last_date']).date() + datetime.timedelta(days=1)
                self.log_sync('garmin', 'info', f"Fecha inicio calculada: {start_date} (basada en DB)")
            else:
                start_date = datetime.date(2023, 1, 1)
                self.log_sync('garmin', 'info', f"Fecha inicio default: {start_date} (DB vacía)")

            hoy = datetime.date.today()
            if start_date > hoy:
                self.log_sync('garmin', 'warning', f"Start date {start_date} > hoy {hoy}. Nada que sincronizar.")
                return {"status": "ok", "message": "Garmin ya está al día"}

            self.log_sync('garmin', 'info', f"Solicitando actividades desde {start_date} hasta {hoy}")
            activities = client.get_activities_by_date(start_date.isoformat(), hoy.isoformat())
            self.log_sync('garmin', 'info', f"Actividades recibidas: {len(activities)}")
            nuevos_count = 0
            
            for act in activities:
                fecha = act['startTimeLocal']
                tipo = act.get('activityType', {}).get('typeKey', 'otros')
                
                # Evitar duplicados por fecha y tipo
                exists = conn.execute("SELECT id FROM activities WHERE fecha = ? AND tipo = ?", (fecha, tipo)).fetchone()
                if not exists:
                    nombre = act.get('activityName', 'Actividad sin nombre')
                    # Capturamos cadencia de forma más robusta para diferentes tipos de actividad
                    cadencia = act.get('averageBikingCadenceInRevPerMinute') or act.get('averageRunningCadence') or act.get('averageCadence')
                    
                    # Nuevas Métricas: Velocidad y Elevación
                    # Garmin envía velocidad en m/s -> convertir a km/h (* 3.6)
                    avg_speed_ms = act.get('averageSpeed', 0)
                    max_speed_ms = act.get('maxSpeed', 0)
                    velocidad_media = round(avg_speed_ms * 3.6, 2) if avg_speed_ms else 0.0
                    velocidad_maxima = round(max_speed_ms * 3.6, 2) if max_speed_ms else 0.0
                    
                    elevacion_ganada = act.get('elevationGain') or act.get('totalElevationGain', 0.0)
                    elevacion_perdida = act.get('elevationLoss', 0.0)

                    # Training Effect y Zonas Cardíacas
                    te_label = act.get('trainingEffectLabel', None)
                    hr_z1 = int(act.get('hrTimeInZone_1', 0))
                    hr_z2 = int(act.get('hrTimeInZone_2', 0))
                    hr_z3 = int(act.get('hrTimeInZone_3', 0))
                    hr_z4 = int(act.get('hrTimeInZone_4', 0))
                    hr_z5 = int(act.get('hrTimeInZone_5', 0))
                    
                    sql_params = {
                        "fecha": fecha,
                        "tipo": tipo,
                        "distancia_km": round(act.get('distance', 0) / 1000.0, 2),
                        "duracion_min": round(act.get('duration', 0) / 60.0, 1),
                        "calorias": act.get('calories', 0),
                        "fc_media": act.get('averageHR', None),
                        "fc_max": act.get('maxHR', None),
                        "elevacion_m": elevacion_ganada,
                        "cadencia_media": cadencia, # Using the resolved cadence variable
                        "fuente": 'Garmin V3 Sync',
                        "nombre": nombre,
                        "training_load": act.get('activityTrainingLoad', None),
                        "aerobic_te": act.get('aerobicTrainingEffect', None),
                        "anaerobic_te": act.get('anaerobicTrainingEffect', None),
                        "training_effect_label": te_label,
                        "hr_zone_1": hr_z1,
                        "hr_zone_2": hr_z2,
                        "hr_zone_3": hr_z3,
                        "hr_zone_4": hr_z4,
                        "hr_zone_5": hr_z5,
                        "velocidad_media": velocidad_media,
                        "velocidad_maxima": velocidad_maxima,
                        "elevacion_perdida": elevacion_perdida,
                        "running_power_avg": act.get('avgPower', None),
                        "running_power_max": act.get('maxPower', None),
                        "vertical_oscillation": act.get('avgVerticalOscillation', None),
                        "ground_contact_time": act.get('avgGroundContactTime', None),
                        "stride_length": act.get('avgStrideLength', None),
                        "vertical_ratio": act.get('avgVerticalRatio', None)
                    }
                    
                    conn.execute('''
                    INSERT INTO activities (
                        fecha, tipo, distancia_km, duracion_min, calorias, 
                        fc_media, fc_max, elevacion_m, cadencia_media, fuente, 
                        nombre, training_load, aerobic_te, anaerobic_te, training_effect_label, 
                        hr_zone_1, hr_zone_2, hr_zone_3, hr_zone_4, hr_zone_5, 
                        velocidad_media, velocidad_maxima, elevacion_perdida,
                        running_power_avg, running_power_max, vertical_oscillation, 
                        ground_contact_time, stride_length, vertical_ratio
                    )
                    VALUES (
                        :fecha, :tipo, :distancia_km, :duracion_min, :calorias, 
                        :fc_media, :fc_max, :elevacion_m, :cadencia_media, :fuente, 
                        :nombre, :training_load, :aerobic_te, :anaerobic_te, :training_effect_label, 
                        :hr_zone_1, :hr_zone_2, :hr_zone_3, :hr_zone_4, :hr_zone_5, 
                        :velocidad_media, :velocidad_maxima, :elevacion_perdida,
                        :running_power_avg, :running_power_max, :vertical_oscillation, 
                        :ground_contact_time, :stride_length, :vertical_ratio
                    )
                    ''', sql_params)
                    nuevos_count += 1
            
            conn.commit()
            conn.close()
            
            # Intentar sincronizar salud también
            self.sync_garmin_health()
            
            self.log_sync('garmin', 'success', f"Sincronizados {nuevos_count} actividades")
            return {"status": "success", "added": nuevos_count}

        except Exception as e:
            self.log_sync('garmin', 'error', str(e))
            return {"status": "error", "message": str(e)}

    def sync_garmin_health(self) -> dict:
        creds = self.get_secret('garmin')
        if not creds: return {"status": "error"}
        
        try:
            client = Garmin(creds['email'], creds['password'])
            client.login()
            
            # Sincronizamos los últimos 7 días de salud
            hoy = datetime.date.today()
            conn = self.get_connection()
            
            for i in range(7):
                fecha_dt = hoy - datetime.timedelta(days=i)
                fecha = fecha_dt.isoformat()
                
                # 1. Obtener Sueño
                sleep_data = client.get_sleep_data(fecha)
                sleep_seconds = sleep_data.get('dailySleepDTO', {}).get('sleepTimeSeconds') if sleep_data.get('dailySleepDTO') else 0
                sleep_minutes = (sleep_seconds or 0) / 3600
                
                # 2. Obtener HRV (si está disponible)
                hrv_data = client.get_hrv_data(fecha)
                hrv_value = None
                if hrv_data and 'hrvSummary' in hrv_data:
                    hrv_value = hrv_data['hrvSummary'].get('lastNightAvg')

                # 3. Obtener Stats Diarios (Body Battery, Stress, RHR, SpO2, Respiración, Pisos)
                stats = client.get_stats(fecha)
                body_battery = stats.get('bodyBatteryMostRecentValue')
                resting_hr = stats.get('restingHeartRate')
                stress_level = stats.get('averageStressLevel')
                spo2_avg = stats.get('averageSpo2')
                spo2_min = stats.get('lowestSpo2')
                respiration_avg = stats.get('avgWakingRespirationValue')
                floors_ascended = stats.get('floorsAscended')
                
                if sleep_minutes > 0 or hrv_value or body_battery:
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
                        fecha, 
                        round(sleep_minutes, 1), 
                        hrv_value, 
                        85.0, # Default readiness, we'll calculate better in frontend
                        body_battery,
                        resting_hr,
                        stress_level,
                        spo2_avg,
                        spo2_min,
                        respiration_avg,
                        floors_ascended,
                        'Garmin Health Sync Complete'
                    ))
            
            conn.commit()
            conn.close()
            return {"status": "success"}
        except Exception as e:
            print(f"Error en sync_garmin_health: {e}")
            return {"status": "error", "message": str(e)}

    def sync_withings(self) -> dict:
        app_secrets = self.get_secret('withings_app')
        tokens = self.get_secret('withings_tokens')
        
        if not app_secrets or not tokens:
            return {"status": "error", "message": "Faltan credenciales o tokens de Withings"}

        def refresh_tokens(refresh_token):
            url = "https://wbsapi.withings.net/v2/oauth2"
            payload = {
                'action': 'requesttoken',
                'grant_type': 'refresh_token',
                'client_id': app_secrets['client_id'],
                'client_secret': app_secrets['client_secret'],
                'refresh_token': refresh_token
            }
            try:
                r = requests.post(url, data=payload)
                data = r.json()
                if data['status'] == 0:
                    new_tokens = data['body']
                    self.save_secret('withings_tokens', new_tokens)
                    return new_tokens['access_token']
                else:
                    msg = f"Refresh failed: {data}"
                    self.log_sync('withings', 'error', msg)
                    # Return error string instead of None to bubble up
                    return f"ERROR_REFRESH: {msg}"
            except Exception as e:
                self.log_sync('withings', 'error', f"Refresh exception: {str(e)}")
                return None

        access_token = tokens['access_token']
        # Obtener última fecha en DB
        conn = self.get_connection()
        last_date_row = conn.execute("SELECT MAX(fecha) as last_date FROM biometrics WHERE fuente LIKE '%Withings%'").fetchone()
        
        # Withings pide timestamp
        if last_date_row and last_date_row['last_date']:
            last_timestamp = int(datetime.datetime.fromisoformat(last_date_row['last_date']).timestamp()) - 3600
        else:
            last_timestamp = 1672531200 # 2023-01-01

        url = "https://wbsapi.withings.net/measure"
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {'action': 'getmeas', 'meastype': '1,6,76', 'lastupdate': last_timestamp}

        conn = None
        try:
            r = requests.post(url, headers=headers, data=params, timeout=10)
            data = r.json()

            if data['status'] == 401:
                refresh_res = refresh_tokens(tokens['refresh_token'])
                if refresh_res and not refresh_res.startswith("ERROR_"):
                    access_token = refresh_res
                    headers['Authorization'] = f'Bearer {access_token}'
                    r = requests.post(url, headers=headers, data=params, timeout=10)
                    data = r.json()
                else:
                    detail = refresh_res if refresh_res else "Unknown refresh error"
                    # Check for invalid token specific error
                    if "invalid refresh_token" in str(detail):
                        self.log_sync('withings', 'warning', "Token inválido detectado. Eliminando credenciales obsoletas.")
                        conn = self.get_connection()
                        conn.execute("DELETE FROM secrets WHERE service = 'withings_tokens'")
                        conn.commit()
                        conn.close()
                        return {"status": "error", "message": "Token de Withings expirado. Por favor, re-conecte su cuenta desde el panel."}
                    
                    return {"status": "error", "message": f"Error renovando token Withings. Detalle: {detail}"}

            if data['status'] == 0:
                conn = self.get_connection()
                grps = data['body']['measuregrps']
                nuevos_count = 0
                for g in grps:
                    fecha = datetime.datetime.fromtimestamp(g['date']).isoformat()
                    peso, grasa, musculo = None, None, None
                    for m in g['measures']:
                        val = m['value'] * (10 ** m['unit'])
                        if m['type'] == 1: peso = round(val, 2)
                        elif m['type'] == 6: grasa = round(val, 2)
                        elif m['type'] == 76: musculo = round(val, 2)
                    
                    if peso:
                        exists = conn.execute("SELECT id FROM biometrics WHERE fecha = ?", (fecha,)).fetchone()
                        if not exists:
                            conn.execute('''
                            INSERT INTO biometrics (fecha, peso, grasa_pct, masa_muscular_kg, fuente)
                            VALUES (?, ?, ?, ?, ?)
                            ''', (fecha, peso, grasa, musculo, 'Withings V3 Sync'))
                            nuevos_count += 1
                
                conn.commit()
                conn.close()
                self.log_sync('withings', 'success', f"Sincronizados {nuevos_count} pesajes")
                return {"status": "success", "added": nuevos_count}
            
            return {"status": "error", "message": f"Error API Withings: {data['status']}"}
        except Exception as e:
            if conn:
                try: conn.close()
                except: pass
            self.log_sync('withings', 'error', str(e))
            return {"status": "error", "message": f"Timeout o Error en Withings: {str(e)}"}

if __name__ == "__main__":
    service = SyncService()
    print("Sincronizando Garmin...")
    print(service.sync_garmin())
    print("Sincronizando Withings...")
    print(service.sync_withings())
