
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService
from garminconnect import Garmin

def dump_activity_json():
    service = SyncService()
    creds = service.get_secret('garmin')
    if not creds:
        print("No Garmin credentials found.")
        return

    try:
        print("Logging in to Garmin...")
        client = Garmin(creds['email'], creds['password'])
        client.login()
        
        print("Fetching activities for 2026-02-18...")
        activities = client.get_activities_by_date('2026-02-18', '2026-02-19')
        
        for act in activities:
            if act['activityType']['typeKey'] == 'cycling':
                print(f"Found Cycling Activity: {act['activityName']}")
                with open("c:/BioEngine_V3/backend/debug_activity.json", "w") as f:
                    json.dump(act, f, indent=2)
                print("Dumped to debug_activity.json")
                break
        else:
            print("No cycling activity found for 2026-02-18.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_activity_json()
