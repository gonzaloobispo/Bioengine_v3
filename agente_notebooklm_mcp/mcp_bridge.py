
import httpx
from fastmcp import FastMCP

mcp = FastMCP("NotebookLM-Bridge")

SIDECAR_URL = "http://127.0.0.1:8000"

@mcp.tool()
async def query_notebook(notebook_id: str, message: str) -> str:
    """Consulta a un cuaderno de NotebookLM usando el servidor Sidecar estable."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{SIDECAR_URL}/query", 
                json={"notebook_id": notebook_id, "message": message}
            )
            response.raise_for_status()
            return response.json().get("response", "Sin respuesta.")
        except Exception as e:
            return f"Error conectando al Sidecar: {str(e)}. Asegúrate de que SIDECAR.bat esté corriendo."

@mcp.tool()
async def check_sidecar_health() -> str:
    """Verifica si el servidor Sidecar de navegación está activo."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{SIDECAR_URL}/health")
            return f"Sidecar activo: {response.json()}"
        except:
            return "Sidecar inactivo. Ejecuta SIDECAR.bat para iniciar el navegador."

if __name__ == "__main__":
    mcp.run()
