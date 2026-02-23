import sqlite3

db_path = 'db/bioengine_v3.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("Expandiendo esquema para métricas avanzadas de Garmin...")

# 1. Tabla activities - Training Effect y Zonas Cardíacas
c.execute("PRAGMA table_info(activities)")
cols_act = [r[1] for r in c.fetchall()]

activity_fields = [
    ('training_effect_label', 'TEXT'),
    ('hr_zone_1', 'INTEGER'),
    ('hr_zone_2', 'INTEGER'),
    ('hr_zone_3', 'INTEGER'),
    ('hr_zone_4', 'INTEGER'),
    ('hr_zone_5', 'INTEGER')
]

for col, col_type in activity_fields:
    if col not in cols_act:
        print(f"Añadiendo {col} a activities...")
        c.execute(f"ALTER TABLE activities ADD COLUMN {col} {col_type}")

# 2. Tabla daily_health - SpO2, Respiración, Pisos
c.execute("PRAGMA table_info(daily_health)")
cols_health = [r[1] for r in c.fetchall()]

health_fields = [
    ('spo2_avg', 'INTEGER'),
    ('spo2_min', 'INTEGER'),
    ('respiration_avg', 'REAL'),
    ('floors_ascended', 'REAL')
]

for col, col_type in health_fields:
    if col not in cols_health:
        print(f"Añadiendo {col} a daily_health...")
        c.execute(f"ALTER TABLE daily_health ADD COLUMN {col} {col_type}")

conn.commit()
conn.close()
print("Migración completa de métricas avanzadas finalizada.")
