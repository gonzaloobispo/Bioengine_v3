
import sqlite3
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService

def force_sync_one_day():
    service = SyncService()
    conn = service.get_connection()
    target_date = '2026-02-18'
    
    # 1. DELETE activity for that day to force re-insert
    print(f"Deleting activities for {target_date}...")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE fuente LIKE '%Garmin%' AND fecha LIKE ?", (f"{target_date}%",))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"Deleted {deleted} activities. Now syncing...")
    
    # 2. Modify sync_garmin temporarily via monkeypatch or modify last_date query?
    # SyncService.sync_garmin calculates start_date based on max(fecha).
    # If I delete the LAST activity, it should re-fetch from the previous max date.
    
    # Let's check what the new max date is
    conn = service.get_connection()
    last_date_row = conn.execute("SELECT MAX(fecha) as last_date FROM activities WHERE fuente LIKE '%Garmin%'").fetchone()
    print(f"New max date after deletion: {last_date_row['last_date']}")
    conn.close()
    
    # 3. Sync
    result = service.sync_garmin()
    print("Sync Result:", result)

if __name__ == "__main__":
    force_sync_one_day()
