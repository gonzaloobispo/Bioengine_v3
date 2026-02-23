import sys
from pathlib import Path
import json

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from services.sync_service import SyncService
from garminconnect import Garmin

def fetch():
    service = SyncService()
    creds = service.get_secret('garmin')
    client = Garmin(creds['email'], creds['password'])
    client.login()
    activities = client.get_activities_by_date('2024-01-01', '2026-03-01')
    
    # search for carrera
    for act in activities:
        name = act.get('activityName', '').lower()
        if act.get('activityType', {}).get('typeKey') == 'running' and ('carrera' in name or '10k' in name or '21k' in name or act.get('distance', 0) > 9000):
            print("\n--- FOUND RACE OR LONG RUN ---")
            print(f"Name: {act.get('activityName')}")
            print(f"Date: {act.get('startTimeLocal')}")
            
            # Print advanced metrics specifically
            print("\n--- ADVANCED METRICS (FR965 capable) ---")
            print(f"avgVerticalOscillation: {act.get('avgVerticalOscillation')}")
            print(f"avgGroundContactTime: {act.get('avgGroundContactTime')}")
            print(f"avgStrideLength: {act.get('avgStrideLength')}")
            print(f"avgVerticalRatio: {act.get('avgVerticalRatio')}")
            print(f"avgFractionalCadence: {act.get('avgFractionalCadence')}")
            print(f"maxVerticalOscillation: {act.get('maxVerticalOscillation')}")
            print(f"vO2MaxValue: {act.get('vO2MaxValue')}")
            print(f"trainingEffectLabel: {act.get('trainingEffectLabel')}")
            
            print("\n--- FULL JSON DUMP ---")
            print(json.dumps(act, indent=2))
            break

if __name__ == '__main__':
    fetch()
