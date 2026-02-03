import sqlite3

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row

rows = conn.execute('SELECT * FROM sync_logs ORDER BY rowid DESC LIMIT 5').fetchall()
for r in rows:
    print(dict(r))

conn.close()
