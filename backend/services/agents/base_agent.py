from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import json
from pydantic import BaseModel

class AgentCapability(BaseModel):
    """Define una capacidad específica de un agente para el enrutamiento."""
    name: str
    description: str
    keywords: List[str]

class BaseAgent(ABC):
    """
    Clase base para todos los agentes especializados de BioEngine V4.
    Cada agente tiene acceso al MCPClient para obtener datos Zero-Copy.
    """
    
    def __init__(self, agent_name: str, mcp_client, model_client=None):
        self.agent_name = agent_name
        self.mcp_client = mcp_client
        self.model_client = model_client
        self.capabilities: List[AgentCapability] = []
        self.system_instruction = ""

    def register_capability(self, capability: AgentCapability):
        """Registra una capacidad técnica del agente."""
        self.capabilities.append(capability)

    @abstractmethod
    async def can_handle(self, query: str, context: Dict[str, Any]) -> float:
        """
        Determina la confianza del agente para manejar una consulta.
        Returns: Score de 0.0 a 1.0
        """
        pass

    @abstractmethod
    async def process(self, query: str, context: Dict[str, Any], chat_history: Optional[List[dict]] = None) -> Dict[str, Any]:
        """
        Procesa la consulta y devuelve una respuesta estructurada.
        """
        pass

    def _get_base_prompt(self, context: Dict[str, Any]) -> str:
        """Genera el prompt base con contexto MCP para el agente."""
        return f"""
DATOS DISPONIBLES (Vía MCP Zero-Copy):
{json.dumps(context, indent=2) if isinstance(context, dict) else context}

INSTRUCCIONES DE MISIÓN:
{self.system_instruction}
"""
