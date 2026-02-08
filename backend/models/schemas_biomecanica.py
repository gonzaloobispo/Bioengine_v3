"""
Módulo de esquemas estrictos para validación biomecánica en BioEngine V3.
Cumple con el estándar SOTA 2026 para seguridad médica.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import date

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class KneeValgusRisk(BaseModel):
    """Análisis específico de riesgo de valgo de rodilla"""
    angle_degrees: float = Field(..., description="Ángulo detectado en la fase de apoyo")
    risk_level: RiskLevel
    recommendation: str = Field(..., description="Ejercicio correctivo específico (ej: Clamshells)")

class GaitAnalysis(BaseModel):
    """Validación de análisis de pisada (Running/Trail)"""
    cadence_spm: int = Field(..., ge=120, le=220)
    pronation_type: str = Field(..., pattern="^(Overpronation|Neutral|Supination)$")
    knee_valgus_assessment: KneeValgusRisk
    strike_type: str = Field(..., description="Forefoot, Midfoot, or Rearfoot")
    asymmetry_pct: float = Field(0.0, description="Diferencia de carga entre pierna izq/der")

class TennisFatigue(BaseModel):
    """Detección de fatiga biomecánica en Tenis Master"""
    serve_speed_loss_pct: float = Field(..., description="Pérdida de velocidad en el servicio")
    reaction_time_ms: int = Field(..., description="Tiempo de reacción en red")
    stroke_efficiency: float = Field(..., ge=0.0, le=1.0)
    injury_warning: bool = Field(False, description="¿Se detectan patrones de sobrecarga?")
    fatigue_score: float = Field(..., ge=0, le=10)

class AthleteBiometrics2026(BaseModel):
    """Modelo maestro para outputs de salud BioEngine V3"""
    gait: Optional[GaitAnalysis] = None
    tennis_fatigue: Optional[TennisFatigue] = None
    clinical_notes: str = Field(..., description="Observaciones médicas del AI Coach")
    next_step: str = Field(..., description="Acción inmediata recomendada")

class RiskAssessment(BaseModel):
    """Evaluación de riesgo generada por el Cerebro Clínico (Gemini 3 Pro)"""
    risk_level: str = Field(..., pattern="^(BAJO|MODERADO|ALTO)$")
    observations: List[str]
    recommendation: str
    clinical_rationale: str
    asymmetry_alert: bool
    detected_at: date = Field(default_factory=date.today)
