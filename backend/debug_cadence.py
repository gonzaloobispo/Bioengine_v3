
import sqlite3
import pandas as pd
from pathlib import Path

# Use absolute path to DB
DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def check_cadence():
    conn = sqlite3.connect(DB_PATH)
    
    # Query specific columns for cycling activities
    query = """
    SELECT id, fecha, tipo, cadencia_media
    FROM activities 
    WHERE tipo LIKE '%cycling%' OR tipo LIKE '%bicicleta%' 
    ORDER BY fecha DESC 
    LIMIT 5
    """
    
    try:
        df = pd.read_sql_query(query, conn)
        print("Recent Cycling Activities Data (FECHA DESC):")
        print(df.to_string())
        
    except Exception as e:
        print(f"Error querying DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_cadence()
