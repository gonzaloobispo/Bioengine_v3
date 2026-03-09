import sqlite3, json, sys
sys.path.append('c:/BioEngine_V3/backend')
from services.coach_logic import AdaptiveCoach

conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute('SELECT * FROM training_plans ORDER BY id DESC LIMIT 1')
plans = c.fetchall()

coach = AdaptiveCoach({})

for p in plans:
    plan_id = p['id']
    content = p['content']
    start_date = p['start_date']
    end_date = p['end_date']
    
    # fetch activities
    c.execute("SELECT * FROM activities WHERE strftime('%Y-%m-%d', fecha) >= ? AND strftime('%Y-%m-%d', fecha) <= ?", (start_date, end_date))
    activities = [dict(row) for row in c.fetchall()]
    
    # evaluate
    evaluation = coach.evaluate_performance(content, activities)
    
    # save back
    c.execute("UPDATE training_plans SET evaluation=? WHERE id=?", 
        (json.dumps(evaluation), plan_id))
    print(f"Plan {plan_id} evaluated with {evaluation.get('adherence_pct')}% adherence.")

conn.commit()
conn.close()
