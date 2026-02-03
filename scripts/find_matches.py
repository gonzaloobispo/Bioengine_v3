import sqlite3
import os
from datetime import datetime, timedelta

db_path = 'db/bioengine_v3.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

# Get all incomplete Apple records
apple_records = conn.execute("SELECT * FROM activities WHERE fuente = 'Apple'").fetchall()

print(f"Buscando coincidencias para {len(apple_records)} registros de Apple...")

matches = 0
for apple in apple_records:
    try:
        # Normalize date format
        a_date_str = apple['fecha'].replace('T', ' ')
        a_date = datetime.strptime(a_date_str[:19], '%Y-%m-%d %H:%M:%S')
    except:
        continue
        
    start = (a_date - timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
    end = (a_date + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
    
    # Check Garmin Cloud for matches
    res = conn.execute("SELECT * FROM activities WHERE fuente != 'Apple' AND fecha BETWEEN ? AND ?", (start, end)).fetchone()
    if res:
        matches += 1
        print(f"Match found!")
        print(f"  Apple  (ID {apple['id']}): {apple['fecha']} | {apple['tipo']}")
        print(f"  {res['fuente']} (ID {res['id']}): {res['fecha']} | {res['tipo']} | Dist: {res['distancia_km']}")

print(f"\nTotal matches: {matches}")
conn.close()
