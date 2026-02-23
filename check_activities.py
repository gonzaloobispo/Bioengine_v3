
import sqlite3

def check_activities_schema():
    conn = sqlite3.connect(r'c:\BioEngine_V3\bioengine.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(activities)")
    columns = cursor.fetchall()
    print("Activities Columns:")
    for col in columns:
        print(f"{col[1]} ({col[2]})")
    conn.close()

if __name__ == '__main__':
    check_activities_schema()
