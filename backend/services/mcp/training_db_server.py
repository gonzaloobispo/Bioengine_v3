import json
import sqlite3
from mcp.server.fastmcp import FastMCP
import sys
import os

# Añadir el directorio superior al path para importar config
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import DB_PATH

# Inicializar FastMCP para la base de datos de entrenamiento
mcp = FastMCP("BioEngine Training DB")

@mcp.resource("db://activities/recent")
def get_recent_activities() -> str:
    """Obtiene las últimas 30 actividades de entrenamiento del usuario."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM activities ORDER BY fecha DESC LIMIT 30"
        ).fetchall()
        conn.close()
        return json.dumps([dict(row) for row in rows], indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Error leyendo actividades: {str(e)}"

@mcp.resource("db://pain/history")
def get_pain_history() -> str:
    """Obtiene el historial completo de dolor reportado por el usuario."""
    # Nota: El nombre de la tabla real es 'pain_logs'
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM pain_logs ORDER BY timestamp DESC"
        ).fetchall()
        conn.close()
        return json.dumps([dict(row) for row in rows], indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Error leyendo historial de dolor: {str(e)}"

@mcp.resource("db://user/context")
def get_user_context() -> str:
    """Obtiene el contexto de usuario (perfil, insights) de la tabla user_context."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM user_context").fetchall()
        conn.close()
        return json.dumps([dict(row) for row in rows], indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Error leyendo contexto de usuario: {str(e)}"

@mcp.tool()
def get_activity_by_id(activity_id: str) -> str:
    """Busca una actividad específica por su ID."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM activities WHERE id = ?", (activity_id,)
        ).fetchone()
        conn.close()
        if row:
            return json.dumps(dict(row), indent=2, ensure_ascii=False)
        return f"Actividad {activity_id} no encontrada."
    except Exception as e:
        return f"Error buscando actividad: {str(e)}"

if __name__ == "__main__":
    mcp.run()
