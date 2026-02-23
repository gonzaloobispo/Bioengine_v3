import json
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from services.sync_service import SyncService
from garminconnect import Garmin
import datetime

def discover():
    sync = SyncService()
    creds = sync.get_secret('garmin')
    if not creds:
        print("No hay credenciales.")
        return

    client = Garmin(creds['email'], creds['password'])
    client.login()
    
    hoy = datetime.date.today().isoformat()
    
    print("--- Investigando Actividades ---")
    activities = client.get_activities_by_date(hoy, hoy)
    if not activities:
        # Si hoy no hay, pedir ayer
        ayer = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        activities = client.get_activities_by_date(ayer, ayer)
    
    if activities:
        print(f"Campos en una actividad: {list(activities[0].keys())}")
        with open('garmin_activity_sample.json', 'w') as f:
            json.dump(activities[0], f, indent=2)
    else:
        print("No se encontraron actividades recientes para analizar campos.")

    print("\n--- Investigando Salud Diaria ---")
    try:
        stats = client.get_stats(hoy)
        print(f"Campos en Stats Diarios: {list(stats.keys())}")
        with open('garmin_stats_sample.json', 'w') as f:
            json.dump(stats, f, indent=2)
    except: pass

    try:
        bb = client.get_body_battery(hoy)
        print(f"Campos en Body Battery: {list(bb[0].keys()) if bb else 'Vacío'}")
    except: pass

    print("\nAuditoría completada. Los archivos .json contienen la estructura completa.")

if __name__ == "__main__":
    discover()
