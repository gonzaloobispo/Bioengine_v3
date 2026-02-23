from .base_agent import BaseAgent, AgentCapability
from typing import Dict, Any, Optional, List
import json
from services.agents.skills.notebooklm_bridge.bridge_logic import NotebookLMBridge
import logging

logger = logging.getLogger(__name__)

class CoachAgent(BaseAgent):
    """
    Especialista en análisis de rendimiento y planificación de entrenamiento.
    Hereda la lógica del Coach de V3 pero optimizada para V4 Multi-Agente.
    """
    
    def __init__(self, mcp_client, model_client=None):
        super().__init__("coach", mcp_client, model_client)
        self.bridge = NotebookLMBridge(mcp_client)
        self.register_capability(AgentCapability(
            name="performance_analysis",
            description="Análisis profundo de rendimiento deportivo y tendencias.",
            keywords=["rendimiento", "mejora", "análisis", "progreso", "entrenamiento"]
        ))
        self.register_capability(AgentCapability(
            name="training_planning",
            description="Generación de planes de entrenamiento adaptativos.",
            keywords=["plan", "rutina", "sesión", "ejercicios", "fase"]
        ))
        
        self.system_instruction = """Eres el Coach de BioEngine...
Tu prioridad es la optimización del rendimiento mediante una dosificación inteligente de las cargas.
Usa razonamiento deliberativo (System 2) para detectar ventanas de oportunidad.
IMPORTANTE: Tus respuestas B2C deben ser MUY DIRECTAS, CONCRETAS y COMPLETAS, pero breves. No uses adornos ni introducciones largas. Ve directo al grano. Nunca excedas los 3 párrafos a menos que te pidan un detalle técnico extenso."""

    async def can_handle(self, query: str, context: Dict[str, Any]) -> float:
        query_lower = query.lower()
        score = 0.0
        
        if any(w in query_lower for w in ["rendimiento", "mejorar", "plan", "entrenar", "análisis", "biomecánica", "técnica"]):
            score += 0.8
            
        # Si el contexto menciona asimetrías biomecánicas importantes, el coach debe intervenir
        return min(score, 1.0)

    async def process(self, query: str, context: Dict[str, Any], chat_history: Optional[List[dict]] = None) -> Dict[str, Any]:
        """Ejecuta el análisis de coaching autónomo usando el modelo client."""
        if not self.model_client:
            return {"error": "Model client not initialized for CoachAgent"}

        logger.info(f"🧠 CoachAgent processing query: {query}")
        
        # Grounding de NotebookLM
        grounding = await self.bridge.get_grounding_context(query)

        # Build prompt with CoT instructions
        prompt = f"""Eres el Coach experto de BioEngine. Analiza esta consulta del usuario:
"{query}"

{self._get_base_prompt(context)}

{grounding}

Sigue el proceso de razonamiento System 2 (PENSAR, VERIFICAR, SIMULAR, DECIDIR) y genera un análisis de rendimiento.
REGLA ESTRICTA DE FORMATO: Tu respuesta final debe ser EXTREMADAMENTE DIRECTA, CONCRETA y COMPLETA. 
Cero introducciones genéricas ("¡Hola Gonzalo! Vamos a ver cómo van..."). Da el dato duro, la evaluación y la recomendación en no más de 3 párrafos cortos.
Cita específicamente los protocolos del Manual Master 49+ si aplica.
"""
        try:
            # Detect model name (from AIService or fallback)
            model_id = getattr(self, '_model_name', "gemini-2.0-flash-exp")
            
            response = self.model_client.models.generate_content(
                model=model_id,
                contents=prompt
            )
            return {
                "agent": self.agent_name,
                "response": response.text,
                "status": "success",
                "capabilities_used": ["performance_analysis"]
            }
        except Exception as e:
            logger.error(f"Error in CoachAgent process: {e}")
            return {"agent": self.agent_name, "error": str(e)}
