import sys
import json
import argparse

def check_vitals(rhr, avg_rhr, hrv, avg_hrv, sleep_hours):
    anomalies = []
    status = "GREEN"
    action = "NONE"
    
    # 1. Análisis de Frecuencia Cardíaca en Reposo (RHR)
    # RHR > 15% sobre promedio = Signo de enfermedad o sobreentrenamiento agudo
    if avg_rhr > 0:
        rhr_diff_percent = ((rhr - avg_rhr) / avg_rhr) * 100
        if rhr_diff_percent > 15:
            anomalies.append({
                "metric": "RHR",
                "value": f"{rhr} bpm",
                "status": "RED",
                "msg": f"Pulso en reposo anormalmente alto (+{rhr_diff_percent:.1f}%). Posible infección o fatiga extrema."
            })
            status = "RED"
        elif rhr_diff_percent > 8:
            anomalies.append({
                "metric": "RHR",
                "value": f"{rhr} bpm",
                "status": "YELLOW",
                "msg": f"Pulso elevado (+{rhr_diff_percent:.1f}%). Precaución."
            })
            if status == "GREEN": status = "YELLOW"

    # 2. Análisis de Variabilidad (HRV)
    # Caída > 40% es alerta roja
    if avg_hrv > 0:
        hrv_diff_percent = ((hrv - avg_hrv) / avg_hrv) * 100
        if hrv_diff_percent < -40:
            anomalies.append({
                "metric": "HRV",
                "value": f"{hrv} ms",
                "status": "RED",
                "msg": "VFC desplomada. Sistema nervioso parasimpático suprimido."
            })
            status = "RED"
        elif hrv_diff_percent < -20:
             anomalies.append({
                "metric": "HRV",
                "value": f"{hrv} ms",
                "status": "YELLOW",
                "msg": "VFC baja. Recuperación incompleta."
            })
             if status == "GREEN": status = "YELLOW"

    # 3. Análisis de Sueño
    if sleep_hours < 4:
        anomalies.append({
            "metric": "Sueño",
            "value": f"{sleep_hours} h",
            "status": "RED",
            "msg": "Privación severa de sueño. Riesgo de lesión cognitiva y física."
        })
        status = "RED" 
    elif sleep_hours < 6:
        anomalies.append({
            "metric": "Sueño",
            "value": f"{sleep_hours} h",
            "status": "YELLOW",
            "msg": "Sueño insuficiente."
        })
        if status == "GREEN": status = "YELLOW"

    # Determinar Acción Final
    if status == "RED":
        action = "STOP_ALL"
    elif status == "YELLOW":
        action = "MODIFY_ROUTINE"

    output = {
        "summary": {
            "status": status,
            "action_required": action
        },
        "anomalies": anomalies
    }
    
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--rhr', type=float, required=True)
    parser.add_argument('--avg_rhr', type=float, default=50)
    parser.add_argument('--hrv', type=float, required=True)
    parser.add_argument('--avg_hrv', type=float, default=60)
    parser.add_argument('--sleep', type=float, default=7.5)
    
    args = parser.parse_args()
    
    res = check_vitals(args.rhr, args.avg_rhr, args.hrv, args.avg_hrv, args.sleep)
    print(json.dumps(res, indent=2, ensure_ascii=False))
