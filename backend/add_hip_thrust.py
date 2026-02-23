import sqlite3

def add_hip_thrust():
    ex = {
        "id": "hip_thrust_barra",
        "name": "Hip Thrust con Barra",
        "category": "Fuerza/Glúteos",
        "video_url": "https://www.youtube.com/watch?v=SEdqd1n0cvg",
        "description": "El mejor constructor de fuerza en glúteos. Espalda alta apoyada en un banco, barra sobre la cadera. Se baja el peso y se sube contrayendo fuertemente los glúteos en la parte superior. Aumenta la potencia para el sprint y el saque de tenis."
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
    add_hip_thrust()
