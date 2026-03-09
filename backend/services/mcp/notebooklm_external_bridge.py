import asyncio
import logging
import json
from typing import Dict, Any, List, Optional
import httpx
from mcp.server.fastmcp import FastMCP

logger = logging.getLogger(__name__)

class NotebookLMMCPBridge:
    """
    Bridge para conectar los Agentes de BioEngine con el servidor Sidecar de NotebookLM.
    Implementado como un servidor FastMCP para ser consumido por el MCPClient de BioEngine.
    """
    
    def __init__(self):
        self.mcp = FastMCP("NotebookLM-External-Bridge")
        self.sidecar_url = "http://127.0.0.1:8000"
        self._setup_tools()
        
    def _setup_tools(self):
        @self.mcp.tool()
        async def query_notebooklm(notebook_id: str, message: str) -> str:
            """
            Consulta externa a un cuaderno de NotebookLM vía Sidecar.
            Útil para grounding profundo con documentos no presentes en el contexto local.
            """
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    response = await client.post(
                        f"{self.sidecar_url}/query",
                        json={"notebook_id": notebook_id, "message": message}
                    )
                    response.raise_for_status()
                    return response.json().get("response", "Sin respuesta de NotebookLM.")
                except Exception as e:
                    return f"Error en Bridge NotebookLM: {str(e)}. Verifica que el Sidecar esté activo."

        @self.mcp.tool()
        async def list_external_notebooks() -> str:
            """Lista los cuadernos disponibles en la cuenta de NotebookLM vinculada."""
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.get(f"{self.sidecar_url}/list")
                    response.raise_for_status()
                    return json.dumps(response.json(), indent=2)
                except Exception as e:
                    return f"Error listando cuadernos: {str(e)}"

mcp = NotebookLMMCPBridge().mcp

if __name__ == "__main__":
    mcp.run()
