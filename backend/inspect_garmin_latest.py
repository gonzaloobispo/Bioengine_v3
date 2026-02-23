
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService
from garminconnect import Garmin

def inspect_latest_activity():
    service = SyncService()
    creds = service.get_secret('garmin')
    if not creds:
        print("No Garmin credentials found.")
        return

    try:
        print("Logging in to Garmin...")
        client = Garmin(creds['email'], creds['password'])
        client.login()
        
        print("Fetching latest activities...")
        # Get last 5 activities to be sure we find the cycling one
        activities = client.get_activities(0, 5)
        
        for act in activities:
            if act['activityType']['typeKey'] == 'cycling':
                print(f"\n--- Found Cycling Activity: {act['activityName']} ({act['startTimeLocal']}) ---")
                print(json.dumps(act, indent=2))
                
                # Check specifics
                print("\n--- Specific Cadence Fields ---")
                print(f"averageBikingCadenceInRevPerMinute: {act.get('averageBikingCadenceInRevPerMinute')}")
                print(f"averageRunningCadence: {act.get('averageRunningCadence')}")
                print(f"averageCadence: {act.get('averageCadence')}")
                break
        else:
            print("No recent cycling activity found in the last 5 entries.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_latest_activity()
