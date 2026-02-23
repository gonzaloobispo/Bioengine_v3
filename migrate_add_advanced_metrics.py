"""
Migración: Añadir columnas de métricas avanzadas de Garmin
Añade training_load, aerobic_te, anaerobic_te, training_effect_label y hr_zone_1-5
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('db/bioengine_v3.db')
    c = conn.cursor()
    
    print("🔄 Iniciando migración de métricas avanzadas...")
    
    # Verificar si las columnas ya existen
    c.execute("PRAGMA table_info(activities)")
    existing_columns = [row[1] for row in c.fetchall()]
    
    columns_to_add = [
        ('training_load', 'REAL'),
        ('aerobic_te', 'REAL'),
        ('anaerobic_te', 'REAL'),
        ('training_effect_label', 'TEXT'),
        ('hr_zone_1', 'INTEGER'),
        ('hr_zone_2', 'INTEGER'),
        ('hr_zone_3', 'INTEGER'),
        ('hr_zone_4', 'INTEGER'),
        ('hr_zone_5', 'INTEGER')
    ]
    
    added_count = 0
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            print(f"  ➕ Añadiendo columna: {col_name} ({col_type})")
            c.execute(f"ALTER TABLE activities ADD COLUMN {col_name} {col_type}")
            added_count += 1
        else:
            print(f"  ✅ Columna ya existe: {col_name}")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Migración completada: {added_count} columnas añadidas")
    print("   La base de datos ahora soporta métricas avanzadas de Garmin")

if __name__ == '__main__':
    migrate()
