import sqlite3
import os

db_path = r'c:\BioEngine_V3\db\bioengine_v3.db'
conn = sqlite3.connect(db_path)

# Create exercises table
conn.execute("""
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    muscles TEXT,
    description TEXT,
    video_url TEXT,
    safety_notes TEXT,
    is_master_recommended INTEGER DEFAULT 1
)
""")

# Seed data
exercises = [
    (
        "sentadilla_espanola",
        "Sentadilla Española (Spanish Squat)",
        "Rehab/Fuerza",
        "Cuádriceps, Tendón Rotuliano",
        "Ejercicio isométrico clave para la tendinopatía rotuliana. Se realiza con una banda elástica detrás de las rodillas, anclada a un punto fijo, permitiendo inclinar el torso hacia atrás manteniendo las espinillas verticales.",
        "https://www.youtube.com/watch?v=Jm_C-7w21_M",
        "MANTENER 45s. El dolor no debe superar 3/10. Si el dolor aumenta 24h después, reducir la intensidad.",
        1
    ),
    (
        "isometria_pared",
        "Wall Sit (Isometría en Pared)",
        "Rehab",
        "Cuádriceps",
        "Sentadilla estática apoyado en la pared a 90 grados. Reduce la inhibición cortical y provee analgesia inmediata.",
        "https://www.youtube.com/watch?v=Xk9JvX9209Y",
        "Ideal como pre-calentamiento para el tenis si hay dolor de rodilla.",
        1
    ),
    (
        "puente_gluteo",
        "Puente de Glúteo Iso",
        "Movilidad/Fuerza",
        "Glúteo Mayor, Isquios",
        "Tendido boca arriba, elevar la cadera y mantener la contracción. Fundamental para 'apagar' el psoas hiperactivo.",
        "https://www.youtube.com/watch?v=8bbE6adQTpM",
        "Concentrar la fuerza en los talones. No arquear la espalda baja.",
        1
    ),
    (
        "face_pull",
        "Face Pull con Banda",
        "Hombro/Postura",
        "Deltoides posterior, Trapecio",
        "Tracción de banda hacia la cara separando los codos. Vital para la salud del manguito rotador en jugadores de tenis.",
        "https://www.youtube.com/watch?v=V8H6LzEq2pE",
        "Movimiento controlado. Enfocarse en la retracción escapular.",
        1
    ),
    (
        "psoas_stretch",
        "Estiramiento Caballero (Psoas)",
        "Movilidad",
        "Psoas Ilíaco, Flexores de Cadera",
        "Posición de caballero, retroversión pélvica y ligero avance. Libera la tensión acumulada por estar sentado.",
        "https://www.youtube.com/watch?v=YQMPtU7p0_4",
        "No arquear la espalda. Mantener glúteo del lado estirado contraído.",
        1
    )
]

conn.executemany("INSERT OR REPLACE INTO exercises VALUES (?, ?, ?, ?, ?, ?, ?, ?)", exercises)

conn.commit()
conn.close()
print("Exercises table created and seeded.")
