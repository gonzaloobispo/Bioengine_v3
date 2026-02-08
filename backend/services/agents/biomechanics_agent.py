from .base_agent import BaseAgent, AgentCapability
from typing import Dict, Any, Optional, List
import json
from services.biomechanics_pipeline import BiomechanicsPipeline

class BiomechanicsAgent(BaseAgent):
    """
    Especialista en análisis de técnica, postura y biomecánica (Gait Analysis).
    """
    
    def __init__(self, mcp_client, model_client=None):
        super().__init__("biomechanics", mcp_client, model_client)
        self.pipeline = BiomechanicsPipeline()
        self.register_capability(AgentCapability(
            name="gait_analysis",
            description="Análisis de la marcha y carrera.",
            keywords=["técnica", "postura", "biomecánica", "pisada", "marcha", "video"]
        ))
        
        self.system_instruction = """Eres el Especialista en Biomecánica de BioEngine.
Tu foco es la eficiencia del movimiento y la corrección técnica.
Analiza asimetrías y patrones de carga biomecánica."""

    async def can_handle(self, query: str, context: Dict[str, Any]) -> float:
        query_lower = query.lower()
        if any(w in query_lower for w in ["técnica", "postura", "biomecánica", "video", "asimetría"]):
            return 0.9
        return 0.1

    async def process(self, query: str, context: Dict[str, Any], chat_history: Optional[List[dict]] = None) -> Dict[str, Any]:
        """Procesa análisis biomecánico técnico."""
        if not self.model_client:
            return {"error": "Model client not initialized for BiomechanicsAgent"}

        logger_info = f"📸 BiomechanicsAgent analyzing: {query}"
        
        # Simular detección de video en la consulta
        has_video = "video" in query.lower() or "mp4" in query.lower()
        biomech_results = {}
        
        if has_video:
            # En un flujo real, aquí pasaríamos el path del video recibido
            # Por ahora disparamos el pipeline con un path simulado
            results_path = self.pipeline.process_video("demo_running.mp4")
            with open(results_path, 'r') as f:
                biomech_results = json.load(f)

        prompt = f"""Eres el Especialista en Biomecánica de BioEngine. Analiza técnicamente:
"{query}"

{self._get_base_prompt(context)}

DATOS DE VISIÓN COMPUTACIONAL (MediaPipe):
{json.dumps(biomech_results, indent=2) if biomech_results else "No hay video adjunto para análisis visual."}

Instrucciones: Analiza asimetrías y valgismo según el Manual Master 49+. Prioriza la eficiencia mecánica.
"""
        try:
            model_id = getattr(self, '_model_name', "gemini-2.0-flash-exp")
            response = self.model_client.models.generate_content(
                model=model_id,
                contents=prompt
            )
            return {
                "agent": self.agent_name,
                "response": response.text,
                "status": "success",
                "focus": "movement_efficiency",
                "vision_data": biomech_results,
                "capabilities_used": ["gait_analysis"]
            }
        except Exception as e:
            return {"agent": self.agent_name, "error": str(e)}
