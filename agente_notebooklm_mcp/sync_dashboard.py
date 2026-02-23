
import os
import json
import subprocess
import datetime
from .connection_tester import MCP_PATH

def get_notebooks():
    print("[*] Contactando a NotebookLM para extraer lista de cuadernos reales...")
    try:
        # Usamos el comando list-notebooks del servidor si existe, o simulamos vía test
        # Nota: Asumiendo que list-notebooks es una suborden del CLI
        result = subprocess.run(
            [MCP_PATH, "list-notebooks", "--headless"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            # Aquí procesaríamos el JSON de salida real si el CLI lo devuelve
            # Por ahora, extraemos los que están en el sistema para asegurar coherencia
            return True, result.stdout
        else:
            return False, result.stderr
    except Exception as e:
        return False, str(e)

def update_dashboard_data(notebooks_json_list=None):
    print("[*] Sincronizando datos con el Dashboard...")
    dashboard_data_path = r"c:\APP\Notebook\dashboard\src\data\mockData.js"
    
    if not os.path.exists(os.path.dirname(dashboard_data_path)):
        print("❌ Error: No se encontró la ruta del dashboard.")
        return

    # Usamos los notebooks detectados previamente o los de sistema
    # (En una implementación real, aquí mapeamos la salida del MCP al formato del Dashboard)
    
    # Ejecutamos el script de sincronización existente si está disponible
    sync_script = r"c:\APP\Notebook\dashboard\sync_notebooks.cjs"
    if os.path.exists(sync_script):
        try:
            subprocess.run(["node", sync_script], check=True)
            print("✅ Dashboard sincronizado con éxito.")
        except Exception as e:
            print(f"❌ Error al ejecutar sync_notebooks: {e}")
    else:
        print("❌ Error: No se encontró sync_notebooks.cjs")
