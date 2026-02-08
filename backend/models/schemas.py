from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class ActivitySchema(BaseModel):
    """
    Schema para validar datos de actividades importadas (Apple/Garmin).
    """
    id: Optional[Union[str, int]] = None
    fecha: Union[datetime, str]
    tipo: str = Field(..., description="Tipo de actividad (Run, Cycle, Strength)")
    distancia_km: float = Field(default=0.0, ge=0, description="Distancia en kilómetros")
    duracion_min: float = Field(default=1.0, gt=0, description="Duración en minutos")
    calorias: Optional[int] = Field(default=0, ge=0)
    avg_hr: Optional[int] = Field(None, ge=30, le=220, alias="fc_media")
    max_hr: Optional[int] = Field(None, ge=30, le=240, alias="fc_max")
    fuente: Optional[str] = "Unknown"
    nombre: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "ignore"
    
    @validator('tipo')
    def normalize_type(cls, v):
        return v.capitalize()

class BodyCompositionSchema(BaseModel):
    """
    Schema para composición corporal (tabla 'biometrics' actual).
    """
    id: Optional[int] = None
    fecha: str # SQLite lo guarda como texto YYYY-MM-DD
    peso: float = Field(gt=30, lt=200)
    grasa_pct: Optional[float] = Field(None, ge=0, le=60)
    masa_muscular_kg: Optional[float] = None
    fuente: Optional[str] = None

class DailyVitalsSchema(BaseModel):
    """
    Schema para signos vitales (Skills de Emergencia/Recuperación).
    """
    date: datetime
    rhr: int = Field(ge=30, le=120, description="Resting Heart Rate")
    hrv: Optional[float] = Field(None, description="Heart Rate Variability (ms)")
    sleep_hours: float = Field(ge=0, le=24)
    fatigue_level: int = Field(default=0, ge=0, le=10)
    soreness_level: int = Field(default=0, ge=0, le=10)

class AgentResponseSchema(BaseModel):
    """
    Estructura normalizada de respuesta del Agente al Frontend.
    """
    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None
    action_required: bool = False
