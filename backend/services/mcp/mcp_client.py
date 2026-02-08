import asyncio
from typing import Dict, Any, List, Optional
import json

# Importar los servidores locales (instancias de FastMCP)
from .training_db_server import mcp as db_mcp
from .context_server import mcp as context_mcp
from .biometrics_server import mcp as bio_mcp

class MCPClient:
    """
    Cliente unificado para interactuar con los servidores MCP de BioEngine.
    Actúa como un Bridge directo a las instancias de FastMCP.
    """
    
    def __init__(self):
        self.servers = {
            "db": db_mcp,
            "context": context_mcp,
            "biometrics": bio_mcp
        }

    async def read_resource(self, uri: str) -> str:
        """Lee un recurso de un servidor MCP basado en su URI."""
        prefix = uri.split("://")[0]
        
        server_key_map = {
            "db": "db",
            "context": "context",
            "biometrics": "biometrics"
        }
        
        server_key = server_key_map.get(prefix)
        if not server_key:
            raise ValueError(f"Protocolo MCP no soportado: {prefix}")
            
        server = self.servers[server_key]
        
        try:
            # FastMCP.read_resource devuelve una lista de objetos ResourceContent
            responses = await server.read_resource(uri)
            if not responses:
                return f"No se encontró contenido para {uri}"
            
            # Extraer el contenido de la primera respuesta (estándar MCP)
            # En la versión actual de FastMCP, el objeto tiene el atributo .content
            content = responses[0].content
            return str(content)
        except Exception as e:
            # Si falla la lectura directa, intentamos buscar en los recursos registrados
            return f"Error leyendo recurso {uri}: {str(e)}"

    async def call_tool(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Llama a una herramienta en un servidor MCP específico."""
        if server_name not in self.servers:
            raise ValueError(f"Servidor MCP no registrado: {server_name}")
            
        server = self.servers[server_name]
        try:
            result = await server.call_tool(tool_name, arguments)
            return result
        except Exception as e:
            raise ValueError(f"Error llamando a herramienta {tool_name}: {str(e)}")

    async def get_full_coach_context(self) -> Dict[str, Any]:
        """Agrega contexto de múltiples servidores MCP para el Coach."""
        uris = [
            ("training_plan", "context://training_plan"),
            ("manual_fisioterapia", "context://manual_fisioterapia"),
            ("activities", "db://activities/recent"),
            ("pain_history", "db://pain/history"),
            ("user_context", "db://user/context"),
            ("weight", "biometrics://weight/latest"),
            ("heart_rate", "biometrics://heart_rate/latest"),
            ("glucose", "biometrics://glucose/latest"),
            ("hrv_trend", "biometrics://hrv/trend"),
            ("manual_master_49", "context://manual_master_49"),
            ("bioconnect_spec", "context://bioconnect_spec"),
            ("equipment", "context://equipamiento")
        ]
        
        results = {}
        tasks = []
        keys = []
        
        for key, uri in uris:
            tasks.append(self.read_resource(uri))
            keys.append(key)
            
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for key, response in zip(keys, responses):
            if isinstance(response, Exception):
                results[key] = f"Error: {str(response)}"
            else:
                results[key] = response
                
        return results
