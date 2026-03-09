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
        Recupera el contexto relevante de los manuales maestros y realiza consultas
        externas a NotebookLM si es necesario.
        """
        logger.info(f"📚 NotebookLMBridge searching for: {query}")
        
        # 1. Obtenemos el contexto completo del Context Server (Local)
        context = await self.mcp_client.get_full_coach_context()
        
        # 2. Si la consulta es técnica/clínica, disparamos una consulta REAL a NotebookLM (Externo)
        external_grounding = ""
        clinical_keywords = ["kpi", "vo2max", "fc max", "atenolol", "benchmark", "referencia", "ciencia", "estudio"]
        
        if any(kw in query.lower() for kw in clinical_keywords):
            try:
                # El Notebook ID del usuario para KPIs claves
                kpi_notebook_id = "cb8c8240-bdba-4d18-9597-8d8dca43a673"
                message = f"Actúa como un experto en fisiología deportiva clínica. Responde a esta duda basándote exclusivamente en tus fuentes: {query}"
                
                logger.info("📡 notebooklm_bridge: Consultando NotebookLM Externo...")
                result = await self.mcp_client.call_tool("nblm", "query_notebooklm", {
                    "notebook_id": kpi_notebook_id,
                    "message": message
                })
                
                if result and "Error" not in str(result):
                    external_grounding = f"\n--- INVESTIGACIÓN CIENTÍFICA (NotebookLM LIVE) ---\n{result}\n"
            except Exception as e:
                logger.error(f"Error en grounding externo: {e}")

        grounding_prompt = "\n--- FUNDAMENTACIÓN ESTRATÉGICA (Contexto Local) ---\n"
        
        # Agregamos los manuales específicos locales
        knowledge_parts = []
        if context.get("manual_master_49") and "Error" not in context["manual_master_49"]:
            knowledge_parts.append(f"MANUAL MASTER 49+:\n{context['manual_master_49'][:1500]}")
        
        if context.get("manual_fisioterapia") and "Error" not in context["manual_fisioterapia"]:
            knowledge_parts.append(f"MANUAL ENTRENAMIENTO/FISIOTERAPIA:\n{context['manual_fisioterapia'][:1500]}")

        if not knowledge_parts:
             knowledge = context.get("knowledge_hub", "Base de conocimiento oficial de BioEngine.")
             knowledge_parts.append(knowledge)
        
        grounding_prompt += "\n\n".join(knowledge_parts)
        grounding_prompt += "\n" + (external_grounding if external_grounding else "---------------------------------------------------")
        
        return grounding_prompt

    def format_citation(self, source: str, content: str) -> str:
        """Formatea una cita al estilo NotebookLM."""
        return f"\n> [!NOTE] Citado de {source}: {content}\n"
