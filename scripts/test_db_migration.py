import asyncio
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.ai_service import AIService

async def test_coach_analysis():
    print("Iniciando prueba de análisis del coach con nueva arquitectura DB...")
    # Forzamos AI_ENABLED para probar (si tienes API key)
    # Si no, simplemente veremos si el sistema de contexto carga sin errores.
    service = AIService()
    
    # Probamos la carga de contexto base (esto ya valida ContextManager + DB)
    try:
        context = service.context_manager.get_foundational_context()
        print("\n[OK] Contexto base cargado desde SQLite correctamente.")
        print(f"Longitud del contexto: {len(context)} caracteres.")
        
        # Verificamos si contiene datos específicos del perfil (migrados)
        if "Gonzalo Obispo" in context:
            print("[OK] Datos de perfil encontrados en el contexto.")
        else:
            print("[ERROR] No se encontró el nombre del perfil en el contexto.")
            
        # Verificamos si contiene memorias evolutivas
        if "MEMORIA EVOLUTIVA" in context:
            print("[OK] Memoria evolutiva encontrada en el contexto.")
        
    except Exception as e:
        print(f"[CRÍTICO] Fallo al cargar contexto: {e}")

if __name__ == "__main__":
    asyncio.run(test_coach_analysis())
