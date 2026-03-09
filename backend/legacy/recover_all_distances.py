import os
import csv
import sqlite3
import math
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def get_gpx_distance_and_time(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
        total_dist = 0.0
        last_pt = None
        pts = root.findall('.//gpx:trkpt', ns)
        if not pts: pts = root.findall('.//trkpt')
        
        start_time_str = None
        if pts:
            time_node = pts[0].find('gpx:time', ns)
            if time_node is None: time_node = pts[0].find('time')
            if time_node is not None:
                start_time_str = time_node.text
            
        for pt in pts:
            lat = float(pt.get('lat'))
            lon = float(pt.get('lon'))
            if last_pt:
                total_dist += haversine(last_pt[0], last_pt[1], lat, lon)
            last_pt = (lat, lon)
            
        return total_dist, start_time_str
    except Exception as e:
        return 0.0, None

def update_from_runkeeper_csv():
    rk_csv = Path(r'C:\BioEngine_Gonzalo\data_raw\runkeeper_export\cardioActivities.csv')
    if not rk_csv.exists():
        print("Runkeeper CSV not found.")
        return 0

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    with open(rk_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Date format: 2025-12-27 19:38:59
            dt_str = row['Date']
            dist = float(row['Distance (km)'])
            if dist <= 0: continue
            
            iso_date = dt_str.replace(' ', 'T')
            
            # Find activity with 0 distance within the same minute
            cursor.execute("""
                UPDATE activities 
                SET distancia_km = ? 
                WHERE (distancia_km = 0 OR distancia_km IS NULL)
                AND (fecha = ? OR SUBSTR(fecha, 1, 16) = SUBSTR(?, 1, 16))
            """, (dist, iso_date, iso_date))
            
            if cursor.rowcount > 0:
                updated += cursor.rowcount
                #print(f"RK Match: {dt_str} -> {dist} km")
    
    conn.commit()
    conn.close()
    return updated

def update_from_apple_gpx():
    gpx_dir = Path(r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\workout-routes')
    if not gpx_dir.exists():
        print("Apple GPX dir not found.")
        return 0

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    files = list(gpx_dir.glob('*.gpx'))
    for f in files:
        dist, start_time_utc = get_gpx_distance_and_time(f)
        if dist > 0 and start_time_utc:
            # Convert UTC to Local (Approx UTC-3)
            dt_utc = datetime.fromisoformat(start_time_utc.replace('Z', '+00:00'))
            dt_local = dt_utc - timedelta(hours=3)
            local_iso = dt_local.strftime('%Y-%m-%dT%H:%M:%S')
            
            cursor.execute("""
                UPDATE activities 
                SET distancia_km = ? 
                WHERE (distancia_km = 0 OR distancia_km IS NULL)
                AND (fecha = ? OR SUBSTR(fecha, 1, 16) = SUBSTR(?, 1, 16))
            """, (round(dist, 2), local_iso, local_iso))
            
            if cursor.rowcount > 0:
                updated += cursor.rowcount
            else:
                # Try date match if time is slightly off
                date_only = local_iso.split('T')[0]
                cursor.execute("""
                    UPDATE activities 
                    SET distancia_km = ? 
                    WHERE (distancia_km = 0 OR distancia_km IS NULL)
                    AND fecha LIKE ?
                """, (round(dist, 2), f"{date_only}%"))
                if cursor.rowcount > 0:
                    updated += cursor.rowcount

    conn.commit()
    conn.close()
    return updated

if __name__ == "__main__":
    print("Iniciando recuperación de distancias...")
    rk_count = update_from_runkeeper_csv()
    print(f"Recuperadas {rk_count} actividades desde Runkeeper CSV.")
    
    ap_count = update_from_apple_gpx()
    print(f"Recuperadas {ap_count} actividades desde Apple GPX.")
    print("Proceso finalizado.")
