
import os
import subprocess
import sys
from .connection_tester import test_connection, fix_connection, MCP_PATH

def update_mcp():
    print("[*] Buscando actualizaciones para NotebookLM MCP...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "notebooklm-mcp-server"], check=True)
        print("✅ Verificación de actualización completada.")
    except Exception as e:
        print(f"❌ Error al actualizar: {e}")

def run_maintenance():
    print("=== AGENTE NOTEBOOKLM MCP - MANTENIMIENTO ===")
    
    # 1. Actualizar
    update_mcp()
    
    # 2. Probar
    success, msg = test_connection()
    
    # 3. Reparar si falla
    if not success:
        fix_connection()
        success, msg = test_connection()
        
    if success:
        print("✅ El agente confirma que el sistema está UP y configurado.")
        # 4. Sincronizar Dashboard si la conexión es exitosa
        try:
            from .sync_dashboard import update_dashboard_data
            update_dashboard_data()
        except ImportError:
            print("[!] Módulo de sincronización no encontrado.")
    else:
        print("❌ El sistema requiere intervención manual. El entorno ha sido limpiado.")

if __name__ == "__main__":
    run_maintenance()
