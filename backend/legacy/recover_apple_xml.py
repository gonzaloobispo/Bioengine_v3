import os
import sqlite3
import re
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')
XML_PATH = Path(r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\exportar.xml')

def recover_from_xml():
    if not XML_PATH.exists():
        print("exportar.xml not found.")
        return 0

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    
    # Regex to find Workout and its distance statistics efficiently
    # We look for <Workout ... startDate="YYYY-MM-DD HH:MM:SS" ...>
    # and then look for <WorkoutStatistics ... unit="km" sum="X.X"/>
    
    current_workout_date = None
    dist_found = None
    
    print("Parsing exportar.xml (this may take a minute)...")
    
    with open(XML_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            # Detect Workout Start
            if '<Workout ' in line:
                # Extract startDate
                match = re.search(r'startDate="([^"]+)"', line)
                if match:
                    # Format: 2024-07-27 10:23:06 -0300
                    date_val = match.group(1).split(' ')[0] + 'T' + match.group(1).split(' ')[1]
                    current_workout_date = date_val
                dist_found = None
            
            # Detect Distance Statistic within Workout
            if current_workout_date and 'HKQuantityTypeIdentifierDistanceWalkingRunning' in line and 'sum="' in line:
                match_sum = re.search(r'sum="([^"]+)"', line)
                if match_sum:
                    dist_found = float(match_sum.group(1))
            
            # Detect Workout End
            if '</Workout>' in line:
                if current_workout_date and dist_found and dist_found > 0:
                    # Match in DB
                    cursor.execute("""
                        UPDATE activities 
                        SET distancia_km = ? 
                        WHERE (distancia_km = 0 OR distancia_km IS NULL)
                        AND (fecha = ? OR SUBSTR(fecha, 1, 16) = SUBSTR(?, 1, 16))
                    """, (round(dist_found, 2), current_workout_date, current_workout_date))
                    
                    if cursor.rowcount > 0:
                        updated += cursor.rowcount
                        # print(f"XML Match: {current_workout_date} -> {dist_found} km")
                
                current_workout_date = None
                dist_found = None

    conn.commit()
    conn.close()
    return updated

if __name__ == "__main__":
    count = recover_from_xml()
    print(f"Recuperadas {count} actividades desde exportar.xml.")
