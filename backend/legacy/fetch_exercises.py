import sqlite3
import json

conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
cursor = conn.cursor()
cursor.execute('SELECT id, name, category, video_url, description FROM exercises')
exercises = []
for row in cursor.fetchall():
    ex = {
        'id': row[0],
        'name': row[1],
        'category': row[2],
        'video_url': row[3],
        'description': row[4]
    }
    exercises.append(ex)

conn.close()

with open(r'c:\BioEngine_V3\backend\exercises_dump.json', 'w', encoding='utf-8') as f:
    json.dump(exercises, f, indent=4, ensure_ascii=False)
