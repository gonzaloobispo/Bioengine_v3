import sqlite3
import os
path = r'C:\BioEngine_V3\db\bioengine_v3.db'
print(os.path.exists(path))
conn = sqlite3.connect(path)
cursor = conn.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
for row in cursor:
    print("TABLE:", row[0])
    print(row[1])
    print("-" * 40)
