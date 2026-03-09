
import sqlite3
import pandas as pd
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("c:/BioEngine_V3/backend")))
from config import DB_PATH

def manual_update_check():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Update
    print("Updating ID 429 cadencia_media to 888...")
    cursor.execute("UPDATE activities SET cadencia_media = 888 WHERE id = (SELECT MAX(id) FROM activities)")
    conn.commit()
    
    # 2. Check
    print("Checking value...")
    df = pd.read_sql_query("SELECT id, cadencia_media FROM activities ORDER BY id DESC LIMIT 1", conn)
    print(df)
    
    conn.close()

if __name__ == "__main__":
    manual_update_check()
