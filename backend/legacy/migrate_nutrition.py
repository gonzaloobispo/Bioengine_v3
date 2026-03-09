import sqlite3
import os

db_path = r'c:\BioEngine_V3\db\bioengine_v3.db'
conn = sqlite3.connect(db_path)

# Create nutrition table
conn.execute("""
CREATE TABLE IF NOT EXISTS nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    protein_g REAL,
    carbs_g REAL,
    fats_g REAL,
    calories INTEGER,
    water_l REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Check if it has data
res = conn.execute("SELECT count(*) FROM nutrition")
count = res.fetchone()[0]

if count == 0:
    # Add some mock data for the last 3 days
    from datetime import datetime, timedelta
    today = datetime.now()
    for i in range(3):
        d = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        conn.execute("INSERT INTO nutrition (date, protein_g, carbs_g, fats_g, calories, water_l, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
                     (d, 165.5 - i*5, 120.0 + i*10, 55.0, 1850 - i*50, 2.5, "Post-bariátrico ok. Prioridad proteína."))

conn.commit()
conn.close()
print("Nutrition table created and populated.")
