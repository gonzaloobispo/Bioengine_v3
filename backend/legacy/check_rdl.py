import sqlite3
import json

conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM exercises WHERE id = 'peso_muerto_rumano'")
row = cursor.fetchone()

if row:
    print(json.dumps(dict(row), indent=2))
else:
    print("Not found")

conn.close()
