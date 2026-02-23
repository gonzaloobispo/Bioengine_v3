
import subprocess
import os
import datetime
from .encryption_utils import encrypt_record

MCP_PATH = r"C:\Users\gonza\AppData\Roaming\Python\Python313\Scripts\notebooklm-mcp.exe"

def test_connection(notebook_id="1f927884-ec18-45f3-82b3-f1d0415e6904"):
    print(f"[*] Probando conexión con Notebook ID: {notebook_id}...")
    try:
        # Ejecutar el comando de test
        result = subprocess.run(
            [MCP_PATH, "test", "-n", notebook_id, "--headless"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        status = "Success" if result.returncode == 0 else "Failed"
        output = result.stdout + result.stderr
        
        # Registrar el intento cifrado
        record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "notebook_id": notebook_id,
            "status": status,
            "error_msg": output if status == "Failed" else ""
        }
        encrypt_record(record)
        
        if status == "Success":
            print("✅ Conexión exitosa.")
            return True, "OK"
        else:
            print("❌ Conexión fallida. Intentando diagnosticar...")
            return False, output
            
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)

def fix_connection():
    print("[*] Intentando autoreparar conexión...")
    # Cerrar Chrome si está abierto por procesos huérfanos
    try:
        subprocess.run(["powershell", "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force"])
        print("[+] Procesos de Chrome cerrados para limpieza.")
    except:
        pass
    
    # Podríamos agregar aquí lógica para relanzar auth si es necesario
    print("[!] Se recomienda realizar login manual si el test sigue fallando.")
