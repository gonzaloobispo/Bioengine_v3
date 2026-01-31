import sqlite3
conn = sqlite3.connect('db\db\bioengine_v3.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table_name in tables:
    print(f"\nTable: {table_name[0]}")
    cursor.execute(f"PRAGMA table_info({table_name[0]});")
    for row in cursor.fetchall():
        print(row)
conn.close()
