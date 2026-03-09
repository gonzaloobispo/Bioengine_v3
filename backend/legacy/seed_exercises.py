import sqlite3

def seed_exercises():
    exercises = [
        {
            "id": "sentadilla_espanola",
            "name": "Sentadilla Española (Spanish Squat)",
            "category": "Rehab/Fuerza",
            "video_url": "https://www.youtube.com/watch?v=xK94aXh-13M",
            "description": "Ejercicio isométrico clave para la tendinopatía rotuliana. Se realiza con una banda elástica detrás de las rodillas, anclada a un punto fijo, permitiendo inclinar el torso hacia atrás manteniendo las espinillas verticales."
        },
        {
            "id": "isometria_pared",
            "name": "Wall Sit (Isometría en Pared)",
            "category": "Rehab",
            "video_url": "https://www.youtube.com/watch?v=y-wV4Venusw",
            "description": "Sentadilla estática apoyado en la pared a 90 grados. Reduce la inhibición cortical y provee analgesia inmediata para el tendón rotuliano."
        },
        {
            "id": "puente_gluteo",
            "name": "Puente de Glúteo Iso",
            "category": "Movilidad/Fuerza",
            "video_url": "https://www.youtube.com/watch?v=wAQqCQBObKs",
            "description": "Tendido boca arriba, elevar la cadera y mantener la contracción. Fundamental para 'apagar' el psoas hiperactivo y activar glúteos."
        },
        {
            "id": "face_pull",
            "name": "Face Pull con Banda",
            "category": "Hombro/Postura",
            "video_url": "https://www.youtube.com/watch?v=0Po47vvj9g4",
            "description": "Tracción de banda hacia la cara separando los codos. Vital para la salud del manguito rotador y compensar la postura cifótica del tenis."
        },
        {
            "id": "psoas_stretch",
            "name": "Estiramiento Caballero (Psoas)",
            "category": "Movilidad",
            "video_url": "https://www.youtube.com/watch?v=Z8Y2JkQvBnk",
            "description": "Posición de caballero, retroversión pélvica y ligero avance. Libera la tensión acumulada por estar sentado y correr largas distancias."
        },
        {
            "id": "peso_muerto_rumano",
            "name": "Peso Muerto Rumano (RDL)",
            "category": "Fuerza",
            "video_url": "https://www.youtube.com/watch?v=JCXUYuzwNrM",
            "description": "Fortalecimiento principal de la cadena posterior (isquiotibiales y glúteos), crucial para la prevención de desgarros en sprints."
        },
        {
            "id": "plancha_copenhague",
            "name": "Plancha Copenhague",
            "category": "Prevención/Tenis",
            "video_url": "https://www.youtube.com/watch?v=wHaqiU3mK4s",
            "description": "Ejercicio isométrico para la musculatura aductora (ingle). Fundamental para jugadores de tenis debido a los desplazamientos laterales."
        },
        {
            "id": "gemelos_excentricos",
            "name": "Elevación de Gemelos (Fase Excéntrica)",
            "category": "Rehab/Running",
            "video_url": "https://www.youtube.com/watch?v=XpYf-z3qN98",
            "description": "Subir con ambos pies (fase concéntrica) y bajar lentamente solo con uno (excéntrica). Estándar de oro para tendinopatía aquílea."
        },
        {
            "id": "sentadilla_bulgara",
            "name": "Sentadilla Búlgaras",
            "category": "Fuerza Unilateral",
            "video_url": "https://www.youtube.com/watch?v=2C-uNgKwPLE",
            "description": "Trabajo asimétrico de piernas que corrige desbalances de fuerza entre ambas extremidades."
        },
        {
            "id": "rotacion_externa_hombro",
            "name": "Rotación Externa de Hombro",
            "category": "Rehab/Tenis",
            "video_url": "https://www.youtube.com/watch?v=A_iINX-e5zE",
            "description": "Fortalecimiento de los rotadores externos. Compensa la excesiva rotación interna del servicio de tenis."
        },
        {
            "id": "movilidad_toracica",
            "name": "Rotación Torácica (Open Book)",
            "category": "Movilidad",
            "video_url": "https://www.youtube.com/watch?v=1Dk5eMv1Xh4",
            "description": "Mejora la rotación de la columna torácica. Disminuye la carga sobre los hombros y espalda baja al golpear y correr."
        }
    ]

    conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
    cursor = conn.cursor()
    
    # Clear existing exercises to avoid duplicates or keeping the broken ones
    cursor.execute("DELETE FROM exercises")
    
    for ex in exercises:
        cursor.execute("""
            INSERT INTO exercises (id, name, category, video_url, description)
            VALUES (?, ?, ?, ?, ?)
        """, (ex["id"], ex["name"], ex["category"], ex["video_url"], ex["description"]))
        
    conn.commit()
    conn.close()
    
    print(f"Successfully inserted {len(exercises)} exercises into the database.")

if __name__ == '__main__':
    seed_exercises()
