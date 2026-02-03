import sqlite3

conn = sqlite3.connect('C:/BioEngine_V3/db/bioengine_v3.db')

acts = conn.execute('SELECT COUNT(*) FROM activities').fetchone()[0]
bios = conn.execute('SELECT COUNT(*) FROM biometrics').fetchone()[0]
last_act = conn.execute('SELECT fecha FROM activities ORDER BY fecha DESC LIMIT 1').fetchone()
last_bio = conn.execute('SELECT fecha FROM biometrics ORDER BY fecha DESC LIMIT 1').fetchone()

print(f'Actividades: {acts}')
print(f'  Ultima: {last_act[0] if last_act else "N/A"}')
print(f'Biometrics: {bios}')
print(f'  Ultimo: {last_bio[0] if last_bio else "N/A"}')

conn.close()
