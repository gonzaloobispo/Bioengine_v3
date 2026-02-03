import sys
import json
import argparse

def calculate_macros(daily_base_kcal, acwr, session_duration_min, session_rpe, weight_kg):
    # Valores por defecto (si no hay PDF parseado aún, usamos constantes conservadoras)
    # Suponemos un usuario de 75kg si no se da peso
    if not weight_kg: weight_kg = 75.0
    
    # 1. Calcular Gasto de Sesión (Estimado)
    # METs: Run suave ~8, Run fuerte ~11.5. Usamos RPE para estimar.
    # RPE 1-10. 
    # METs estimados = 6 + (RPE * 0.7)  -> RPE 5 = 9.5 METs
    estimated_mets = 6 + (session_rpe * 0.7)
    session_kcal_burn = (estimated_mets * 3.5 * weight_kg / 200) * session_duration_min
    
    # 2. Factor de Ajuste por ACWR (Carga Aguda vs Crónica)
    # Si ACWR > 1.3, el cuerpo está bajo stress alto -> Necesita soporte extra.
    acwr_multiplier = 1.0
    acwr_msg = "Carga Normal"
    
    if acwr > 1.3:
        acwr_multiplier = 1.15 # +15% Kcal base por stress sistémico
        acwr_msg = "⚠️ Carga Aguda ALTA. Necesitas superávit para recuperar."
    elif acwr < 0.8:
        acwr_multiplier = 0.95 # -5% (Ligero recorte en descarga)
        acwr_msg = "📉 Semana de Descarga. Mantenimiento estricto."
    
    # 3. Cálculo Final
    target_kcal = (daily_base_kcal * acwr_multiplier) + (session_kcal_burn * 0.8) 
    # Solo reponemos el 80% de lo quemado para evitar sobreestimación de relojes
    
    # Redondeo
    target_kcal = round(target_kcal, -1)
    
    # 4. Distribución de Macros (Simplificada)
    # Proteína: 2g/kg (Fijo para preservar músculo)
    protein_g = round(2.0 * weight_kg)
    protein_kcal = protein_g * 4
    
    # Grasas: 1g/kg (Salud hormonal)
    fat_g = round(1.0 * weight_kg)
    fat_kcal = fat_g * 9
    
    # Carbos: El resto
    remaining_kcal = target_kcal - (protein_kcal + fat_kcal)
    carbs_g = round(remaining_kcal / 4)
    if carbs_g < 100: carbs_g = 100 # Mínimo vital
    
    # 5. Recomendaciones Específicas
    tips = []
    if session_duration_min > 90:
        tips.append("Consume 30-60g de Carbohidratos (Geles/Isotónico) DURANTE la sesión.")
    if session_rpe > 8:
        tips.append("Post-entreno obligatorio: Carbos rápidos + Proteína (ej. Batido o Leche con chocolate).")
    if acwr > 1.3:
        tips.append("Añade una porción extra de carbohidratos en la cena para mejorar glucógeno mañana.")

    output = {
        "status": "success",
        "inputs": {
            "base": daily_base_kcal,
            "session_burn_est": round(session_kcal_burn)
        },
        "target": {
            "kcal": target_kcal,
            "macros": {
                "protein_g": protein_g,
                "carbs_g": carbs_g,
                "fats_g": fat_g
            }
        },
        "context": acwr_msg,
        "tips": tips
    }
    
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--base_kcal', type=float, default=2400)
    parser.add_argument('--acwr', type=float, default=1.0)
    parser.add_argument('--duration', type=float, default=0) # mins
    parser.add_argument('--rpe', type=float, default=5)
    parser.add_argument('--weight', type=float, default=75)
    
    args = parser.parse_args()
    
    res = calculate_macros(args.base_kcal, args.acwr, args.duration, args.rpe, args.weight)
    print(json.dumps(res, indent=2, ensure_ascii=False))
