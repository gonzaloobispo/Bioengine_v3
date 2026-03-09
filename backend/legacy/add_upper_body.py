import sqlite3

def add_upper_body():
    exercises = [
        {
            "id": "press_hombros_mancuernas",
            "name": "Press de Hombros con Mancuernas",
            "category": "Fuerza/Hombros",
            "video_url": "https://www.youtube.com/watch?v=qEwKCR5JCog",
            "description": "Ejercicio fundamental para la fuerza vertical del tren superior. Sentado con la espalda recta, empujar las mancuernas desde los hombros hasta extender los brazos sobre la cabeza."
        },
        {
            "id": "elevacion_lateral_mancuernas",
            "name": "Elevación Lateral con Mancuernas",
            "category": "Fuerza/Hombros",
            "video_url": "https://www.youtube.com/watch?v=3VcKaXpzqRo",
            "description": "Aísla la porción media del deltoides. De pie, elevar los brazos lateralmente hasta la altura de los hombros con una ligera flexión de codo. Excelente para ganar amplitud articular del hombro."
        },
        {
            "id": "elevacion_frontal_mancuernas",
            "name": "Elevación Frontal con Mancuernas",
            "category": "Fuerza/Hombros",
            "video_url": "https://www.youtube.com/watch?v=-t7fuZ0KhDA",
            "description": "Enfocado en el deltoides anterior. Levantar ligeramente las mancuernas hacia el frente hasta la línea visual, controlando el descenso sin balancear el tronco."
        },
        {
            "id": "curl_biceps_mancuernas",
            "name": "Curl de Bíceps con Mancuernas",
            "category": "Fuerza/Brazos",
            "video_url": "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
            "description": "Permite un rango de movimiento natural y corrige asimetrías. Supinando (girando) la muñeca durante la subida para máxima activación del bíceps braquial."
        },
        {
            "id": "curl_martillo_mancuernas",
            "name": "Curl Martillo con Mancuernas",
            "category": "Fuerza/Brazos",
            "video_url": "https://www.youtube.com/watch?v=zC3nLlEvin4",
            "description": "Agarre neutro (palmas enfrentadas). Fortalece el músculo braquiorradial y el bíceps, siendo vital para la estabilidad del codo y previene codo de tenista."
        },
        {
            "id": "extension_triceps_mancuerna",
            "name": "Extensión de Tríceps a Una Mano",
            "category": "Fuerza/Brazos",
            "video_url": "https://www.youtube.com/watch?v=_gsUj6O52S0",
            "description": "Por detrás de la cabeza (Copa) o patada atrás. Aísla la cabeza larga del tríceps, esencial para la potencia y aceleración de la raqueta en el impacto."
        },
        {
            "id": "fondo_banco",
            "name": "Fondo en Banco (Tríceps Dips)",
            "category": "Fuerza/Brazos",
            "video_url": "https://www.youtube.com/watch?v=0326dy_-CzM",
            "description": "Usando el peso corporal apoyado en un banco. Flexionar los codos hacia atrás para bajar la cadera. Trabaja pecho inferior, deltoides anterior y tríceps intensamente."
        }
    ]

    conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
    cursor = conn.cursor()
    
    added_count = 0
    for ex in exercises:
        cursor.execute("SELECT id FROM exercises WHERE id = ?", (ex["id"],))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO exercises (id, name, category, video_url, description)
                VALUES (?, ?, ?, ?, ?)
            """, (ex["id"], ex["name"], ex["category"], ex["video_url"], ex["description"]))
            added_count += 1
            print(f"Agregado: {ex['name']}")
        else:
            print(f"Ya existía: {ex['name']}")
            
    conn.commit()
    conn.close()
    print(f"\nSe han insertado {added_count} nuevos ejercicios en la biblioteca.")

if __name__ == '__main__':
    add_upper_body()
