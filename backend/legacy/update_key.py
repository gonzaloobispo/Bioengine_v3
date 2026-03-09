import sqlite3
import json

db_path = 'C:/BioEngine_V3/db/bioengine_v3.db'
new_key = 'AIzaSyA9yPB_FdPF9VIMupVYy2TpPtCTz1IiANc'

conn = sqlite3.connect(db_path)
conn.execute(
    'UPDATE secrets SET credentials_json = ? WHERE service = ?',
    (json.dumps({'GEMINI_API_KEY': new_key}), 'gemini')
)
conn.commit()
conn.close()
print('API Key de Gemini actualizada correctamente!')
