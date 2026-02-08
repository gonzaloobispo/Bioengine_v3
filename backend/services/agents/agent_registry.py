from typing import Dict, List, Optional
from .base_agent import BaseAgent

class AgentRegistry:
    """
    Catálogo centralizado de agentes especialistas en BioEngine.
    Permite al Router descubrir y despachar consultas.
    """
    
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent):
        """Registra un agente en el sistema."""
        self._agents[agent.agent_name] = agent
        print(f"[Agent] Agente registrado: {agent.agent_name}")

    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Recupera un agente por su identificador."""
        return self._agents.get(name)

    def list_agents(self) -> List[str]:
        """Lista los nombres de todos los agentes registrados."""
        return list(self._agents.keys())

    def get_all(self) -> Dict[str, BaseAgent]:
        """Devuelve todos los agentes para evaluación del Router."""
        return self._agents
