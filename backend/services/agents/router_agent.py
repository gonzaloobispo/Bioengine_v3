from .base_agent import BaseAgent
from .agent_registry import AgentRegistry
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class RouterAgent:
    """
    Orquestador principal de BioEngine V4.
    Decide qué agente especialista debe responder basándose en el contenido
    de la consulta y el contexto del usuario (System 2 Dispatching).
    """
    
    def __init__(self, registry: AgentRegistry, model_client=None):
        self.registry = registry
        self.model_client = model_client

    async def route(self, query: str, context: Dict[str, Any], chat_history: Optional[List[dict]] = None) -> Dict[str, Any]:
        """
        Analiza la consulta y la deriva al mejor agente disponible.
        """
        logger.info(f"🚦 Routing query: {query[:50]}...")
        
        # 1. Obtener puntuaciones de todos los agentes
        scores = {}
        agents = self.registry.get_all()
        
        for name, agent in agents.items():
            score = await agent.can_handle(query, context)
            scores[name] = score
            
        # 2. Seleccionar el mejor agente
        best_agent_name = max(scores, key=scores.get)
        best_score = scores[best_agent_name]
        
        # 3. Si la confianza es baja (< 0.4), el coach es el agente default
        if best_score < 0.4:
            logger.warning(f"⚠️ Baja confianza ({best_score}) para {best_agent_name}. Usando Coach por defecto.")
            best_agent_name = "coach"
            
        selected_agent = self.registry.get_agent(best_agent_name)
        
        # 4. Procesar con el agente seleccionado
        response = await selected_agent.process(query, context, chat_history)
        
        # 5. Añadir metadatos de enrutamiento (Estándar V4)
        response["_router"] = {
            "selected_agent": best_agent_name,
            "confidence": best_score,
            "alternatives": scores
        }
        
        return response

    async def classify_intent_llm(self, query: str) -> str:
        """
        Usa el LLM para una clasificación de intención más técnica si el 
        enrutamiento basado en keywords falla (System 2 Dispatch).
        """
        if not self.model_client:
            return "coach" # Fallback
            
        prompt = f"""Clasifica la intención de esta consulta de un atleta:
Consulta: "{query}"

Categorías:
- recovery: Dolor, lesiones, rehabilitación.
- biomechanics: Técnica, video, postura.
- coach: Rendimiento, planes, nutrición.

Responde solo con el nombre de la categoría."""

        # En una implementación real, aquí llamaríamos al modelo
        return "coach"
