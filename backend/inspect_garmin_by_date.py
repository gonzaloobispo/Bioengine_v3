
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService
from garminconnect import Garmin

def inspect_activity_by_date():
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
                print(f"\n--- Found Cycling Activity (By Date): {act['activityName']} ({act['startTimeLocal']}) ---")
                # print(json.dumps(act, indent=2)) # Too much output potentially
                
                # Check specifics
                print("\n--- Specific Cadence Fields ---")
                print(f"averageBikingCadenceInRevPerMinute: {act.get('averageBikingCadenceInRevPerMinute')}")
                print(f"averageRunningCadence: {act.get('averageRunningCadence')}")
                print(f"averageCadence: {act.get('averageCadence')}")
                
                # Check for other potential keys
                keys_with_cadence = [k for k in act.keys() if 'cadence' in k.lower()]
                print(f"Keys containing 'cadence': {keys_with_cadence}")
                break
        else:
            print("No cycling activity found for 2026-02-18.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_activity_by_date()
