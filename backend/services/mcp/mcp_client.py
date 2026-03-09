import asyncio
from typing import Dict, Any, List, Optional
import json
import time

# Importar los servidores locales (instancias de FastMCP)
from .training_db_server import mcp as db_mcp
from .context_server import mcp as context_mcp
from .biometrics_server import mcp as bio_mcp
from .notebooklm_external_bridge import mcp as nblm_mcp

class MCPClient:
    """
    Cliente unificado para interactuar con los servidores MCP de BioEngine.
    Actúa como un Bridge directo a las instancias de FastMCP.
    """
    
    def __init__(self):
        self.servers = {
            "db": db_mcp,
            "context": context_mcp,
            "biometrics": bio_mcp,
            "nblm": nblm_mcp
        }
        self._context_cache = None
        self._last_cache_time = 0
        self._cache_ttl = 300 # 5 minutos

    async def read_resource(self, uri: str) -> str:
        """Lee un recurso de un servidor MCP basado en su URI."""
        prefix = uri.split("://")[0]
        
        server_key = prefix
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

    async def get_static_manuals(self) -> str:
        """Retrieves and concatenates heavy static manuals for caching."""
        uris = [
            ("Manual de Fisioterapia", "context://manual_fisioterapia"),
            ("Protocolos de Rehabilitación", "context://rehab_protocols"),
            ("Manual Master 49+", "context://manual_master_49")
        ]
        
        tasks = []
        for _, uri in uris:
            tasks.append(self.read_resource(uri))
            
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        combined_text = ""
        for (title, _), response in zip(uris, responses):
            combined_text += f"\n\n--- {title} ---\n\n"
            if isinstance(response, Exception):
                combined_text += f"Error cargando manual: {str(response)}"
            else:
                combined_text += response
                
        return combined_text

    async def get_full_coach_context(self, include_static: bool = True) -> Dict[str, Any]:
        """Agrega contexto de múltiples servidores MCP para el Coach con cache TTL."""
        # Verificar cache (sólo si incluimos static para compatibilidad, o cacheamos todo?)
        # Para ser seguros, no usamos esta cache en memoria si pedimos include_static=False
        now = time.time()
        if include_static and self._context_cache and (now - self._last_cache_time < self._cache_ttl):
            return self._context_cache

        uris = [
            ("training_plan", "context://training_plan"),
            ("activities", "db://activities/recent"),
            ("pain_history", "db://pain/history"),
            ("user_context", "db://user/context"),
            ("weight", "biometrics://weight/latest"),
            ("heart_rate", "biometrics://heart_rate/latest"),
            ("glucose", "biometrics://glucose/latest"),
            ("hrv_trend", "biometrics://hrv/trend"),
            ("bioconnect_spec", "context://bioconnect_spec"),
            ("equipment", "context://equipamiento")
        ]
        
        if include_static:
            uris.extend([
                ("manual_fisioterapia", "context://manual_fisioterapia"),
                ("rehab_protocols", "context://rehab_protocols"),
                ("manual_master_49", "context://manual_master_49")
            ])
        
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
                
        # Actualizar cache local solo si trajimos todo
        if include_static:
            self._context_cache = results
            self._last_cache_time = now
        
        return results
