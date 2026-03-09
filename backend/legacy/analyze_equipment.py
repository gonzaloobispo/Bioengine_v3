import sqlite3
import json

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

def calculate_equipment_usage():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM activities")
    activities = cursor.fetchall()
    
    stats = {
        "Running (Kayano/Brooks)": {"km": 0, "sesiones": 0, "desde": None, "hasta": None},
        "Trail (Hoka/NB)": {"km": 0, "sesiones": 0, "desde": None, "hasta": None},
        "Ciclismo (Trek)": {"km": 0, "sesiones": 0, "desde": None, "hasta": None},
        "Tenis (Babolat)": {"km": 0, "sesiones": 0, "desde": None, "hasta": None}
    }
    
    for act in activities:
        tipo = act['tipo'].lower()
        nombre = (act['nombre'] or "").lower()
        dist = act['distancia_km'] or 0
        elev = act['elevacion_m'] or 0
        fecha = act['fecha']
        
        cat = None
        if "trail" in tipo or "hiking" in tipo or "trail" in nombre or elev > 100:
            cat = "Trail (Hoka/NB)"
        elif "running" in tipo or "carrera" in tipo or "run" in tipo:
            cat = "Running (Kayano/Brooks)"
        elif "cycling" in tipo or "ciclismo" in tipo:
            cat = "Ciclismo (Trek)"
        elif "tenis" in tipo or "tennis" in tipo:
            cat = "Tenis (Babolat)"

        if cat:
            stats[cat]["km"] += dist
            stats[cat]["sesiones"] += 1
            if not stats[cat]["desde"] or fecha < stats[cat]["desde"]: stats[cat]["desde"] = fecha
            if not stats[cat]["hasta"] or fecha > stats[cat]["hasta"]: stats[cat]["hasta"] = fecha

    conn.close()
    return stats

if __name__ == "__main__":
    usage = calculate_equipment_usage()
    print("📊 REPORTE DE USO DE EQUIPAMIENTO (BioEngine DB):")
    print(json.dumps(usage, indent=2))
