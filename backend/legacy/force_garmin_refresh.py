
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import yaml
from pathlib import Path
import sys

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService

def backfill_garmin():
    """Trigger Garmin sync to backfill data with new metrics."""
    print("Starting Garmin Backfill for new metrics...")
    
    # Initialize service
    service = SyncService()
    
    # We want to force sync of last 30 days to update existing records
    # However, existing sync logic skips if record exists by date/type.
    # We need to temporarily delete recent cycling/running activities or modify sync to UPDATE.
    # Safer: just delete last 30 days of activities from Garmin to force re-insert.
    
    conn = service.get_connection()
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    print(f"Clearing Garmin activities since {thirty_days_ago} to force refresh...")
    
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE fuente LIKE '%Garmin%' AND fecha >= ?", (thirty_days_ago,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"Deleted {deleted} activities. Triggering sync...")
    
    # Sync
    result = service.sync_garmin()
    print("Sync Result:", result)
    
if __name__ == "__main__":
    backfill_garmin()
