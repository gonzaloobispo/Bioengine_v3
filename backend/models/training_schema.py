from pydantic import BaseModel, Field
from typing import List, Optional, Union
from enum import Enum
from datetime import date

class SessionType(str, Enum):
    RUNNING = "Running"
    TENNIS = "Tenis"
    STRENGTH = "Fuerza"
    RECOVERY = "Descanso/Recuperación"
    ELLIPTICAL = "Elíptica"
    BIKE = "Bici"
    SWIM = "Natación"
    MOBILITY = "Movilidad/Core"

class MetricType(str, Enum):
    HR_ZONE = "Zona FC"
    PACE = "Ritmo"
    POWER = "Potencia"
    RPE = "RPE (Esfuerzo)"

class TargetMetric(BaseModel):
    metric_type: MetricType
    value: str = Field(..., description="Ej: 'Zona 2', '5:30 min/km', '150W'")

class WorkoutItem(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[Union[int, str]] = None
    intensity: Optional[str] = None # Ej: "70% RM", "RPE 8"
    duration_min: Optional[int] = None

class TrainingSession(BaseModel):
    date: date
    type: SessionType
    title: str
    description: str
    duration_min: int
    targets: List[TargetMetric] = []
    workout_list: List[WorkoutItem] = []
    is_completed: bool = False
    notes: Optional[str] = None

class AdaptivePlan(BaseModel):
    plan_id: str
    start_date: date
    end_date: date
    sessions: List[TrainingSession]
    coach_rationale: str = Field(..., description="Explicación del Coach sobre la adaptación realizada")
    risk_level: str = "nominal"
