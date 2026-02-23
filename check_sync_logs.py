
import sqlite3
import os

def check_logs():
    db_path = r'c:\BioEngine_V3\bioengine.db'
    print(f"Checking logs in: {db_path}")
    if not os.path.exists(db_path):
        print("DATABASE FILE NOT FOUND at path!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT timestamp, service, status, message FROM sync_logs ORDER BY timestamp DESC LIMIT 20")
    rows = cursor.fetchall()
    
    print("Last 5 Sync Logs:")
    for row in rows:
        print(row)
    conn.close()

if __name__ == '__main__':
    check_logs()
