
columns = [
    "fecha", "tipo", "distancia_km", "duracion_min", "calorias", 
    "fc_media", "fc_max", "elevacion_m", "cadencia_media", "fuente", 
    "nombre", "training_load", "aerobic_te", "anaerobic_te", 
    "training_effect_label", "hr_zone_1", "hr_zone_2", "hr_zone_3", 
    "hr_zone_4", "hr_zone_5", "velocidad_media", "velocidad_maxima", 
    "elevacion_perdida"
]

print(f"Total columns: {len(columns)}")
for i, col in enumerate(columns):
    print(f"Index {i}: {col}")

# Simulating sql_values based on my code reading
# 0: fecha
# 1: tipo
# 2: dist
# 3: dur
# 4: cal
# 5: avgHR
# 6: maxHR
# 7: elev_ganada -> elevacion_m ? Wait!
# 8: cadencia -> cadencia_media ? Wait!

# Let's check sync_service.py exact lines again via view_file
