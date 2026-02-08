import sqlite3
import os

DB_PATH = r'c:\BioEngine_V3\db\bioengine_v3.db'

def audit():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Cycling
    cur.execute("SELECT SUM(distancia_km), COUNT(*) FROM activities WHERE lower(tipo) IN ('cycling', 'ciclismo', 'bicicleta', 'bike')")
    res = cur.fetchone()
    print(f"--- CYCLING AUDIT ---")
    print(f"Total KM in DB: {res[0]}")
    print(f"Total Sessions in DB: {res[1]}")
    
    # Last few cycling activities
    cur.execute("SELECT fecha, nombre, distancia_km FROM activities WHERE lower(tipo) IN ('cycling', 'ciclismo', 'bicicleta', 'bike') ORDER BY fecha DESC LIMIT 5")
    rows = cur.fetchall()
    print("\nRecent cycling activities:")
    for r in rows:
        print(f"  {r[0]} | {r[1]} | {r[2]} km")
        
    conn.close()

if __name__ == "__main__":
    audit()
