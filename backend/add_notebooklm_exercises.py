import sqlite3

def add_notebooklm_exercises():
    exercises = [
        {
            "id": "sentadilla_remo_polea",
            "name": "Sentadilla con Remo (Squat to Row)",
            "category": "Integración/Movilidad",
            "video_url": "https://www.youtube.com/watch?v=FjtuAzaA4p0",
            "description": "Fundamental en el Modelo NASM (Integración). Tras despertar el glúteo, se conecta la fuerza de empuje de las piernas con la tracción de la espalda. Vital para sincronizar la cadena posterior en el saque de tenis."
        },
        {
            "id": "foam_roller_cuadriceps",
            "name": "Liberación Miofascial: Cuádriceps y TFL (Foam Roller)",
            "category": "Inhibición/Recuperación",
            "video_url": "https://www.youtube.com/watch?v=F0ZkIeP8Ghc",
            "description": "Relaja la sobrecarga de la fascia lata y cuádriceps tras correr. Evita que un psoas extremadamente tenso 'apague' neurológicamente al glúteo mayor."
        },
        {
            "id": "prensa_piernas_hsr",
            "name": "Prensa de Piernas Lenta y Pesada (Protocolo HSR)",
            "category": "Rehab/Fuerza",
            "video_url": "https://www.youtube.com/watch?v=UqE-5y7lQxA",
            "description": "Fase 1 del protocolo Master 49+. Heavy Slow Resistance: Bajar el peso en 3 segundos y subirlo en 3 segundos. Remodela el tendón rotuliano sin impacto articular excesivo."
        },
        {
            "id": "yoga_movilidad_matutina",
            "name": "Rutina de Yoga / Movilidad Articular (10 min)",
            "category": "Mind-Body/Longevidad",
            "video_url": "https://www.youtube.com/watch?v=4vTJHUDB5ak",
            "description": "Práctica de baja intensidad para reducir el cortisol matutino y optimizar la Variabilidad de Frecuencia Cardíaca (HRV). Contrarresta la 'cinética de recuperación alterada' celular."
        },
        {
            "id": "split_squat_isometrico",
            "name": "Split Squat Isométrico (Zancada Mantenida)",
            "category": "Isometría Analgésica",
            "video_url": "https://www.youtube.com/watch?v=vV_x1w3uJ4A",
            "description": "Mantener la posición profunda (rodilla trasera casi tocando el piso) por 45 segundos. Genera analgesia inmediata alterando la inhibición cortical de la rodilla antes de jugar."
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
    print(f"\nSe han insertado {added_count} ejercicios clínicos en la biblioteca.")

if __name__ == '__main__':
    add_notebooklm_exercises()
