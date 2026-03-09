import sqlite3

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row

# Ver biometrics de noviembre 2025
rows = conn.execute("SELECT fecha, peso FROM biometrics WHERE fecha LIKE '2025-11%' ORDER BY fecha DESC LIMIT 10").fetchall()
print("Biometrics de noviembre 2025:")
for r in rows:
    print(dict(r))

# Ver el rango de fechas de biometrics
print("\nRango de biometrics:")
min_date = conn.execute("SELECT MIN(fecha) as min_f FROM biometrics").fetchone()
max_date = conn.execute("SELECT MAX(fecha) as max_f FROM biometrics").fetchone()
print(f"Min: {min_date['min_f']}")
print(f"Max: {max_date['max_f']}")

conn.close()
