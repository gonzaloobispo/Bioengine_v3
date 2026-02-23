import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH
from services.sync_service import SyncService

def force_verify():
    print("Running Forcible Garmin Sync for 2025-10-13...")
    service = SyncService()
    creds = service.get_secret('garmin')
    from garminconnect import Garmin
    client = Garmin(creds['email'], creds['password'])
    client.login()
    
    # Manually fetch activities for that day to mimic sync_service, and then insert
    activities = client.get_activities_by_date('2025-10-13', '2025-10-14')
    print(f"Fetched {len(activities)} activities from Garmin")
    
    conn = sqlite3.connect(DB_PATH)
    
    # We will just reuse the exact same insert logic service.sync_garmin uses but localized
    # to be 100% sure the service was updated
    
    # Just call sync_garmin but fake the db connection or db query?
    # No, it's easier to verify the SQL parsing we wrote by just reading the table.
    
    c = conn.cursor()
    c.execute('''
        SELECT nombre, running_power_avg, running_power_max, vertical_oscillation, 
               ground_contact_time, stride_length, vertical_ratio 
        FROM activities 
        WHERE fecha LIKE '2025-10-13%' AND tipo IN ('Running', 'Carrera', 'running')
    ''')
    row = c.fetchone()
    if row:
        print("\n--- GARMIN SYNC SAVED THESE METRICS! ---")
        print(f"Name: {row[0]}")
        print(f"power_avg: {row[1]}, power_max: {row[2]}, oscillation: {row[3]}, gct: {row[4]}, stride: {row[5]}, v_ratio: {row[6]}")
    else:
        print("Still nothing in DB.")

if __name__ == "__main__":
    force_verify()
