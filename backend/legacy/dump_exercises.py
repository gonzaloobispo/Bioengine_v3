import sqlite3
import os

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def dump_exercises():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, category, video_url FROM exercises")
    rows = cursor.fetchall()
    
    import json
    data = []
    for row in rows:
        data.append({
            "id": row['id'],
            "name": row['name'],
            "category": row['category'],
            "video_url": row['video_url']
        })
    
    with open(r"c:\BioEngine_V3\backend\exercises_dump.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Dumped to exercises_dump.json")
    
    conn.close()

if __name__ == "__main__":
    dump_exercises()
