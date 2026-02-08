import logging
import json
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from models.training_schema import AdaptivePlan, TrainingSession, SessionType, MetricType, TargetMetric

logger = logging.getLogger(__name__)

class AdaptiveCoach:
    def __init__(self, athlete_profile: Dict[str, Any]):
        self.profile = athlete_profile # 50yo, 1.76m, 76kg, right knee history
        self.acute_load = 0.0
        self.chronic_load = 0.0

    def analyze_status(self, weight_log: List[Dict], knee_pain_log: List[Dict], activities: List[Dict]) -> Dict[str, Any]:
        """
        The Triage Agent: Analiza carga, peso y dolor.
        """
        # Calcular Carga Aguda (7d) vs Crónica (28d) - Simplificado para el demo
        self.acute_load = sum(a.get('distancia_km', 0) for a in activities[-10:])
        self.chronic_load = sum(a.get('distancia_km', 0) for a in activities[-30:]) / 4.0
        
        # Análisis de Peso
        current_weight = weight_log[-1].get('peso', 76.0) if weight_log else 76.0
        prev_weight = weight_log[-5].get('peso', current_weight) if len(weight_log) >= 5 else current_weight
        weight_increase_pct = ((current_weight - prev_weight) / prev_weight) * 100 if prev_weight > 0 else 0
        
        # Análisis de Dolor de Rodilla
        current_pain = 0
        if knee_pain_log:
            latest_pain = knee_pain_log[-1]
            current_pain = latest_pain.get('value', 0)
        
        status = {
            "weight_alert": weight_increase_pct > 2.0,
            "knee_alert": current_pain > 3,
            "impact_risk": weight_increase_pct > 2.0 and current_pain > 4,
            "current_pain": current_pain,
            "load_ratio": self.acute_load / (self.chronic_load if self.chronic_load > 0 else 1.0)
        }
        
        logger.info(f"Triage Result: {status}")
        return status

    def consult_notebook_methodology(self) -> Dict[str, Any]:
        """
        Knowledge Bridge: Simula la recuperación de reglas del NotebookLM.
        """
        return {
            "rehab_protocol": "Si dolor > 3, sustituir impacto por elíptica o natación.",
            "progression_limit": 1.10, # Max 10% incremento semanal
            "intensity_rule": "No intervalos en asfalto si el peso > 77kg o dolor > 2."
        }

    def evaluate_performance(self, plan_data: str, actual_activities: List[Dict]) -> Dict[str, Any]:
        """
        Evalúa el cumplimiento de un plan finalizado (basado en el JSON almacenado).
        """
        try:
            plan = json.loads(plan_data)
            sessions = plan.get('sessions', [])
        except:
            return {"status": "error", "message": "Invalid plan data"}

        completed_sessions = 0
        total_sessions = len(sessions)
        
        # Mapear actividades por fecha
        act_by_date = {}
        for a in actual_activities:
            f = a.get('fecha', '').split(' ')[0]
            if f: act_by_date[f] = a
        
        for session in sessions:
            s_date = session.get('date')
            if s_date in act_by_date:
                completed_sessions += 1
        
        adherence_pct = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        return {
            "adherence_pct": adherence_pct,
            "completed_sessions": completed_sessions,
            "total_sessions": total_sessions,
            "status": "excelente" if adherence_pct > 80 else "mejorable" if adherence_pct > 50 else "baja",
            "recommendation": "Sobrecarga Progresiva (Subir 10% carga)" if adherence_pct > 80 else "Mantener Nivel" if adherence_pct > 50 else "Semana de Descarga"
        }

    def generate_adaptive_plan(self, current_status: Dict[str, Any], previous_plan: Optional[Dict] = None) -> AdaptivePlan:
        """
        The Planner: Regenera o modifica el plan basado en el estado actual e historial.
        """
        methodology = self.consult_notebook_methodology()
        new_sessions = []
        rationale = ""
        
        if not previous_plan:
            rationale = "Iniciación de ciclo base: Durabilidad Estructural."
            for i in range(7):
                d = date.today() + timedelta(days=i)
                new_sessions.append(TrainingSession(
                    date=d,
                    type=SessionType.STRENGTH if i % 2 == 0 else SessionType.RUNNING,
                    title=f"Base SOTA {i+1}",
                    description="Construcción de base aeróbica y fuerza protectora.",
                    duration_min=45,
                    targets=[TargetMetric(metric_type=MetricType.HR_ZONE, value="Zona 2")]
                ))
        else:
            # Lógica de Adaptación
            if current_status["knee_alert"]:
                rationale = f"Ajuste por dolor (Nivel {current_status['current_pain']}): Sustituyendo impacto por protección articular."
                sessions_raw = previous_plan.get('sessions', [])
                for s in sessions_raw:
                    s_date = date.fromisoformat(s['date']) if isinstance(s['date'], str) else s['date']
                    s_type = SessionType(s['type'])
                    if s_type in [SessionType.RUNNING, SessionType.TENNIS]:
                        s_type = SessionType.BIKE if current_status["current_pain"] < 5 else SessionType.SWIM
                    
                    new_sessions.append(TrainingSession(
                        date=s_date,
                        type=s_type,
                        title=f"Protección: {s_type.value}",
                        description="Ajuste automático para evitar estrés en rodilla.",
                        duration_min=s.get('duration_min', 40),
                        targets=[TargetMetric(metric_type=MetricType.HR_ZONE, value="Zona 1-2")]
                    ))
            else:
                rationale = "Continuando progresión nominal. Buena estabilidad biomecánica detectada."
                # ... lógica de copia simple ...
                for s in previous_plan.get('sessions', []):
                    new_sessions.append(TrainingSession(**s))

        return AdaptivePlan(
            plan_id=f"plan_{date.today().strftime('%Y%m%d')}",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            sessions=new_sessions,
            coach_rationale=rationale,
            risk_level="high" if current_status["knee_alert"] else "nominal"
        )
