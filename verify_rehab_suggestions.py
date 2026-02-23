
import asyncio
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.ai_service import AIService

async def test_rehab_suggestion():
    ai = AIService()
    # Simular una pregunta sobre dolor
    msg = "Tengo dolor 4 en la rodilla derecha después de entrenar. ¿Qué ejercicio de los protocolos de rehab me recomiendas?"
    print(f"\n[TEST] Pregunta: {msg}")
    
    response = await ai.get_response(msg)
    print(f"\n[TEST] Respuesta del Coach:\n{response}")
    
    if "Sentadilla Búlgara" in response or "Step-up" in response or "Fase 2" in response:
        print("\n✅ ÉXITO: El Coach sugiere protocolos específicos de Fase 2.")
    else:
        print("\n❌ FALLO: El Coach no mencionó los protocolos específicos.")

if __name__ == "__main__":
    asyncio.run(test_rehab_suggestion())
