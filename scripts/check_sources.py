import sqlite3
import os

db_path = 'db/bioengine_v3.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

print("=== Fuentes de Actividades Incompletas ===")
res = conn.execute("SELECT fuente, COUNT(*) as c FROM activities WHERE (distancia_km = 0 OR distancia_km IS NULL) GROUP BY fuente").fetchall()
for r in res:
    print(f"Fuente: {r['fuente']} | Cantidad: {r['c']}")

print("\n=== Todas las Fuentes en DB ===")
res = conn.execute("SELECT fuente, COUNT(*) as c FROM activities GROUP BY fuente").fetchall()
for r in res:
    print(f"Fuente: {r['fuente']} | Cantidad: {r['c']}")

conn.close()
