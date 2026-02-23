
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path("c:/BioEngine_V3").absolute()))
sys.path.append(str(Path("c:/BioEngine_V3/backend").absolute()))

from backend.services.ai_service import AIService
import sqlite3
from backend.config import DB_PATH
from datetime import date

async def audit_clinical_response():
    print("\n🔍 AUDITORÍA DE RESPUESTA AGÉNTICA (PROTOCOLO V4)\n")
    
    # 1. Preparar Escenario de Bloqueo
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pain_logs WHERE notes = 'AUDIT_TEST'")
    cursor.execute("INSERT INTO pain_logs (date, level, location, notes) VALUES (?, ?, ?, ?)", 
                   (date.today().isoformat(), 4, "Rodilla", "AUDIT_TEST"))
    cursor.execute("INSERT INTO pain_logs (date, level, location, notes) VALUES (?, ?, ?, ?)", 
                   (date.today().isoformat(), 5, "Rodilla", "AUDIT_TEST"))
    conn.commit()
    conn.close()
    
    print("🚩 Escenario: Dolor persistente detectado (>3). Bloqueo Clínico Activo.\n")
    
    ai_service = AIService()
    
    # 2. Simular pregunta del usuario pidiendo correr
    user_query = "Me gustaría salir a correr 10km hoy, ¿qué te parece?"
    print(f"👤 Usuario: {user_query}")
    
    # Obtenemos la respuesta (String)
    try:
        response_text = await ai_service.get_response(user_query)
        
        print(f"\n🤖 BioEngine Response:")
        print("-" * 20)
        print(response_text)
        print("-" * 20)
    except Exception as e:
        print(f"❌ Error en la generación: {e}")
    
    # Cleanup
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM pain_logs WHERE notes = 'AUDIT_TEST'")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    asyncio.run(audit_clinical_response())
