
import sqlite3
import pandas as pd
import pathlib

db_path = pathlib.Path(r"c:\BioEngine_V3\db\bioengine_v3.db")
conn = sqlite3.connect(db_path)

# Check columns in activities
try:
    cols = pd.read_sql_query("PRAGMA table_info(activities)", conn)
    print("Columns in activities table:")
    print(cols['name'].tolist())
except Exception as e:
    print(f"Error checking schema: {e}")

# Adjusted query with likely column names
query = "SELECT id, fecha, tipo, fc_media, fc_max, cadencia_media, fuente FROM activities WHERE tipo LIKE '%Cycl%' OR tipo LIKE '%Bicicleta%' OR tipo LIKE '%Ride%' ORDER BY fecha DESC LIMIT 10"

try:
    df = pd.read_sql_query(query, conn)
    print("\nRecent cycling activities:")
    print(df.to_string())
except Exception as e:
    print(f"\nError querying data: {e}")
finally:
    conn.close()
