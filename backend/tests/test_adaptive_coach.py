import sys
import os
from datetime import date, timedelta
from typing import List

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.coach_logic import AdaptiveCoach
from models.training_schema import AdaptivePlan, TrainingSession, SessionType, TargetMetric, MetricType

def create_mock_plan():
    return AdaptivePlan(
        plan_id="initial_plan",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=7),
        sessions=[
            TrainingSession(
                date=date.today() + timedelta(days=1),
                type=SessionType.RUNNING,
                title="Intervalos 1k",
                description="6x1km a ritmo de umbral.",
                duration_min=60,
                targets=[TargetMetric(metric_type=MetricType.PACE, value="4:30 min/km")]
            ),
            TrainingSession(
                date=date.today() + timedelta(days=2),
                type=SessionType.TENNIS,
                title="Práctica de Servicio",
                description="Enfoque en técnica y potencia.",
                duration_min=90
            )
        ],
        coach_rationale="Plan inicial del mesociclo."
    )

def test_pain_scenario():
    print("\n--- ESCENARIO: DOLOR DE RODILLA (Nivel 5) ---")
    coach = AdaptiveCoach({"age": 50, "weight": 76})
    
    # Datos sintéticos
    weight_log = [{"date": "2026-02-01", "value": 76.0}, {"date": "2026-02-07", "value": 76.2}]
    knee_pain = [{"date": "2026-02-07", "value": 5}]
    activities = [] # Vacío para simplificar
    
    status = coach.analyze_status(weight_log, knee_pain, activities)
    prev_plan = create_mock_plan()
    
    adaptive_plan = coach.generate_adaptive_plan(status, prev_plan)
    
    print(f"RATIONALE: {adaptive_plan.coach_rationale}")
    for s in adaptive_plan.sessions:
        print(f"  Session: {s.date} | New Type: {s.type} | Title: {s.title}")
    
    assert adaptive_plan.risk_level == "high"
    assert adaptive_plan.sessions[0].type == SessionType.SWIM # Porque dolor > 3

def test_healthy_scenario():
    print("\n--- ESCENARIO: ATLETA NOMINAL ---")
    coach = AdaptiveCoach({"age": 50, "weight": 76})
    
    weight_log = [{"date": "2026-02-07", "value": 76.0}]
    knee_pain = [{"date": "2026-02-07", "value": 1}]
    activities = [{"distance": 10}, {"distance": 10}]
    
    status = coach.analyze_status(weight_log, knee_pain, activities)
    prev_plan = create_mock_plan()
    adaptive_plan = coach.generate_adaptive_plan(status, prev_plan)
    
    print(f"RATIONALE: {adaptive_plan.coach_rationale}")
    assert adaptive_plan.risk_level == "nominal"

if __name__ == "__main__":
    try:
        test_pain_scenario()
        test_healthy_scenario()
        print("\n✅ TODOS LOS TESTS DE ADAPTACIÓN PASARON.")
    except Exception as e:
        print(f"\n❌ ERROR EN TESTS: {e}")
