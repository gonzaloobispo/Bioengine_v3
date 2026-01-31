import asyncio
import sys
import os

# Fix encoding for Windows terminals
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Añadir el directorio base al path para poder importar services
sys.path.append(r"c:\BioEngine_V3\backend")

from services.ai_service import AIService
from services.context_manager import ContextManager

async def test_memory_evolution():
    ai = AIService()
    cm = ContextManager()
    
    print("--- TEST 1: Consciencia de lesión base ---")
    resp1 = await ai.get_response("Hola Coach, ¿qué sabes de mi lesión de rodilla?")
    print(f"Respuesta Coach: {resp1}\n")
    
    print("--- TEST 2: Registro de evento (Reporte de dolor) ---")
    # Limpiamos el historial de dolor para la prueba
    if os.path.exists(cm.pain_file):
        with open(cm.pain_file, 'w') as f:
            f.write('{"registros": []}')
            
    resp2 = await ai.get_response("Hoy me dolió mucho la rodilla derecha al subir escaleras, diría que un 7 de 10.")
    print(f"Respuesta Coach: {resp2}\n")
    
    # Verificar si se actualizó el archivo
    pain_logs = cm.get_pain_history()
    print(f"Registros de dolor en JSON: {pain_logs}")
    
    if any(log['nivel'] == 7 for log in pain_logs):
        print("\n✅ ÉXITO: El coach registró el dolor correctamente.")
    else:
        print("\n❌ ERROR: No se encontró el registro de dolor.")

if __name__ == "__main__":
    asyncio.run(test_memory_evolution())
