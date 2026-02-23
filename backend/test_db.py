import sqlite3
import json
conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
c = conn.cursor()
c.execute("SELECT id, status FROM training_plans")
for row in c.fetchall():
  id = row[0]
  status = row[1]
  c2 = conn.cursor()
  c2.execute(f"SELECT content FROM training_plans WHERE id={id}")
  plan = json.loads(c2.fetchone()[0])
  for s in plan.get('sessions', []):
    if 'BLOQUEO CLÍNICO' in s.get('description', ''):
      print(f'Plan {id} ({status}) contains BLOQUEO CLINICO on {s.get('date')}')
