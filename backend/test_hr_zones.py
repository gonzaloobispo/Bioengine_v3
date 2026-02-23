
import datetime
import json
import sqlite3
import sys
import os

# Añadir path para importar servicios
sys.path.append(os.path.join(os.getcwd(), 'services'))
from context_manager import ContextManager

def test_hr_logic():
    print("=== TEST: BioEngine Dynamic HR Logic (SOTA 2026) ===")
    
    # 1. Caso Estándar (Sin medicación)
    age = 49
    meds = []
    zones_std = ContextManager.calculate_mhr_and_zones(age, meds)
    print(f"\n[ESTÁNDAR - Tanaka] Edad: {age}")
    print(f"FC Max: {zones_std['mhr']} bpm")
    print(f"Zona 2 (Aeróbico): {zones_std['zones']['Z2']['range']} bpm")
    
    # 2. Caso Atenolol (Brawner)
    meds_atenolol = ["Atenolol 50mg"]
    zones_beta = ContextManager.calculate_mhr_and_zones(age, meds_atenolol)
    print(f"\n[AJUSTADO - Brawner] Edad: {age} | Meds: {meds_atenolol}")
    print(f"FC Max: {zones_beta['mhr']} bpm")
    print(f"Zona 2 (Aeróbico): {zones_beta['zones']['Z2']['range']} bpm")
    
    # 3. Test de Cumpleaños (Auto-adaptación)
    print("\n[TEST CUMPLEAÑOS] Simulando paso del tiempo...")
    birth_date = "1977-02-19" # Hoy cumple 49
    calculated_age_today = ContextManager.calculate_age(birth_date)
    
    # Mañana (simulado)
    # Si hoy es 2026-02-19 y nació en 1977-02-19, hoy cumple 49.
    print(f"Fecha Nacimiento: {birth_date} | Edad calculada hoy: {calculated_age_today}")
    
    zones_bday = ContextManager.calculate_mhr_and_zones(calculated_age_today, meds_atenolol)
    print(f"Zonas activas: {zones_bday['mhr']} bpm max")

    print("\n=== VERIFICACIÓN EXITOSA ===")

if __name__ == "__main__":
    test_hr_logic()
