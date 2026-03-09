
import os
import subprocess
import sys
import time
import httpx

# Configuración centralizada
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SIDECAR_SCRIPT = os.path.join(os.path.dirname(BASE_DIR), "START_SIDECAR.bat")
SERVER_URL = "http://127.0.0.1:8000"

def is_sidecar_running():
    try:
        r = httpx.get(f"{SERVER_URL}/health", timeout=2.0)
        return r.status_code == 200
    except:
        return False

def ensure_sidecar():
    if is_sidecar_running():
        print("✅ Motor Sidecar ya está en ejecución.")
        return True
    
    print("[*] Iniciando Motor Sidecar (Sidecar Server)...")
    try:
        # Iniciamos el .bat en una nueva ventana de consola de forma independiente
        subprocess.Popen(["cmd", "/c", "start", "NOTEBOOKLM_SIDECAR", SIDECAR_SCRIPT], shell=True)
        
        # Esperar a que el servidor responda
        for _ in range(15):
            time.sleep(2)
            if is_sidecar_running():
                print("✅ Motor Sidecar iniciado y saludable.")
                return True
        print("❌ El Motor Sidecar tardó demasiado en responder.")
        return False
    except Exception as e:
        print(f"❌ Error al iniciar Sidecar: {e}")
        return False

def run_maintenance():
    print("\n" + "="*50)
    print("   AGENTE NOTEBOOKLM MCP - ORQUESTADOR DE PUENTE")
    print("="*50)
    
    # 1. Asegurar que el motor de navegación existe
    if not ensure_sidecar():
        print("❌ FALLO CRÍTICO: No se pudo asegurar el motor de navegación.")
        return False

    # 2. Sincronizar Dashboard
    print("[*] Sincronizando datos con el Dashboard...")
    try:
        from .sync_dashboard import update_dashboard_data
        update_dashboard_data()
        print("✅ Dashboard sincronizado con datos reales.")
    except Exception as e:
        print(f"⚠️  Advertencia: Error sincronizando dashboard: {e}")

    # 3. Conocimiento Técnico (Auto-diagnóstico)
    print("\n[INFO] Base de Conocimiento MCP:")
    print(" - Selectores: textarea.query-box-input")
    print(" - Puerto: 8000 (Sidecar API)")
    print(" - Handshake: Chrome Profile Persistente")
    
    print("\n" + "="*50)
    print("   ESTADO: OPERATIVO")
    print("="*50 + "\n")
    return True

if __name__ == "__main__":
    run_maintenance()
