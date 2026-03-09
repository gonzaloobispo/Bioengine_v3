import os
import math
import xml.etree.ElementTree as ET
from pathlib import Path
import sqlite3
from datetime import datetime, timedelta

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def get_gpx_data(file_path):
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
        print(f"Error parsing {file_path}: {e}")
        return 0.0, None

def update_db():
    gpx_dir = Path(r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\workout-routes')
    db_path = Path(r'C:\BioEngine_V3\db\bioengine_v3.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    files = list(gpx_dir.glob('route_2024-07-*.gpx'))
    
    updated_count = 0
    for f in files:
        dist, start_time_utc = get_gpx_data(f)
        if dist > 0 and start_time_utc:
            # Convert UTC to Local (Approx UTC-3 for Uruguay)
            dt_utc = datetime.fromisoformat(start_time_utc.replace('Z', '+00:00'))
            dt_local = dt_utc - timedelta(hours=3)
            local_iso = dt_local.strftime('%Y-%m-%dT%H:%M:%S')
            
            # Find activity with distance 0 and source Apple within 5 minutes of this time
            # Or just match by the date part if time is slightly off
            cursor.execute("""
                UPDATE activities 
                SET distancia_km = ? 
                WHERE (distancia_km = 0 OR distancia_km IS NULL)
                AND fuente = 'Apple'
                AND (fecha = ? OR SUBSTR(fecha, 1, 16) = SUBSTR(?, 1, 16))
            """, (round(dist, 2), local_iso, local_iso))
            
            if cursor.rowcount > 0:
                print(f"Updated: {f.name} -> {dist:.2f} km (Match: {local_iso})")
                updated_count += cursor.rowcount
            else:
                # Try a broader match by date if exact time fails
                date_only = local_iso.split('T')[0]
                cursor.execute("""
                    UPDATE activities 
                    SET distancia_km = ? 
                    WHERE (distancia_km = 0 OR distancia_km IS NULL)
                    AND fuente = 'Apple'
                    AND fecha LIKE ?
                """, (round(dist, 2), f"{date_only}%"))
                if cursor.rowcount > 0:
                    print(f"Updated (Date Match): {f.name} -> {dist:.2f} km (Date: {date_only})")
                    updated_count += cursor.rowcount

    conn.commit()
    conn.close()
    print(f"Total updated entries: {updated_count}")

if __name__ == "__main__":
    update_db()
