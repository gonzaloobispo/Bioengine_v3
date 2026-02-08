import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class NotebookLMBridge:
    """
    Simula la integración con NotebookLM permitiendo a los agentes
    realizar "Grounding" sobre los documentos del Contexto Base vía MCP.
    """
    
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.referenced_docs = [
            "manual_master_49.md",
            "plan_maestro_reformulado_v4.md",
            "bioconnect_ios_spec.md"
        ]

    async def get_grounding_context(self, query: str) -> str:
        """
        Recupera el contexto relevante de los manuales maestros.
        """
        logger.info(f"📚 NotebookLMBridge searching for: {query}")
        
        # Obtenemos el contexto completo del Context Server
        context = await self.mcp_client.get_full_coach_context()
        
        grounding_prompt = "\n--- FUNDAMENTACIÓN ESTRATÉGICA (NotebookLM Grounding) ---\n"
        
        # Agregamos los manuales específicos si están disponibles
        knowledge_parts = []
        if context.get("manual_master_49") and "Error" not in context["manual_master_49"]:
            knowledge_parts.append(f"MANUAL MASTER 49+:\n{context['manual_master_49'][:2000]}")
        
        if context.get("manual_fisioterapia") and "Error" not in context["manual_fisioterapia"]:
            knowledge_parts.append(f"MANUAL ENTRENAMIENTO/FISIOTERAPIA:\n{context['manual_fisioterapia'][:2000]}")

        if context.get("bioconnect_spec") and "Error" not in context["bioconnect_spec"]:
            knowledge_parts.append(f"SPEC BIOCONNECT:\n{context['bioconnect_spec'][:1000]}")

        if not knowledge_parts:
             knowledge = context.get("knowledge_hub", "Base de conocimiento oficial de BioEngine.")
             knowledge_parts.append(knowledge)
        
        grounding_prompt += "\n\n".join(knowledge_parts)
        grounding_prompt += "\n---------------------------------------------------\n"
        
        return grounding_prompt

    def format_citation(self, source: str, content: str) -> str:
        """Formatea una cita al estilo NotebookLM."""
        return f"\n> [!NOTE] Citado de {source}: {content}\n"
