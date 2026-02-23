import os
import math
import xml.etree.ElementTree as ET
from pathlib import Path
import sqlite3

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def get_gpx_distance(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Namespaces are tricky in GPX
        ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
        
        total_dist = 0.0
        last_pt = None
        
        pts = root.findall('.//gpx:trkpt', ns)
        if not pts:
            # Try without namespace if not found
            pts = root.findall('.//trkpt')
            
        for pt in pts:
            lat = float(pt.get('lat'))
            lon = float(pt.get('lon'))
            if last_pt:
                total_dist += haversine(last_pt[0], last_pt[1], lat, lon)
            last_pt = (lat, lon)
            
        return total_dist
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return 0.0

def process_july():
    gpx_dir = Path(r'C:\BioEngine_Gonzalo\data_raw\apple_health_export\workout-routes')
    db_path = Path(r'C:\BioEngine_V3\db\bioengine_v3.db')
    
    files = sorted(list(gpx_dir.glob('route_2024-07-*.gpx')))
    
    results = []
    for f in files:
        dist = get_gpx_distance(f)
        # Extract date from filename: route_2024-07-31_8.26pm.gpx
        date_str = f.name.split('_')[1] # 2024-07-31
        results.append((date_str, f.name, dist))
        print(f"File: {f.name} -> Distance: {dist:.2f} km")

    # Update DB
    # conn = sqlite3.connect(db_path)
    # cursor = conn.cursor()
    # ... update logic ...
    # conn.close()

if __name__ == "__main__":
    process_july()
