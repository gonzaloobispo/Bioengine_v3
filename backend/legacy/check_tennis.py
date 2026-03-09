import sqlite3

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row

# Ver actividades de tenis en noviembre
rows = conn.execute("SELECT fecha, tipo, distancia_km FROM activities WHERE tipo LIKE '%tennis%' OR tipo LIKE '%tenis%' ORDER BY fecha DESC LIMIT 10").fetchall()
print("Actividades de tenis:")
for r in rows:
    print(dict(r))

conn.close()
