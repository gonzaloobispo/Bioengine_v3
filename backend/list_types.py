import sqlite3
conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')
cursor = conn.cursor()
cursor.execute('SELECT DISTINCT tipo FROM activities')
types = cursor.fetchall()
print("All unique activity types:")
for t in types:
    print(f" - {t[0]}")
conn.close()
