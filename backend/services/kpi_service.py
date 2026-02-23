"""
KPI Service - Cálculo de KPIs de Training Intelligence
Calcula métricas avanzadas basadas en datos de Garmin y Withings
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import statistics

def filter_last_n_days(activities: List[Dict], days: int, end_date: Optional[datetime] = None) -> List[Dict]:
    """Filtra actividades de los últimos N días respecto a una fecha final"""
    if end_date is None:
        end_date = datetime.now()
    cutoff = end_date - timedelta(days=days)
    return [
        a for a in activities
        if cutoff <= datetime.fromisoformat(a['fecha'].replace('Z', '+00:00')) <= end_date
    ]

def calculate_training_load_balance(activities: List[Dict], days: int = 7) -> Optional[Dict]:
    """
    Calcula el balance entre carga aeróbica y anaeróbica
    
    Returns:
        {
            'ratio': float,
            'aerobic_total': float,
            'anaerobic_total': float,
            'status': str,  # 'balanced', 'too_aerobic', 'too_anaerobic'
            'recommendation': str
        }
    """
    recent = filter_last_n_days(activities, days)
    
    aerobic_sum = sum(a.get('aerobic_te', 0) or 0 for a in recent)
    anaerobic_sum = sum(a.get('anaerobic_te', 0) or 0 for a in recent)
    
    if anaerobic_sum == 0:
        if aerobic_sum > 0:
            return {
                'ratio': None,
                'aerobic_total': round(aerobic_sum, 1),
                'anaerobic_total': 0,
                'status': 'too_aerobic',
                'recommendation': 'Considera añadir entrenamientos de alta intensidad'
            }
        return None
    
    ratio = aerobic_sum / anaerobic_sum
    
    # Determinar estado
    if ratio > 3.0:
        status = 'too_aerobic'
        recommendation = 'Excelente para construir base aeróbica'
    elif ratio >= 1.5:
        status = 'balanced'
        recommendation = 'Balance ideal entre aeróbico y anaeróbico'
    else:
        status = 'too_anaerobic'
        recommendation = 'Riesgo de sobreentrenamiento, añade más Z2'
    
    return {
        'ratio': round(ratio, 2),
        'aerobic_total': round(aerobic_sum, 1),
        'anaerobic_total': round(anaerobic_sum, 1),
        'status': status,
        'recommendation': recommendation
    }

def calculate_polarization_index(activities: List[Dict], days: int = 30, profile: Optional[Dict] = None) -> Optional[Dict]:
    """
    Calcula el índice de polarización (modelo 80/20)
    
    Si se proporciona profile, intenta recalcular zonas si hay medicación (Atenolol).
    """
    recent = filter_last_n_days(activities, days)
    
    # Si tenemos perfil y medicación, recalculamos la intensidad basada en FC Media
    # Nota: Es una aproximación ya que no tenemos el tiempo por segundo
    use_adjusted = False
    adjusted_zones = None
    if profile:
        from services.context_manager import ContextManager
        age = ContextManager.calculate_age(profile.get('fecha_nacimiento', ''))
        meds = profile.get('medicaciones', [])
        if any("atenolol" in m.lower() for m in meds):
            adjusted_zones = ContextManager.calculate_mhr_and_zones(age, meds)['zones']
            use_adjusted = True

    # Sumar tiempo en cada zona (en segundos)
    z_low = 0
    z_moderate = 0
    z_high = 0

    for a in recent:
        if use_adjusted and a.get('fc_media'):
            # Aproximamos: si la FC media cae en una zona, asignamos toda la duración a esa zona
            # Esto es necesario si los hr_zone_1..5 de Garmin no son fiables bajo medicación
            hr = a.get('fc_media', 0)
            dur = (a.get('duracion_min', 0) or 0) * 60
            
            if hr >= adjusted_zones['Z4']['range'][0]:
                z_high += dur
            elif hr >= adjusted_zones['Z3']['range'][0]:
                z_moderate += dur
            else:
                z_low += dur
        else:
            z_low += (a.get('hr_zone_1', 0) or 0) + (a.get('hr_zone_2', 0) or 0)
            z_moderate += (a.get('hr_zone_3', 0) or 0)
            z_high += (a.get('hr_zone_4', 0) or 0) + (a.get('hr_zone_5', 0) or 0)
    
    total = z_low + z_moderate + z_high
    
    if total == 0:
        return None
    
    # Calcular porcentajes
    z_low_pct = (z_low / total) * 100
    z_moderate_pct = (z_moderate / total) * 100
    z_high_pct = (z_high / total) * 100
    
    # Calcular score de polarización
    score = (z_low + z_high) / z_moderate if z_moderate > 0 else 0
    
    # Determinar modelo de entrenamiento
    if z_low_pct >= 75:
        model = '80/20'
        status = 'excellent'
        recommendation = 'Polarización óptima, sigue así'
    elif z_low_pct >= 60:
        model = 'pyramid'
        status = 'good'
        recommendation = 'Buena distribución, considera más Z2'
    else:
        model = 'threshold'
        status = 'poor'
        recommendation = 'Demasiado Z3, aumenta Z2 y reduce Z3'
    
    return {
        'z_low_pct': round(z_low_pct, 1),
        'z_moderate_pct': round(z_moderate_pct, 1),
        'z_high_pct': round(z_high_pct, 1),
        'score': round(score, 2),
        'model': model,
        'status': status,
        'recommendation': recommendation,
        'total_time_minutes': round(total / 60, 0)
    }

def calculate_hrv_score(health_data: List[Dict], profile: Optional[Dict] = None) -> float:
    """Calcula score de HRV basado en baseline de últimos 7 días con corrección para Atenolol."""
    if not health_data or len(health_data) < 2:
        return 50.0
    
    # Obtener HRV de últimos 7 días
    hrv_values = [h.get('hrv_value') for h in health_data[:7] if h.get('hrv_value')]
    
    if len(hrv_values) < 2:
        return 50.0
    
    # Calcular baseline (promedio de últimos 7 días)
    baseline = statistics.mean(hrv_values)
    current = hrv_values[0]
    
    # Score basado en desviación del baseline
    deviation = ((current - baseline) / baseline) * 100
    
    # Ajuste para Atenolol: Los betabloqueantes tienden a elevar y estabilizar el HRV RMSSD.
    # Un HRV "demasiado bueno" (>15% sobre baseline) bajo medicación debe tomarse con cautela.
    has_atenolol = False
    if profile:
        meds = profile.get('medicaciones', [])
        has_atenolol = any("atenolol" in m.lower() for m in meds)
        
    if has_atenolol and deviation > 15:
        # Dampen the score if deviation is suspiciously high
        deviation = 15 + (deviation - 15) * 0.5

    # Convertir a score 0-100
    # +20% HRV = 100, -20% HRV = 0
    score = 50 + (deviation * 2.5)
    
    return max(0, min(100, score))

def calculate_recovery_quality_score(health_data: List[Dict], profile: Optional[Dict] = None) -> Optional[Dict]:
    """
    Calcula Recovery Quality Score multi-factorial con consciencia clínica.
    """
    if not health_data:
        return None
    
    latest = health_data[0]
    has_atenolol = False
    if profile:
        meds = profile.get('medicaciones', [])
        has_atenolol = any("atenolol" in m.lower() for m in meds)
    
    # Componentes del score
    body_battery_score = latest.get('body_battery') or 50
    stress_score = 100 - (latest.get('stress_level') or 50)
    
    # Sleep score (8 horas = 100)
    sleep_hours = latest.get('sleep_hours') or 6
    sleep_score = min((sleep_hours / 8) * 100, 100)
    
    # HRV score (basado en baseline y corregido por medicación)
    hrv_score = calculate_hrv_score(health_data, profile=profile)
    
    # SpO2 score (98% = 100)
    spo2_avg = latest.get('spo2_avg')
    spo2_score = min((spo2_avg / 98) * 100, 100) if spo2_avg else 50
    
    # Ajuste por Atenolol: El stress_level de Garmin (basado en HRV) suele ser más bajo 
    # bajo medicación. Si el stress_score es muy alto (>90), penalizamos levemente 
    # la confianza para evitar optimismo injustificado.
    if has_atenolol and stress_score > 90:
        stress_score = stress_score * 0.95

    # Calcular RQS ponderado
    rqs = (
        body_battery_score * 0.30 +
        stress_score * 0.25 +
        sleep_score * 0.20 +
        hrv_score * 0.15 +
        spo2_score * 0.10
    )
    
    # Determinar estado y recomendación
    if rqs >= 80:
        status = 'excellent'
        recommendation = 'Listo para entrenar duro'
    elif rqs >= 60:
        status = 'good'
        recommendation = 'Listo para entrenar normal'
    elif rqs >= 40:
        status = 'fair'
        recommendation = 'Entrenar suave o recuperación activa'
    else:
        status = 'poor'
        recommendation = 'Descanso completo recomendado'
    
    return {
        'score': round(rqs, 1),
        'status': status,
        'recommendation': recommendation,
        'components': {
            'body_battery': round(body_battery_score, 1),
            'stress': round(stress_score, 1),
            'sleep': round(sleep_score, 1),
            'hrv': round(hrv_score, 1),
            'spo2': round(spo2_score, 1)
        }
    }

def calculate_aerobic_efficiency(activities: List[Dict], days: int = 30) -> Optional[Dict]:
    """
    Calcula la Eficiencia Aeróbica (Ratio Ritmo / FC) en actividades constantes
    Basado en el concepto de 'Aerobic Decoupling' de Joe Friel
    """
    recent = filter_last_n_days(activities, days)
    # Filtrar solo running y trail con datos de FC y distancia
    running = [
        a for a in recent 
        if (a.get('tipo', '').lower() in ['running', 'trail_running']) 
        and (a.get('fc_media', 0) or 0) > 100 
        and (a.get('distancia_km', 0) or 0) > 3
        and (a.get('duracion_min', 0) or 0) > 15
    ]
    
    if not running:
        return None
    
    efficiencies = []
    for a in running:
        # Velocidad en km/h
        dur_min = a.get('duracion_min', 0)
        dist_km = a.get('distancia_km', 0)
        avg_hr = a.get('fc_media', 0)
        
        if dur_min > 0 and avg_hr > 0:
            speed_kmh = (dist_km / dur_min) * 60
            # Ratio: km/h por cada 100 latidos (para normalizar)
            eff = (speed_kmh / avg_hr) * 100
            efficiencies.append(eff)
    
    if not efficiencies:
        return None
        
    avg_eff = round(statistics.mean(efficiencies), 2)
    
    # Comparar con los 30 días anteriores para ver tendencia
    # (Simplificado por ahora, usaremos umbrales estáticos basados en fitness general)
    if avg_eff > 8.0:
        status = 'excellent'
        recommendation = 'Motor aeróbico muy eficiente'
    elif avg_eff > 6.5:
        status = 'good'
        recommendation = 'Buena base aeróbica'
    else:
        status = 'fair'
        recommendation = 'Sigue construyendo base en Z2'
        
    return {
        'value': avg_eff,
        'status': status,
        'recommendation': recommendation,
        'unit': 'km/h @ 100bpm'
    }

def calculate_training_monotony(activities: List[Dict], days: int = 7) -> Optional[Dict]:
    """
    Calcula la Monotonía del Entrenamiento (Variabilidad de la carga)
    Monotonía = Media Carga Diaria / Desviación Estándar Carga Diaria
    Un valor > 2.0 indica alto riesgo de sobreentrenamiento (Foster, 1998)
    """
    recent = filter_last_n_days(activities, days)
    if not recent:
        return None
        
    # Agrupar carga por día
    loads_by_day = {}
    cutoff = datetime.now() - timedelta(days=days)
    
    # Inicializar todos los días con 0
    for i in range(days):
        d = (datetime.now() - timedelta(days=i)).date().isoformat()
        loads_by_day[d] = 0
        
    for a in recent:
        d = datetime.fromisoformat(a['fecha'].replace('Z', '+00:00')).date().isoformat()
        if d in loads_by_day:
            loads_by_day[d] += (a.get('training_load', 0) or 0)
            
    daily_loads = list(loads_by_day.values())
    
    avg_load = statistics.mean(daily_loads)
    std_dev = statistics.stdev(daily_loads) if len(daily_loads) > 1 else 0
    
    if std_dev == 0:
        monotony = 1.0 # O algún valor base si no hay variabilidad (o solo 1 entrenamiento)
    else:
        monotony = avg_load / std_dev
        
    if monotony > 2.0:
        status = 'risk'
        recommendation = 'Demasiada monotonía, varía intensidades'
    elif monotony > 1.5:
        status = 'warning'
        recommendation = 'Ojo, intenta variar los estímulos'
    else:
        status = 'normal'
        recommendation = 'Buena variabilidad en la carga'
        
    return {
        'value': round(monotony, 2),
        'status': status,
        'recommendation': recommendation,
        'daily_avg': round(avg_load, 1)
    }

def calculate_smart_alerts(kpis: Dict, trends: List[Dict], profile: Optional[Dict] = None) -> List[Dict]:
    """
    Genera alertas inteligentes detectando patrones de riesgo o estancamiento
    """
    alerts = []

    # 0. Alerta Clínica (Alta Prioridad)
    if profile:
        meds = profile.get('medicaciones', [])
        if any("atenolol" in m.lower() for m in meds):
            alerts.append({
                'id': 'med_atenolol',
                'level': 'info',
                'title': 'Protección SOTA: Atenolol activo',
                'message': 'BioEngine está operando en Modo Protegido (Brawner). Tus zonas de FC están ajustadas para tu seguridad clínica.'
            })
    
    # 1. Alerta de Riesgo: Carga sube, Recuperación baja (ventana 7 días)
    if len(trends) >= 7:
        recent_trends = trends[-7:]
        # Pendiente de recuperación (si es negativa, está empeorando)
        rec_values = [t['recovery'] for t in recent_trends if t['recovery'] is not None]
        load_values = [t['load_7d'] for t in recent_trends if t['load_7d'] is not None]
        
        if len(rec_values) >= 5 and len(load_values) >= 5:
            rec_slope = rec_values[-1] - rec_values[0]
            load_slope = load_values[-1] - load_values[0]
            
            if rec_slope < -15 and load_slope > 2:
                alerts.append({
                    'id': 'overreach',
                    'level': 'danger',
                    'title': 'Riesgo de Sobreentrenamiento',
                    'message': 'Tu carga está subiendo mientras tu recuperación cae drásticamente. ¡Riesgo de lesión o enfermedad!'
                })

    # 2. Alerta de Monotonía (Biomecánica)
    mono = kpis.get('monotony')
    if mono and mono['status'] == 'risk':
        alerts.append({
            'id': 'monotony',
            'level': 'warning',
            'title': 'Monotonía Crítica',
            'message': 'Tus entrenamientos son demasiado similares. Varía intensidades para evitar lesiones por repetición.'
        })

    # 3. Alerta de Estancamiento (Eficiencia Plana)
    if len(trends) >= 14:
        eff_values = [t['efficiency'] for t in trends[-14:] if t['efficiency'] is not None]
        if len(eff_values) >= 10:
            eff_slope = eff_values[-1] - eff_values[0]
            if abs(eff_slope) < 0.1 and kpis.get('load_balance', {}).get('aerobic_total', 0) > 10:
                alerts.append({
                    'id': 'plateau',
                    'level': 'info',
                    'title': 'Meseta de Rendimiento',
                    'message': 'Tu eficiencia aeróbica está plana. Quizás es hora de subir la intensidad o cambiar el estímulo.'
                })

    # 4. Alerta de Sueño
    rq = kpis.get('recovery_quality')
    if rq and rq['components'].get('sleep', 100) < 60:
        alerts.append({
            'id': 'sleep',
            'level': 'warning',
            'title': 'Deuda de Sueño',
            'message': 'Tu recuperación está limitada por la falta de descanso. Prioriza dormir más esta noche.'
        })

    return alerts

def calculate_training_intelligence(activities: List[Dict], health_data: List[Dict], profile: Optional[Dict] = None) -> Dict:
    """
    Calcula todos los KPIs de Training Intelligence e incluye alertas y benchmarks de NotebookLM
    """
    # 1. Calcular KPIs actuales
    kpis = {
        'load_balance': calculate_training_load_balance(activities, days=7),
        'polarization': calculate_polarization_index(activities, days=30, profile=profile),
        'recovery_quality': calculate_recovery_quality_score(health_data, profile=profile),
        'aerobic_efficiency': calculate_aerobic_efficiency(activities, days=30),
        'monotony': calculate_training_monotony(activities, days=7)
    }
    
    # 2. Obtener Benchmarks de NotebookLM (Fase 1)
    try:
        from services.kpi_notebook_service import get_kpi_notebook_data
        kpis['notebooklm_benchmarks'] = get_kpi_notebook_data()
    except Exception:
        kpis['notebooklm_benchmarks'] = {}

    # 3. Generar tendencias para el motor de alertas
    trends = calculate_historical_trends(activities, health_data, days=14) # Necesitamos al menos 14 para estancamiento
    
    # 4. Cruzar datos para Alertas Inteligentes
    kpis['alerts'] = calculate_smart_alerts(kpis, trends, profile=profile)
    
    return kpis

def calculate_historical_trends(activities: List[Dict], health_data: List[Dict], days: int = 30, profile: Optional[Dict] = None) -> List[Dict]:
    """
    Genera una serie temporal de KPIs calculados día a día
    """
    trends = []
    hoy = datetime.now().replace(hour=23, minute=59, second=59)
    
    # Pre-calcular fechas ISO para búsqueda rápida
    acts_by_date = {}
    for a in activities:
        d = datetime.fromisoformat(a['fecha'].replace('Z', '+00:00')).date().isoformat()
        if d not in acts_by_date: acts_by_date[d] = []
        acts_by_date[d].append(a)

    # Pre-calcular logs de dolor por fecha
    from services.context_manager import ContextManager
    ctx = ContextManager()
    pain_logs = ctx.get_pain_history(limit=100)
    pain_by_date = {}
    for log in pain_logs:
        # log is a dict: {'date': '2026-02-18', 'level': 0, ...}
        d = log.get('date', '').split('T')[0]
        if d:
            pain_by_date[d] = log.get('level', 0)

    for i in range(days - 1, -1, -1):
        fecha_ref = hoy - timedelta(days=i)
        fecha_str = fecha_ref.date().isoformat()
        
        # Slices de datos hasta el día de referencia
        acts_until_ref = [a for a in activities if datetime.fromisoformat(a['fecha'].replace('Z', '+00:00')).date() <= fecha_ref.date()]
        health_until_ref = [h for h in health_data if datetime.fromisoformat(h['fecha']).date() <= fecha_ref.date()]
        
        # Carga del día
        carga_dia = sum(a.get('training_load', 0) or 0 for a in acts_by_date.get(fecha_str, []))
        
        # Promedio carga 7 días (Fatiga Acumulada - Acute Load)
        carga_7d = sum(
            sum(a.get('training_load', 0) or 0 for a in acts_by_date.get((fecha_ref - timedelta(days=j)).date().isoformat(), []))
            for j in range(7)
        )
        
        # Promedio carga 28 días (Carga Crónica - Chronic Load)
        carga_28d = sum(
            sum(a.get('training_load', 0) or 0 for a in acts_by_date.get((fecha_ref - timedelta(days=j)).date().isoformat(), []))
            for j in range(28)
        )
        
        # Recuperación (RQS) - Limitamos salud a los 30 días previos a fecha_ref para el cálculo de baseline HRV
        rqs_data = calculate_recovery_quality_score(health_until_ref, profile=profile)
        rqs_val = rqs_data['score'] if rqs_data else None
        
        # Eficiencia (Promedio últimos 7 días terminando en fecha_ref)
        # Filtramos acts para el cálculo de eficiencia
        eff_acts = [
            a for a in acts_until_ref 
            if (fecha_ref - timedelta(days=7)).date() <= datetime.fromisoformat(a['fecha'].replace('Z', '+00:00')).date() <= fecha_ref.date()
        ]
        eff_data = calculate_aerobic_efficiency(eff_acts, days=7)
        eff_val = eff_data['value'] if eff_data else None
        
        # ACWR: Acute (7d) / Chronic (28d)
        acwr = 0
        if carga_28d > 0:
            acwr = (carga_7d / 7) / (carga_28d / 28)
        
        # Obtener nivel de dolor registrado este día
        pain_val = pain_by_date.get(fecha_str)

        trends.append({
            'date': fecha_str,
            'recovery': rqs_val,
            'load': round(carga_dia, 1),
            'load_7d': round(carga_7d / 7, 1),
            'load_28d': round(carga_28d / 28, 1),
            'acwr': round(acwr, 2),
            'efficiency': eff_val,
            'pain_level': pain_val
        })
        
    return trends
