import asyncio
import os
import sys
import json
from datetime import date

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ai_service import AIService
from models.schemas_biomecanica import RiskAssessment

async def test_hybrid_pipeline():
    print("--- INICIANDO TEST DE PIPELINE HÍBRIDO (MediaPipe + Gemini) ---")
    ai_service = AIService()
    
    # Mock video path (usamos un string dummy para el test ya que procesaremos un mock de MediaPipe si no hay video real)
    # En este test, vamos a mockear el resultado de MediaPipe para validar el flujo con Gemini
    video_path = "mock_running_video.mp4"
    
    # Perfil del atleta Gonzalo
    user_profile = {
        "name": "Gonzalo",
        "age": 49,
        "injury_history": ["Pie plano", "Molestia recurrente rodilla derecha"],
        "pain_level": 4
    }

    print(f"1. Simulando procesamiento de MediaPipe para: {video_path}...")
    # Generamos un JSON de métricas mock para el test
    mock_metrics = {
        "metrics": {
            "knee_right_max_flexion": 45.0,
            "knee_right_max_extension": 175.0,
            "knee_left_max_flexion": 48.0,
            "asymmetry_pct": 12.5,
            "cadence_est_spm": 168.0
        }
    }
    json_path = video_path.replace(".mp4", "_motion.json")
    with open(json_path, 'w') as f:
        json.dump(mock_metrics, f)
    
    print("2. Enviando métricas a Gemini 3 Pro para Razonamiento Clínico...")
    
    # Monkeypatch vision_pipeline.process_video para que no intente abrir un video inexistente
    ai_service.vision_pipeline.process_video = lambda x: json_path

    try:
        assessment = await ai_service.analyze_biomechanics_hybrid(video_path, user_profile)
        
        print("\n--- RESULTADO DEL CEREBRO CLÍNICO ---")
        print(f"Nivel de Riesgo: {assessment.risk_level}")
        print(f"Racional: {assessment.clinical_rationale}")
        print(f"Recomendación: {assessment.recommendation}")
        print(f"Hallazgos: {', '.join(assessment.observations)}")
        print(f"Alerta de Asimetría: {'SÍ' if assessment.asymmetry_alert else 'NO'}")
        
        # Guardar en log de misión
        print("\n✅ Test completado con éxito.")
        
    except Exception as e:
        print(f"\n❌ Error en el test: {e}")
    finally:
        if os.path.exists(json_path):
            os.remove(json_path)

if __name__ == "__main__":
    asyncio.run(test_hybrid_pipeline())
