
import asyncio
import sys
from pathlib import Path

# Add project root and modules to path
sys.path.append(str(Path("c:/BioEngine_V3").absolute()))
sys.path.append(str(Path("c:/BioEngine_V3/backend").absolute()))

from backend.services.ai_service import AIService

async def run_strategic_audit():
    service = AIService()
    
    queries = [
        "Analiza el estado actual del proyecto BioEngine V3. ¿Qué mejoras críticas propones en la arquitectura de agentes y la integración de conocimiento?",
        "Específicamente para el Coach Agent: ¿Cómo podemos optimizar el 'Protocolo de 9 días' basándonos en la telemetría actual?",
        "Para el Recovery Agent: ¿Ves inconsistencias en el manejo de dolor de rodilla vs la carga de entrenamiento registrada?"
    ]
    
    print("\n🚀 INICIANDO AUDITORÍA ESTRATÉGICA DE BIOENGINE V3\n")
    
    for query in queries:
        print(f"\n--- AUDIT QUERY: {query} ---")
        try:
            # AIService.get_response already uses the RouterAgent to dispatch to specialists
            response = await service.get_response(query)
            print(f"\nAGENT RESPONSE:\n{response}\n")
        except Exception as e:
            print(f"Error durante la consulta: {e}")

if __name__ == "__main__":
    asyncio.run(run_strategic_audit())
