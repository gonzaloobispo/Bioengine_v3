import sqlite3

db_path = 'db/bioengine_v3.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("Actualizando esquema de base de datos para métricas Pro...")

# 1. Tabla activities
c.execute("PRAGMA table_info(activities)")
cols_act = [r[1] for r in c.fetchall()]
for col, col_type in [('training_load', 'REAL'), ('aerobic_te', 'REAL'), ('anaerobic_te', 'REAL')]:
    if col not in cols_act:
        print(f"Añadiendo {col} a activities...")
        c.execute(f"ALTER TABLE activities ADD COLUMN {col} {col_type}")

# 2. Tabla daily_health
c.execute("PRAGMA table_info(daily_health)")
cols_health = [r[1] for r in c.fetchall()]
for col, col_type in [('body_battery', 'INTEGER'), ('resting_hr', 'INTEGER'), ('stress_level', 'INTEGER')]:
    if col not in cols_health:
        print(f"Añadiendo {col} a daily_health...")
        c.execute(f"ALTER TABLE daily_health ADD COLUMN {col} {col_type}")

conn.commit()
conn.close()
print("Migración Pro completada.")
