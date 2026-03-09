import sqlite3

def add_bicep_curl():
    ex = {
        "id": "curl_biceps_barra",
        "name": "Curl de Bíceps con Barra",
        "category": "Fuerza/Brazos",
        "video_url": "https://www.youtube.com/watch?v=kwG2ipFRgXc",
        "description": "Ejercicio clásico de pie para aislar y construir fuerza en los bíceps. Se sostiene la barra a la anchura de los hombros y se flexiona el codo subiendo el peso hacia el pecho sin balancear el torso."
    }

    conn = sqlite3.connect(r'c:\BioEngine_V3\db\bioengine_v3.db')
    cursor = conn.cursor()
    
    # Check if exists to avoid duplicates
    cursor.execute("SELECT id FROM exercises WHERE id = ?", (ex["id"],))
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO exercises (id, name, category, video_url, description)
            VALUES (?, ?, ?, ?, ?)
        """, (ex["id"], ex["name"], ex["category"], ex["video_url"], ex["description"]))
        conn.commit()
        print(f"Agregado exitosamente: {ex['name']}")
    else:
        print(f"El ejercicio {ex['name']} ya existe.")
        
    conn.close()

if __name__ == '__main__':
    add_bicep_curl()
