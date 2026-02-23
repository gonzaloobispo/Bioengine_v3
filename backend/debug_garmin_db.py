import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def debug():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nombre, fecha, fuente, tipo FROM activities ORDER BY fecha DESC LIMIT 10")
    for r in cursor.fetchall():
        print(r)
    conn.close()

if __name__ == "__main__":
    debug()
