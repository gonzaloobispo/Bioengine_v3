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
        Usa un sistema híbrido: Keywords (System 1) + LLM Dispatch (System 2).
        """
        logger.info(f"🚦 Routing query: {query[:50]}...")
        
        # 1. Obtener puntuaciones de todos los agentes (System 1 - Rápido)
        scores = {}
        agents = self.registry.get_all()
        
        for name, agent in agents.items():
            score = await agent.can_handle(query, context)
            scores[name] = score
            
        # 2. Seleccionar el mejor agente inicial
        best_agent_name = max(scores, key=scores.get)
        best_score = scores[best_agent_name]
        
        # 3. System 2 Dispatch: Si la confianza es media-baja, usamos el LLM para decidir
        if best_score < 0.7 and self.model_client:
            logger.info(f"🤔 Confianza media ({best_score}). Activando System 2 Dispatcher...")
            llm_agent_name = await self.classify_intent_llm(query)
            if llm_agent_name in agents:
                logger.info(f"🎯 LLM Dispatcher re-enrutó a: {llm_agent_name}")
                best_agent_name = llm_agent_name
                best_score = 0.9 # Confianza del LLM
        
        # 4. Fallback final
        if best_score < 0.4:
            logger.warning(f"⚠️ Incluso con LLM la confianza es baja. Usando Coach por defecto.")
            best_agent_name = "coach"
            
        selected_agent = self.registry.get_agent(best_agent_name)
        
        # 5. Procesar con el agente seleccionado
        response = await selected_agent.process(query, context, chat_history)
        
        # 6. Añadir metadatos de enrutamiento (Estándar V4)
        response["_router"] = {
            "selected_agent": best_agent_name,
            "confidence": best_score,
            "alternatives": scores,
            "dispatch_method": "llm" if best_score == 0.9 else "keywords"
        }
        
        return response

    async def classify_intent_llm(self, query: str) -> str:
        """
        Usa el LLM para una clasificación de intención técnica (System 2 Dispatch).
        """
        if not self.model_client:
            return "coach"
            
        prompt = f"""Actúa como el despachador central de BioEngine. Clasifica esta consulta del usuario para enviarla al especialista correcto.

CONSULTA: "{query}"

AGENTES DISPONIBLES:
- recovery: Consultas sobre dolor físico, molestias, lesiones, fisioterapia o rehabilitación.
- biomechanics: Consultas sobre técnica de carrera, postura, análisis de video, pisada o asimetrías de movimiento.
- coach: Consultas sobre rendimiento, planificación, pulsaciones (FC), zonas de entrenamiento, nutrición o progreso general.

Responde ÚNICAMENTE con el nombre del agente (recovery, biomechanics o coach)."""

        try:
            model_id = "gemini-2.0-flash-exp"
            response = await self.model_client.aio.models.generate_content(
                model=model_id,
                contents=prompt
            )
            intent = response.text.strip().lower()
            # Limpiar posibles adornos del LLM
            for agent in ["recovery", "biomechanics", "coach"]:
                if agent in intent:
                    return agent
            return "coach"
        except Exception as e:
            logger.error(f"Error en LLM intent classification: {e}")
            return "coach"
