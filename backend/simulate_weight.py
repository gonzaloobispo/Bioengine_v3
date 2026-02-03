import sqlite3

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row

# Ver biometrics cerca del 9 y 10 de noviembre con peso
print("Biometrics del 5 al 15 noviembre 2025:")
rows = conn.execute("""
    SELECT fecha, peso FROM biometrics 
    WHERE fecha >= '2025-11-05' AND fecha <= '2025-11-15'
    ORDER BY fecha DESC
""").fetchall()
for r in rows:
    print(f"  {r['fecha']} -> peso: {r['peso']}")

# Simular lo que haría el frontend para la actividad del 10/11
print("\nSimulación para actividad 2025-11-10T20:23:53:")
act_date = '2025-11-10T20:23:53'
rows = conn.execute("""
    SELECT fecha, peso FROM biometrics 
    WHERE fecha <= ?
    ORDER BY fecha DESC
    LIMIT 1
""", (act_date,)).fetchall()
for r in rows:
    print(f"  Encontrado: {r['fecha']} -> peso: {r['peso']}")

conn.close()
