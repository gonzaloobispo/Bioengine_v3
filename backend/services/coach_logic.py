from __future__ import annotations
import logging
import json
import sqlite3
import os
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from enum import Enum
from models.training_schema import AdaptivePlan, TrainingSession, SessionType, MetricType, TargetMetric, WorkoutItem
from config import DB_PATH

class CoachState(Enum):
    STABILIZATION = "estabilizacion"
    PROGRESSION = "progresion"
    REHABILITATION = "rehabilitacion"

logger = logging.getLogger(__name__)

class AdaptiveCoach:
    def __init__(self, athlete_profile: Dict[str, Any]):
        self.profile = athlete_profile
        self.acute_load = 0.0
        self.chronic_load = 0.0
        self.workout_library = {} # Ahora cargada dinámicamente desde la BD

    def analyze_status(self, weight_log: List[Dict], knee_pain_log: List[Dict], activities: List[Dict]) -> Dict[str, Any]:
        """
        The Triage Agent: Analiza carga, peso y dolor para determinar el estado térmico.
        """
        # Calcular Carga Aguda (7d) vs Crónica (28d)
        self.acute_load = sum(a.get('distancia_km', 0) for a in activities[-7:])
        self.chronic_load = sum(a.get('distancia_km', 0) for a in activities[-28:]) / 4.0
        
        load_ratio = self.acute_load / (self.chronic_load if self.chronic_load > 0 else 1.0)
        
        # Análisis de Peso
        current_weight = weight_log[-1].get('peso', 76.0) if weight_log else 76.0
        
        # Análisis de Dolor de Rodilla (Detectar tendencia)
        recent_pain = [p.get('intensidad', 0) for p in knee_pain_log[-3:]]
        avg_pain = sum(recent_pain) / len(recent_pain) if recent_pain else 0
        current_pain = recent_pain[-1] if recent_pain else 0
        
        # Lógica de Transición de Estados (State Machine)
        if current_pain > 3 or avg_pain > 2.5:
            state = CoachState.REHABILITATION
        elif load_ratio > 1.3 or current_weight > 78:
            state = CoachState.STABILIZATION
        else:
            state = CoachState.PROGRESSION

        status = {
            "state": state.value,
            "weight_alert": current_weight > 77.5,
            "knee_alert": current_pain > 0,
            "clinical_lock": current_pain > 3, # Hard-stop flag
            "current_pain": current_pain,
            "load_ratio": round(load_ratio, 2)
        }
        
        logger.info(f"Triage Result: {status} | Chosen State: {state.name}")
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
        Evalúa el cumplimiento de un plan finalizado o activo (basado en el JSON almacenado).
        Se implementa coincidencia flexible por semana calendario y tipo de actividad.
        """
        try:
            plan = json.loads(plan_data)
            sessions = plan.get('sessions', [])
        except:
            return {"status": "error", "message": "Invalid plan data"}
    
        completed_sessions = 0
        total_sessions = len(sessions)
        
        # Procesar actividades reales
        available_activities = []
        for a in actual_activities:
            f = a.get('fecha', '').split(' ')[0]
            if f:
                try:
                    dt = date.fromisoformat(f)
                    year, week, _ = dt.isocalendar()
                    tipo = (a.get('tipo') or '').lower()
                    available_activities.append({
                        'raw': a,
                        'date': dt,
                        'date_str': f,
                        'year': year,
                        'week': week,
                        'tipo': tipo,
                        'used': False
                    })
                except ValueError:
                    pass
                    
        # Función heurística para mapear SessionType (Ej. "Running", "Tenis") a tipo de Garmin ("running", "tennis")
        def match_type(session_type: str, act_tipo: str) -> bool:
            s = session_type.lower()
            t = act_tipo.lower()
            if 'run' in s or 'correr' in s: return 'run' in t
            if 'teni' in s or 'tennis' in s: return 'tennis' in t or 'teni' in t
            if 'fuerza' in s or 'strength' in s: return 'strength' in t or 'fuerza' in t or 'pesas' in t
            if 'bici' in s or 'bike' in s or 'cycling' in s or 'ciclismo' in s: return 'cycl' in t or 'bici' in t or 'bike' in t
            if 'natación' in s or 'swim' in s: return 'swim' in t or 'natación' in t
            if 'elíptica' in s or 'elliptical' in s: return 'elliptical' in t or 'elíptica' in t
            return False
            
        session_status = []
        
        for idx, session in enumerate(sessions):
            s_date_str = session.get('date')
            s_type = session.get('type', '')
            
            is_completed = False
            matched_date = None
            
            if s_date_str:
                try:
                    s_dt = date.fromisoformat(s_date_str)
                    s_year, s_week, _ = s_dt.isocalendar()
                    
                    # Prioridad 1: Fecha Exacta & Tipo Exacto
                    for act in available_activities:
                        if not act['used'] and act['date'] == s_dt and match_type(s_type, act['tipo']):
                            is_completed = True
                            matched_date = act['date_str']
                            act['used'] = True
                            break
                            
                    # Prioridad 2: Fecha Exacta (cualquier tipo, fallback)
                    if not is_completed:
                        for act in available_activities:
                            if not act['used'] and act['date'] == s_dt:
                                is_completed = True
                                matched_date = act['date_str']
                                act['used'] = True
                                break
                                
                except ValueError:
                    pass
                    
            if is_completed:
                completed_sessions += 1
                
            session_status.append({
                'session_index': idx,
                'is_completed': is_completed,
                'matched_date': matched_date
            })
        
        adherence_pct = round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0
        
        return {
            "adherence_pct": adherence_pct,
            "completed_sessions": completed_sessions,
            "total_sessions": total_sessions,
            "status": "excelente" if adherence_pct > 80 else "mejorable" if adherence_pct > 50 else "baja",
            "recommendation": "Sobrecarga Progresiva (Subir 10% carga)" if adherence_pct > 80 else "Mantener Nivel" if adherence_pct > 50 else "Semana de Descarga",
            "session_status": session_status
        }    

    def _fetch_and_group_exercises(self) -> Dict[str, Dict[str, List[Dict]]]:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT name, body_zone, primary_muscle, description FROM exercises WHERE body_zone IS NOT NULL AND primary_muscle IS NOT NULL")
            rows = cursor.fetchall()
            
            grouped = {}
            for r in rows:
                zone = r['body_zone']
                muscle = r['primary_muscle']
                if zone not in grouped:
                    grouped[zone] = {}
                if muscle not in grouped[zone]:
                    grouped[zone][muscle] = []
                
                grouped[zone][muscle].append({
                    "name": r['name'],
                    "description": r['description']
                })
            conn.close()
            return grouped
        except Exception as e:
            logger.error(f"Error fetching DB exercises: {e}")
            return {}

    def _get_alternating_workout(self, session_type: SessionType, session_index: int = 0) -> List[WorkoutItem]:
        """Genera una rutina variada dinámica obteniendo info desde la BD. Agrupa por zona y alterna músculos."""
        if session_type == SessionType.STRENGTH:
            grouped = self._fetch_and_group_exercises()
            if not grouped:
                return [WorkoutItem(name="Isometría Básica (BD Error)", sets=3, reps=1, intensity="Wall Sit")]
            
            idx = (session_index // 2) % 10 # Rotación amplia
            routine = []
            
            # Orden de zonas para una rutina lógica (Core -> Inferior -> Superior -> Movilidad -> Integración)
            target_zones = ["Core/Estabilidad", "Tren Inferior", "Tren Superior", "Integración Total", "Movilidad/Core", "Recuperación"]
            
            for zone in target_zones:
                if zone not in grouped:
                    continue
                
                # Seleccionar músculos de esta zona basándonos en la alternancia
                muscles = list(grouped[zone].keys())
                muscles.sort()
                
                # Limitar cantidad de ejercicios por zona para no sobrecargar la sesión
                max_exercises = 3 if zone in ["Tren Superior", "Tren Inferior"] else 1
                
                start_m = (idx * max_exercises) % len(muscles)
                selected_muscles = []
                for i in range(max_exercises):
                    selected_muscles.append(muscles[(start_m + i) % len(muscles)])
                selected_muscles = list(dict.fromkeys(selected_muscles)) # Deduplicar manteniendo el orden
                
                for muscle in selected_muscles:
                    ex_list = grouped[zone][muscle]
                    ex_list.sort(key=lambda x: x['name'])
                    ex = ex_list[idx % len(ex_list)] # Alternar el ejercicio específico dentro del mismo músculo
                    
                    alternatives = [e['name'] for e in ex_list if e['name'] != ex['name']]
                    alt_text = f" (Alterna: {', '.join(alternatives)})" if alternatives else ""
                    
                    routine.append(WorkoutItem(
                        name=ex['name'],
                        sets=3,
                        reps="10-15",
                        intensity=f"Foco: {muscle}{alt_text}"
                    ))
            
            return routine
        
        elif session_type == SessionType.RUNNING:
            from services.context_manager import ContextManager
            age = ContextManager.calculate_age(self.profile.get('fecha_nacimiento', ''))
            meds = self.profile.get('medicaciones', [])
            zones_data = ContextManager.calculate_mhr_and_zones(age, meds)
            z2_min, z2_max = zones_data['zones']['Z2']['range']
            
            intensity_tag = f"Z2 ({z2_min}-{z2_max} lpm)"
            if "Brawner" in zones_data['formula']:
                intensity_tag += " [Ajuste Betabloqueante]"

            return [
                WorkoutItem(name="Calentamiento Movilidad", sets=1, duration_min=5),
                WorkoutItem(name="Trote Z2", sets=1, duration_min=30, intensity=intensity_tag),
                WorkoutItem(name="Rectas Técnicas", sets=4, reps="100m", intensity="90% técnica"),
                WorkoutItem(name="Vuelta a la calma", sets=1, duration_min=5)
            ]
        elif session_type == SessionType.BIKE:
            return [
                WorkoutItem(name="Calentamiento", sets=1, duration_min=10, intensity="Z1-Z2"),
                WorkoutItem(name="Rodaje Cadencia Fluida", sets=1, duration_min=30, intensity="85-95 rpm (Ciclismo)"),
                WorkoutItem(name="Vuelta a la calma", sets=1, duration_min=5)
            ]
        
        return []

    def _get_default_workout(self, session_type: SessionType) -> List[WorkoutItem]:
        # Redirigir a la nueva lógica con variedad
        return self._get_alternating_workout(session_type, 0)

    def generate_adaptive_plan(self, current_status: Dict[str, Any], previous_plan: Optional[Dict] = None, start_date_override: Optional[date] = None) -> AdaptivePlan:
        """
        The Planner: Regenera o modifica el plan basado en el estado (STABILIZATION, PROGRESSION, REHABILITATION).
        """
        methodology = self.consult_notebook_methodology()
        new_sessions = []
        state = current_status.get("state", "progresion")
        
        base_date = start_date_override or date.today()
        
        # Determinar rationale basado en estado
        if state == "rehabilitacion":
            rationale = f"Fase Clínica: REHABILITACIÓN. Prioridad absoluta en curación de tejidos. Sustitución de impacto."
        elif state == "estabilizacion":
            rationale = f"Fase Controlada (Hipertrofia Base): ESTABILIZACIÓN. Foco en ciclismo y fuerza sin impacto."
        else:
            rationale = f"Fase Dinámica (Hipertrofia): PROGRESIÓN. Desarrollo muscular mediante fuerza y cardiovascular en ciclismo."

        sessions_source = previous_plan.get('sessions', []) if previous_plan else []
        plan_days = 9 # Cambiar a ciclo de 9 días
        
        # Patrón base de 9 días: 
        # 0: Fuerza, 1: Fuerza, 2: Ciclismo/Cardio, 3: Descanso, 4: Fuerza, 5: Fuerza, 6: Ciclismo/Cardio, 7: Descanso, 8: Movilidad
        
        # Generar sesiones desde cero o adaptar previas
        for i in range(plan_days):
            d = base_date + timedelta(days=i)
            day_in_cycle = i % 9
            is_weekend = d.weekday() in [5, 6]
            
            # REGLA OBLIGATORIA: Ciclismo sábado y domingo (Bici siempre los fines de semana)
            if is_weekend:
                s_type = SessionType.BIKE
                title = "Ciclismo de fin de semana (Fijo)"
                desc = "Cardio sin impacto reservado estrictamente para sábados y domingos."
                duration = 60
            else:
                # Asignación por default del ciclo de 9 días (lunes a viernes)
                if day_in_cycle in [3, 7]:
                    s_type = SessionType.RECOVERY
                    title = "Descanso Pasivo"
                    desc = "Recuperación de tendones biológica recomendada por AI Coach."
                    duration = 0
                elif day_in_cycle == 8:
                    s_type = SessionType.MOBILITY
                    title = "Sesión de Movilidad y Core"
                    desc = "Estabilización y preparación para el siguiente ciclo."
                    duration = 30
                elif day_in_cycle in [2, 6]:
                    s_type = SessionType.BIKE
                    title = "Ciclismo Aeróbico Base Z2"
                    desc = "Cardio sin impacto asfáltico para capacidad aeróbica."
                    duration = 45
                else:
                    s_type = SessionType.STRENGTH
                    title = f"Entrenamiento Fuerza {state.capitalize()}"
                    desc = "Sobrecarga progresiva para hipertrofia y fortalecimiento estabilizador."
                    duration = 45
                
            # Regla de Rehabilitación Severa
            if state == "rehabilitacion" or current_status.get("clinical_lock"):
                if s_type == SessionType.BIKE and current_status.get("current_pain", 0) > 5:
                    s_type = SessionType.SWIM
                    desc = "BLOQUEO CLÍNICO: Dolor agudo. Sustitución a Natación."
                elif s_type == SessionType.STRENGTH:
                    title = "Rehabilitación y Fortalecimiento Isométrico"
                    desc = "Fase Clínica: Prioridad en curación de tejidos."
                    duration = 30
            
            new_sessions.append(TrainingSession(
                date=d,
                type=s_type,
                title=title,
                description=desc,
                duration_min=duration,
                targets=[TargetMetric(metric_type=MetricType.HR_ZONE, value="Zona 1-2")] if s_type != SessionType.RECOVERY else [],
                workout_list=self._get_alternating_workout(s_type, i) if s_type != SessionType.RECOVERY else []
            ))

        return AdaptivePlan(
            plan_id=f"plan_{state}_{base_date.strftime('%Y%m%d')}",
            start_date=base_date,
            end_date=base_date + timedelta(days=plan_days),
            sessions=new_sessions,
            coach_rationale=rationale,
            risk_level="high" if state == "rehabilitacion" else "medium" if state == "estabilizacion" else "nominal"
        )
