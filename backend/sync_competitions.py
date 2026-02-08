import sqlite3
import pandas as pd
import os
from datetime import datetime

DB_PATH = r'c:\BioEngine_V3\db\bioengine_v3.db'
EXCEL_PATH = r'c:\BioEngine_V3\Carreras.xlsx'

def sync_competitions():
    if not os.path.exists(DB_PATH) or not os.path.exists(EXCEL_PATH):
        print("Missing files")
        return

    # 1. Read Excel
    df = pd.read_excel(EXCEL_PATH, header=3) # Based on previous check
    df = df.dropna(subset=['Fecha', 'Carrera'])
    
    competitions = []
    for _, row in df.iterrows():
        try:
            date_val = row['Fecha']
            if isinstance(date_val, str):
                date_str = date_val.split(' ')[0]
            else:
                date_str = date_val.strftime('%Y-%m-%d')
            
            competitions.append({
                'date': date_str,
                'name': str(row['Carrera']).strip()
            })
        except:
            continue

    print(f"Found {len(competitions)} competitions in Excel.")

    # 2. Update DB
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    updated_count = 0
    for comp in competitions:
        # Try to find a matching activity on the same date
        # Date in DB can be '2024-12-08 08:00:00' or '2024-12-08'
        date_pattern = comp['date'] + '%'
        
        # Determine if it's Trail or Street
        # Simple logic: if 'trail' in name -> Competición Trail, else Competición Calle
        new_type = 'Competición Calle'
        if 'trail' in comp['name'].lower() or 'aventura' in comp['name'].lower():
            new_type = 'Competición Trail'
            
        cur.execute("UPDATE activities SET tipo = ?, nombre = ? WHERE fecha LIKE ? AND (tipo LIKE 'run%' OR tipo LIKE 'carrera%' OR tipo IS NULL OR tipo = 'Otros')", 
                    (new_type, comp['name'], date_pattern))
        
        if cur.rowcount > 0:
            print(f"Matched: {comp['date']} -> {comp['name']} ({new_type})")
            updated_count += cur.rowcount
            
    conn.commit()
    print(f"\nSuccessfully updated {updated_count} activities as Competitions.")
    conn.close()

if __name__ == "__main__":
    sync_competitions()
