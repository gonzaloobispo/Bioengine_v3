import sqlite3

conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
cursor = conn.cursor()

muscles = "Isquiotibiales, Glúteos, Espalda Baja (Erectores Espinales), Core."
safety_notes = "Mantén la espalda recta y el core contraído. La flexión ocurre desde la cadera (bisagra), no desde las rodillas ni la zona lumbar. Controla la bajada y evita arquear la espalda. Si sientes dolor o molestia en la zona lumbar, reduce el peso."
description = """Ejecución:
1. De pie, sostén mancuernas o una barra frente a ti con un agarre prono. Rodillas *ligeramente* flexionadas pero fijas.
2. Empuja las caderas hacia atrás, manteniendo el peso pegado a las piernas y la espalda perfectamente recta (Pecho arriba).
3. Baja hasta sentir el estiramiento profundo en los isquiotibiales (generalmente un poco más abajo de la rodilla).
4. Contrae fuerte los glúteos e isquiotibiales y empuja la cadera hacia adelante para regresar a la posición vertical."""

cursor.execute('''
    UPDATE exercises 
    SET muscles = ?, safety_notes = ?, description = ?
    WHERE id = 'peso_muerto_rumano'
''', (muscles, safety_notes, description))

conn.commit()
print(f"Updated {cursor.rowcount} rows.")
conn.close()
