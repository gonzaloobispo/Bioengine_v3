import sqlite3
import json

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def read_logs():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    print("\n=== SYSTEM LOGS (Uso del Sistema) ===")
    logs = conn.execute("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 10").fetchall()
    for log in logs:
        print(f"[{log['timestamp']}] {log['event_type']}: {log['description']}")
        if log['data_json']:
            print(f"   Data: {log['data_json']}")

    print("\n=== SYNC LOGS (Comunicacin APIs) ===")
    syncs = conn.execute("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 10").fetchall()
    for s in syncs:
        print(f"[{s['timestamp']}] {s['service']} | {s['status']}: {s['message']}")
    
    conn.close()

if __name__ == "__main__":
    read_logs()
