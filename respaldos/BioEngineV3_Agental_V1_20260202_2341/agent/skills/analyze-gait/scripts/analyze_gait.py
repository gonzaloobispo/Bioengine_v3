import sys
import json
import argparse

def analyze_gait(cadence, gct, oscillation, balance_l, balance_r):
    findings = []
    risk_level = "GREEN"
    efficiency = "HIGH"
    
    # 1. Análisis de Cadencia (Pasos por minuto)
    # Rango óptimo general: > 170
    if cadence < 160:
        findings.append({
            "metric": "Cadencia",
            "value": cadence,
            "status": "RED",
            "msg": "Cadencia crítica. Riesgo alto de impacto en articulaciones.",
            "recommendation": "Usar metrónomo a 165-170 spm en próximas sesiones."
        })
        risk_level = "RED"
    elif cadence < 170:
        findings.append({
            "metric": "Cadencia",
            "value": cadence,
            "status": "YELLOW",
            "msg": "Cadencia mejorable. Un poco baja para tu altura.",
            "recommendation": "Intentar acortar zancada ligeramente."
        })
        if risk_level != "RED": risk_level = "YELLOW"
    else:
        findings.append({
            "metric": "Cadencia",
            "value": cadence,
            "status": "GREEN",
            "msg": "Cadencia óptima. Buena gestión del impacto.",
            "recommendation": "Mantener este ritmo."
        })

    # 2. Análisis de Tiempo de Contacto (GCT en ms)
    # < 250ms es eficiente para amateurs
    if gct > 280:
        findings.append({
            "metric": "GCT",
            "value": gct,
            "status": "RED",
            "msg": "Pisada muy pesada. Demasiado tiempo en el suelo.",
            "recommendation": "Ejercicios de pliometría (saltos) para mejorar reactividad."
        })
        efficiency = "LOW"
        risk_level = "RED"
    elif gct > 250:
        findings.append({
            "metric": "GCT",
            "value": gct,
            "status": "YELLOW",
            "msg": "Tiempo de contacto aceptable pero mejorable.",
            "recommendation": "Foco en 'despegar' rápido del suelo."
        })
        if efficiency == "HIGH": efficiency = "MEDIUM"
    else:
        findings.append({
            "metric": "GCT",
            "value": gct,
            "status": "GREEN",
            "msg": "Contacto reactivo y eficiente.",
            "recommendation": None
        })

    # 3. Análisis de Asimetría (Balance L/R)
    # Diferencia > 1.5% es alerta
    diff = abs(balance_l - balance_r)
    if diff > 1.5:
        heavier_side = "Izquierda" if balance_l > balance_r else "Derecha"
        findings.append({
            "metric": "Asimetría",
            "value": f"L:{balance_l}% / R:{balance_r}%",
            "status": "RED" if diff > 3 else "YELLOW",
            "msg": f"Desbalance significativo. Cargas más a la {heavier_side}.",
            "recommendation": f"Evaluar fuerza unilateral en pierna {heavier_side}."
        })
        if risk_level != "RED": risk_level = "YELLOW"
        efficiency = "MEDIUM"

    output = {
        "summary": {
            "risk_level": risk_level,
            "efficiency": efficiency
        },
        "findings": findings
    }
    
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze Gait Metrics')
    parser.add_argument('--cadence', type=float, required=True)
    parser.add_argument('--gct', type=float, default=0)
    parser.add_argument('--oscillation', type=float, default=0)
    parser.add_argument('--balance_l', type=float, default=50.0)
    parser.add_argument('--balance_r', type=float, default=50.0)
    
    args = parser.parse_args()
    
    result = analyze_gait(args.cadence, args.gct, args.oscillation, args.balance_l, args.balance_r)
    print(json.dumps(result, indent=2, ensure_ascii=False))
