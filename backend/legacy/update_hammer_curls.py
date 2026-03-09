import sqlite3

conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
cursor = conn.cursor()

muscles = "Bíceps, Braquial, Braquiorradial (Antebrazo)"
safety_notes = "Mantén los codos pegados al cuerpo durante todo el movimiento. Evita usar impulso balanceando el torso o la espalda baja. Baja el peso de forma controlada (fase excéntrica) para proteger el tendón del bíceps y el codo."
description = """Ejecución:
1. De pie o sentado, sujeta una mancuerna en cada mano con un agarre neutro (palmas enfrentadas hacia el cuerpo).
2. Mantén la espalda recta, pecho arriba y el core activo.
3. Flexiona los codos para elevar las mancuernas hacia los hombros, apretando los bíceps y antebrazos en la parte alta.
4. Desciende las mancuernas de manera controlada y suave hasta la extensión completa de los brazos."""

cursor.execute('''
    UPDATE exercises 
    SET muscles = ?, safety_notes = ?, description = ?
    WHERE id = 'curl_martillo_mancuernas'
''', (muscles, safety_notes, description))

conn.commit()
print(f"Updated {cursor.rowcount} rows for Curl Martillo.")
conn.close()
