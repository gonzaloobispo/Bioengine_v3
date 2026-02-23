import sqlite3

conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(exercises)")
columns = cursor.fetchall()

print("Schema of exercises table:")
for col in columns:
    print(f"Name: {col[1]}, Type: {col[2]}, NotNull: {col[3]}, Default: {col[4]}, PK: {col[5]}")

conn.close()
