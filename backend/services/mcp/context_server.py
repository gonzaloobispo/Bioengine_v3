import os
from mcp.server.fastmcp import FastMCP
import sys

# Añadir el directorio superior al path para importar config
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import CONTEXT_BASE_PATH

# Inicializar FastMCP para el contexto de conocimiento (Markdown)
mcp = FastMCP("BioEngine Knowledge Hub")

@mcp.resource("context://training_plan")
def get_training_plan() -> str:
    """Obtiene el plan de entrenamiento específico (Tenis Master 49+)."""
    try:
        path = CONTEXT_BASE_PATH / "Plan_Entrenamiento_Tenis_Master_49.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo plan de entrenamiento: {str(e)}"

@mcp.resource("context://manual_fisioterapia")
def get_physio_manual() -> str:
    """Obtiene el manual máster de fisioterapia y rehabilitación."""
    try:
        path = CONTEXT_BASE_PATH / "manual_entrenamiento_master.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo manual de fisioterapia: {str(e)}"

@mcp.resource("context://manual_master_49")
def get_master_49_manual() -> str:
    """Obtiene el manual integral para atletas master (49+)."""
    try:
        path = CONTEXT_BASE_PATH / "manual_master_49.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo manual master 49: {str(e)}"

@mcp.resource("context://bioconnect_spec")
def get_bioconnect_spec() -> str:
    """Obtiene la especificación del proyecto BioConnect iOS."""
    try:
        path = CONTEXT_BASE_PATH / "bioconnect_ios_spec.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo spec de BioConnect: {str(e)}"

@mcp.resource("context://equipamiento")
def get_equipment_list() -> str:
    """Obtiene la lista de calzado y equipamiento técnico."""
    try:
        path = CONTEXT_BASE_PATH / "equipamiento.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo equipamiento: {str(e)}"

@mcp.tool()
def search_knowledge_base(query: str) -> str:
    """Busca un término específico en todos los archivos markdown de contexto."""
    results = []
    try:
        for filename in os.listdir(CONTEXT_BASE_PATH):
            if filename.endswith(".md"):
                path = CONTEXT_BASE_PATH / filename
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if query.lower() in content.lower():
                        results.append(f"--- MATCH EN {filename} ---\n{content[:500]}...")
        
        if not results:
            return f"No se encontraron coincidencias para '{query}'."
        return "\n\n".join(results)
    except Exception as e:
        return f"Error en la búsqueda: {str(e)}"

@mcp.resource("context://dashboard_articular_49")
def get_articular_dashboard_spec() -> str:
    """Obtiene la especificación del dashboard de salud articular (49+)."""
    try:
        path = CONTEXT_BASE_PATH / "dashboard_articular_49.md"
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo especificación articular: {str(e)}"

if __name__ == "__main__":
    mcp.run()
