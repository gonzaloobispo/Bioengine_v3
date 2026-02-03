import sqlite3
import json

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row

# Look for trail or competitive runs
query = """
SELECT id, fecha, tipo, distancia_km, duracion_min, fuente 
FROM activities 
WHERE LOWER(tipo) LIKE '%trail%' 
   OR LOWER(tipo) LIKE '%hiking%'
   OR LOWER(fuente) LIKE '%trail%'
   OR LOWER(tipo) LIKE '%carrera%'
LIMIT 20
"""

rows = conn.execute(query).fetchall()
print("Trail/Competition related activities:")
if not rows:
    print("None found with current filter.")
for r in rows:
    print(dict(r))

# Let's also check if there's any 'name' column or similar that I missed
cursor = conn.execute("PRAGMA table_info(activities)")
cols = [c[1] for c in cursor.fetchall()]
print(f"\nActivity table columns: {cols}")

conn.close()
