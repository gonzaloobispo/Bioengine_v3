import sqlite3
DB_PATH = r"c:\BioEngine_V3\bioengine_v3.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
act_count = c.execute("SELECT count(*) FROM activities").fetchone()[0]
bio_count = c.execute("SELECT count(*) FROM biometrics").fetchone()[0]
print(f"Actividades: {act_count}")
print(f"Biometria: {bio_count}")
conn.close()
