import sqlite3

conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
cursor = conn.cursor()

# Map primary_muscle to muscles where muscles is NULL
cursor.execute('''
    UPDATE exercises 
    SET muscles = primary_muscle 
    WHERE muscles IS NULL AND primary_muscle IS NOT NULL
''')

conn.commit()
print(f"Updated {cursor.rowcount} exercises with their primary muscle.")
conn.close()
