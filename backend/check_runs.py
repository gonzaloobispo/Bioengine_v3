import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def check():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, nombre, fecha, fuente, tipo FROM activities WHERE tipo='running' ORDER BY fecha DESC LIMIT 5")
    rows = c.fetchall()
    if not rows:
        print("No running activities at all in the DB!")
    for r in rows:
        print(r)
        
    c.execute("SELECT COUNT(*) FROM activities WHERE tipo='running'")
    print("Total running acts:", c.fetchone()[0])

if __name__ == '__main__':
    check()
