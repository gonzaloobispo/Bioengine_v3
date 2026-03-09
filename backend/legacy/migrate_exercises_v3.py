import sqlite3
import json

def migrate_exercises_db():
    conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
    cursor = conn.cursor()

    # Step 1: Add columns if they don't exist
    try:
        cursor.execute("ALTER TABLE exercises ADD COLUMN body_zone TEXT")
        cursor.execute("ALTER TABLE exercises ADD COLUMN primary_muscle TEXT")
        print("Columns `body_zone` and `primary_muscle` added.")
    except sqlite3.OperationalError as e:
        print(f"Columns might already exist: {e}")

    # Step 2: Define mapping for existing exercises
    updates = {
        "sentadilla_espanola": ("Tren Inferior", "Cuádriceps"),
        "isometria_pared": ("Tren Inferior", "Cuádriceps"),
        "puente_gluteo": ("Tren Inferior", "Glúteos"),
        "face_pull": ("Tren Superior", "Hombros Posterior"),
        "psoas_stretch": ("Movilidad/Core", "Psoas/Flexores"),
        "peso_muerto_rumano": ("Tren Inferior", "Isquiotibiales"),
        "plancha_copenhague": ("Core/Estabilidad", "Aductores"),
        "gemelos_excentricos": ("Tren Inferior", "Pantorrillas"),
        "sentadilla_bulgara": ("Tren Inferior", "Cuádriceps/Glúteos"),
        "rotacion_externa_hombro": ("Tren Superior", "Manguito Rotador"),
        "movilidad_toracica": ("Movilidad/Core", "Columna Torácica"),
        "hip_thrust_barra": ("Tren Inferior", "Glúteos"),
        "curl_biceps_barra": ("Tren Superior", "Bíceps"),
        "press_hombros_mancuernas": ("Tren Superior", "Hombros"),
        "elevacion_lateral_mancuernas": ("Tren Superior", "Hombros"),
        "elevacion_frontal_mancuernas": ("Tren Superior", "Hombros Anterior"),
        "curl_biceps_mancuernas": ("Tren Superior", "Bíceps"),
        "curl_martillo_mancuernas": ("Tren Superior", "Braquiorradial"),
        "extension_triceps_mancuerna": ("Tren Superior", "Tríceps"),
        "fondo_banco": ("Tren Superior", "Pecho/Tríceps"),
        "sentadilla_remo_polea": ("Integración Total", "Espalda/Piernas"),
        "foam_roller_cuadriceps": ("Recuperación", "Cuádriceps/Fascia"),
        "prensa_piernas_hsr": ("Tren Inferior", "Cuádriceps/Glúteos"),
        "yoga_movilidad_matutina": ("Recuperación", "Sistema Nervioso"),
        "split_squat_isometrico": ("Tren Inferior", "Cuádriceps/Rodilla")
    }

    # Step 3: Update records
    updated_rows = 0
    for ex_id, (zone, muscle) in updates.items():
        cursor.execute(
            "UPDATE exercises SET body_zone = ?, primary_muscle = ? WHERE id = ?",
            (zone, muscle, ex_id)
        )
        updated_rows += cursor.rowcount

    conn.commit()
    conn.close()
    print(f"Migration completed. Updated {updated_rows} exercise rows.")

if __name__ == '__main__':
    migrate_exercises_db()
