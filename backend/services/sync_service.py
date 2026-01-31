import sqlite3
import json
import requests
import datetime
from garminconnect import Garmin
import os

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

class SyncService:
    def __init__(self):
        self.db_path = DB_PATH

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def get_secret(self, service):
        conn = self.get_connection()
        row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", (service,)).fetchone()
        conn.close()
        return json.loads(row['credentials_json']) if row else None

    def save_secret(self, service, data):
        conn = self.get_connection()
        conn.execute("INSERT OR REPLACE INTO secrets (service, credentials_json, updated_at) VALUES (?, ?, ?)",
                     (service, json.dumps(data), datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()

    def log_sync(self, service, status, message):
        conn = self.get_connection()
        conn.execute("INSERT INTO sync_logs (service, status, message) VALUES (?, ?, ?)",
                     (service, status, message))
        conn.commit()
        conn.close()

    def sync_garmin(self):
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
            else:
                start_date = datetime.date(2023, 1, 1)

            hoy = datetime.date.today()
            if start_date > hoy:
                return {"status": "ok", "message": "Garmin ya está al día"}

            activities = client.get_activities_by_date(start_date.isoformat(), hoy.isoformat())
            nuevos_count = 0
            
            for act in activities:
                fecha = act['startTimeLocal']
                tipo = act.get('activityType', {}).get('typeKey', 'otros')
                
                # Evitar duplicados por fecha y tipo
                exists = conn.execute("SELECT id FROM activities WHERE fecha = ? AND tipo = ?", (fecha, tipo)).fetchone()
                if not exists:
                    conn.execute('''
                    INSERT INTO activities (fecha, tipo, distancia_km, duracion_min, calorias, fc_media, fc_max, elevacion_m, cadencia_media, fuente)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        fecha, tipo,
                        round(act.get('distance', 0) / 1000.0, 2),
                        round(act.get('duration', 0) / 60.0, 1),
                        act.get('calories', 0),
                        act.get('averageHR', None),
                        act.get('maxHR', None),
                        act.get('totalElevationGain', None),
                        act.get('averageRunningCadence', None) or act.get('averageBikeCadence', None),
                        'Garmin V3 Sync'
                    ))
                    nuevos_count += 1
            
            conn.commit()
            conn.close()
            self.log_sync('garmin', 'success', f"Sincronizados {nuevos_count} actividades")
            return {"status": "success", "added": nuevos_count}

        except Exception as e:
            self.log_sync('garmin', 'error', str(e))
            return {"status": "error", "message": str(e)}

    def sync_withings(self):
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
                    self.log_sync('withings', 'error', f"Refresh failed: {data}")
                    return None
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
        
        r = requests.post(url, headers=headers, data=params)
        data = r.json()

        if data['status'] == 401:
            access_token = refresh_tokens(tokens['refresh_token'])
            if access_token:
                headers['Authorization'] = f'Bearer {access_token}'
                r = requests.post(url, headers=headers, data=params)
                data = r.json()
            else:
                return {"status": "error", "message": "Error renovando token Withings"}

        if data['status'] == 0:
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
                    # Evitar duplicados exactos por fecha
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
        
        conn.close()
        return {"status": "error", "message": f"Error API Withings: {data['status']}"}

if __name__ == "__main__":
    service = SyncService()
    print("Sincronizando Garmin...")
    print(service.sync_garmin())
    print("Sincronizando Withings...")
    print(service.sync_withings())
