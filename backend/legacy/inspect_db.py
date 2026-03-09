import sqlite3
import os

db_path = r'c:\BioEngine_V3\db\bioengine_v3.db'
conn = sqlite3.connect(db_path)
res = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in res]
print("Tables:", tables)

for table in tables:
    res = conn.execute(f"PRAGMA table_info({table})")
    columns = [r[1] for r in res]
    print(f"Table {table}: {columns}")

conn.close()
