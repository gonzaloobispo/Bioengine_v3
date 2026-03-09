import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH
from services.sync_service import SyncService

def verify():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Get the most recent running activity id synced by Garmin
    cursor.execute("SELECT id, nombre, fecha FROM activities WHERE fuente LIKE '%Garmin%' AND tipo IN ('Running', 'Carrera', 'running') ORDER BY fecha DESC LIMIT 1")
    row = cursor.fetchone()
    
    if not row:
        print("No Garmin running activities found to delete.")
        return
        
    act_id, act_name, act_date = row
    print(f"Deleting most recent Garmin run: {act_name} on {act_date} (ID: {act_id})")
    
    # Actually delete it
    cursor.execute("DELETE FROM activities WHERE id = ?", (act_id,))
    conn.commit()
    
    # 2. Overwrite the latest date in DB if necessary to force sync of yesterday/today
    # Actually, sync_garmin() uses the MAX(fecha) across ALL activities. 
    # Deleting ONE activity might not change MAX(fecha) if there are other activities today.
    # So we'll run a force sync targeting the specific date of the deleted activity.
    
    print("Running Forcible Garmin Sync for recent days...")
    service = SyncService()
    creds = service.get_secret('garmin')
    from garminconnect import Garmin
    client = Garmin(creds['email'], creds['password'])
    client.login()
    
    # Just fetch that single day and re-process mimicking sync_service
    date_only = act_date.split('T')[0] if 'T' in act_date else act_date.split(' ')[0]
    date_next = (int(date_only[-2:]) + 1)
    if date_next < 10: str_next = f"0{date_next}"
    else: str_next = str(date_next)
    
    # just run the regular sync, it will fetch up to today
    res = service.sync_garmin()
    print("Generic Sync response:", res)
    
    # 3. Check if we got it back and read new columns
    cursor.execute('''
        SELECT nombre, running_power_avg, running_power_max, vertical_oscillation, 
               ground_contact_time, stride_length, vertical_ratio 
        FROM activities 
        WHERE fecha = ? AND tipo IN ('Running', 'Carrera', 'running')
    ''', (act_date,))
    new_row = cursor.fetchone()
    
    if new_row:
        print("\n--- SUCCESSFULLY RE-FETCHED! ---")
        print(f"Name: {new_row[0]}")
        print(f"running_power_avg: {new_row[1]}")
        print(f"running_power_max: {new_row[2]}")
        print(f"vertical_oscillation: {new_row[3]}")
        print(f"ground_contact_time: {new_row[4]}")
        print(f"stride_length: {new_row[5]}")
        print(f"vertical_ratio: {new_row[6]}")
    else:
        print("Failed to re-fetch the deleted activity. It might be due to the MAX() date logic in sync_garmin().")
        
    conn.close()

if __name__ == "__main__":
    verify()
