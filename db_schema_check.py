import sqlite3
conn = sqlite3.connect('db/bioengine_v3.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print(f"Tables: {tables}")
for table in tables:
    c.execute(f"PRAGMA table_info({table})")
    print(f"Table {table}: {[r[1] for r in c.fetchall()]}")
conn.close()
