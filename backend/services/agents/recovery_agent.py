from .base_agent import BaseAgent, AgentCapability
from typing import Dict, Any, Optional, List
import json
from services.agents.skills.notebooklm_bridge.bridge_logic import NotebookLMBridge

class RecoveryAgent(BaseAgent):
    """
    Especialista en prevención de lesiones, gestión del dolor y rehabilitación.
    Prioriza la seguridad por encima del rendimiento.
    """
    
    def __init__(self, mcp_client, model_client=None):
        super().__init__("recovery", mcp_client, model_client)
        self.bridge = NotebookLMBridge(mcp_client)
        self.register_capability(AgentCapability(
            name="injury_management",
            description="Diagnóstico y gestión de lesiones/dolores reportados.",
            keywords=["dolor", "lesión", "rodilla", "duele", "molestia", "inflamación"]
        ))
        
        self.system_instruction = """Eres el Especialista en Recuperación de BioEngine. 
Tu única prioridad es la SEGURIDAD MÉDICA y la prevención de daños crónicos.
Si hay dolor > 3/10, tu recomendación SIEMPRE debe ser reposo o fisioterapia de baja carga."""

    async def can_handle(self, query: str, context: Dict[str, Any]) -> float:
        query_lower = query.lower()
        
        # Si menciona dolor o partes específicas del cuerpo que suelen lesionarse
        if any(w in query_lower for w in ["dolor", "lesión", "rodilla", "molestia", "articulación"]):
            return 0.95
            
        return 0.1

    async def process(self, query: str, context: Dict[str, Any], chat_history: Optional[List[dict]] = None) -> Dict[str, Any]:
        """Procesa consultas de salud y lesiones con máxima prioridad en seguridad."""
        if not self.model_client:
            return {"error": "Model client not initialized for RecoveryAgent"}
        # Grounding de NotebookLM (Protocolos de recuperación)
        grounding = await self.bridge.get_grounding_context(query)

        # Build prompt with CoT instructions
        prompt = f"""Eres el Especialista en Recuperación de BioEngine. Analiza clínicamente:
"{query}"

{self._get_base_prompt(context)}

{grounding}

Sigue el proceso de razonamiento System 2. Si hay dolor, PRIORIZA el Protocolo de Isometría Analgésica del Manual Master 49+.
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
                "focus": "medical_safety",
                "capabilities_used": ["injury_management"]
            }
        except Exception as e:
            return {"agent": self.agent_name, "error": str(e)}
