import pandas as pd
import sqlite3
import os
from pathlib import Path
from datetime import datetime

# Paths
DB_PATH = Path('c:/BioEngine_V3/db/bioengine_v3.db')
EXCEL_PATH = Path('c:/BioEngine_V3/Carreras.xlsx')
CSV_CALLE = Path(r'C:\BioEngine_Gonzalo\BioEngine_Master_Sync\Historial_Carreras\Calle\carreras_calle.csv')
CSV_TRAIL = Path(r'C:\BioEngine_Gonzalo\BioEngine_Master_Sync\Historial_Carreras\Trail\carreras_trail.csv')

def sync_competitions():
    if not DB_PATH.exists():
        print("DB not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Load CSV Shoe Data
    shoe_map = {} # date_str -> shoe_name
    
    if CSV_CALLE.exists():
        df_c = pd.read_csv(CSV_CALLE, sep=';', encoding='utf-8')
        for _, row in df_c.iterrows():
            d = str(row['Fecha']).split(' ')[0]
            shoe_map[d] = row.get('ZAPATOS', 'Brooks Adrenaline GTS 23')
            
    if CSV_TRAIL.exists():
        # Encoding issues might occur with Windows files, try latin-1 if utf-8 fails
        try:
            df_t = pd.read_csv(CSV_TRAIL, sep=';', encoding='utf-8')
        except:
            df_t = pd.read_csv(CSV_TRAIL, sep=';', encoding='latin-1')
        for _, row in df_t.iterrows():
            d = str(row['Fecha']).split(' ')[0]
            shoe_map[d] = row.get('ZAPATOS', 'Hoka Speedgoat 6')

    # 2. Extract Events from Excel (Sheet 'Gonzalo')
    try:
        df_xl = pd.read_excel(EXCEL_PATH, sheet_name='Gonzalo', header=None)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    # Info starts at row 4 (index 4)
    # Block 1: Calle (Cols 0-10)
    # Block 2: Trail (Cols 11-21)
    
    events = [] # (date, name, type)
    
    # Calle
    for i in range(4, len(df_xl)):
        row = df_xl.iloc[i]
        dt = row[0]
        name = row[1]
        if pd.notna(dt) and pd.notna(name):
            if isinstance(dt, datetime):
                dt_str = dt.strftime('%Y-%m-%d')
                events.append((dt_str, name, 'Competición Calle'))
    
    # Trail
    for i in range(4, len(df_xl)):
        row = df_xl.iloc[i]
        dt = row[11]
        name = row[12]
        if pd.notna(dt) and pd.notna(name):
            if isinstance(dt, datetime):
                dt_str = dt.strftime('%Y-%m-%d')
                events.append((dt_str, name, 'Competición Trail'))

    print(f"Read {len(events)} events from Excel.")
    
    # 3. Update Database
    matched_count = 0
    for dt_str, event_name, comp_type in events:
        shoe = shoe_map.get(dt_str)
        if not shoe:
            # Fallback based on type
            shoe = 'Brooks Adrenaline GTS 23' if 'Calle' in comp_type else 'Hoka Speedgoat 6'
        
        # We match activities on the same day
        # Broad match (LIKE 'YYYY-MM-DD%')
        cursor.execute("""
            UPDATE activities 
            SET evento_nombre = ?, calzado = ?, tipo = ?
            WHERE fecha LIKE ?
        """, (event_name, shoe, comp_type, f"{dt_str}%"))
        
        if cursor.rowcount > 0:
            print(f"Matched: {dt_str} -> {event_name}")
            matched_count += cursor.rowcount
            
    conn.commit()
    conn.close()
    print(f"\nSincronización finalizada. {matched_count} actividades actualizadas con datos de competición.")

if __name__ == "__main__":
    sync_competitions()
