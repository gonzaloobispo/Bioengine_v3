
import asyncio
import sys
from pathlib import Path
from datetime import date, datetime

# Add project root to path
sys.path.append(str(Path("c:/BioEngine_V3").absolute()))
sys.path.append(str(Path("c:/BioEngine_V3/backend").absolute()))

from backend.services.coach_logic import AdaptiveCoach, CoachState
from backend.services.ai_service import AIService
import sqlite3
from backend.config import DB_PATH

async def verify_phase_2():
    print("\n🧪 INICIANDO VERIFICACIÓN DE FASE 2: ARQUITECTURA DE CONTROL\n")
    
    coach = AdaptiveCoach(athlete_profile={})
    
    # --- PRUEBA 1: Máquina de Estados (Coach) ---
    print("Prueba 1: Detección de Estados del Coach")
    
    # Escenario A: Progresión (Limpio)
    status_prog = coach.analyze_status([], [], [{"distancia_km": 10} for _ in range(7)])
    print(f"  [Progression] State: {status_prog['state']} (Expected: progresion)")
    
    # Escenario B: Estabilización (Carga alta)
    status_stab = coach.analyze_status([], [], [{"distancia_km": 20} for _ in range(7)])
    print(f"  [Stabilization] State: {status_stab['state']} (Expected: estabilizacion)")
    
    # Escenario C: Rehabilitación (Dolor)
    status_rehab = coach.analyze_status([], [{"intensidad": 4}], [])
    print(f"  [Rehabilitation] State: {status_rehab['state']} (Expected: rehabilitacion)")
    
    # --- PRUEBA 2: Plan Adaptativo basado en Estado ---
    print("\nPrueba 2: Generación de Plan según Estado")
    plan_rehab = coach.generate_adaptive_plan(status_rehab)
    impact_sessions = [s for s in plan_rehab.sessions if s.type.value in ["running", "tennis"]]
    print(f"  [Plan Rehab] Sesiones de impacto: {len(impact_sessions)} (Expected: 0)")
    print(f"  [Plan Rehab] Rationale: {plan_rehab.coach_rationale[:50]}...")
    
    # --- PRUEBA 3: Hard-Stop Clínico (AI Service) ---
    print("\nPrueba 3: Bloqueo Clínico (AIService)")
    ai_service = AIService()
    
    # Insertar mock records en DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Limpiamos para la prueba
    cursor.execute("DELETE FROM pain_logs WHERE notes = 'VERIFICATION_TEST'")
    # Insertamos 2 registros de dolor > 3
    cursor.execute("INSERT INTO pain_logs (date, level, location, notes) VALUES (?, ?, ?, ?)", 
                   (date.today().isoformat(), 4, "Rodilla", "VERIFICATION_TEST"))
    cursor.execute("INSERT INTO pain_logs (date, level, location, notes) VALUES (?, ?, ?, ?)", 
                   (date.today().isoformat(), 5, "Rodilla", "VERIFICATION_TEST"))
    conn.commit()
    conn.close()
    
    lock_status = await ai_service.check_clinical_lock()
    print(f"  [Hard-Stop] Clinical Lock: {lock_status['lock']} (Expected: True)")
    print(f"  [Hard-Stop] Reason: {lock_status['reason']}")
    
    # Cleanup
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM pain_logs WHERE notes = 'VERIFICATION_TEST'")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    asyncio.run(verify_phase_2())
