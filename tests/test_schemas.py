from models.schemas import ActivitySchema, DailyVitalsSchema, BodyCompositionSchema
from datetime import datetime
import json
import pytest

def test_activity_validation():
    print("Testing ActivitySchema...")
    
    # Caso Exitoso
    valid_data = {
        "fecha": datetime.now(),
        "tipo": "run", 
        "distancia_km": 5.2,
        "duracion_min": 30.0,
        "calorias": 300
    }
    act = ActivitySchema(**valid_data)
    assert act.tipo == "Run" # Validating normalization
    print(f"✅ Valid Data OK: {act.tipo}")

    # Caso Fallido (Distancia negativa)
    invalid_data = valid_data.copy()
    invalid_data["distancia_km"] = -1
    with pytest.raises(ValueError):
        ActivitySchema(**invalid_data)
    print("✅ Invalid Data Caught (Negative Distance)")

def test_daily_vitals_validation():
    print("\nTesting DailyVitalsSchema...")
    valid_data = {
        "date": datetime.now(),
        "rhr": 50,
        "sleep_hours": 7.5,
        "hrv": 65.0
    }
    vitals = DailyVitalsSchema(**valid_data)
    assert vitals.rhr == 50
    print("✅ Daily Vitals OK")

    # Caso Fallido (RHR imposible)
    invalid_vitals = valid_data.copy()
    invalid_vitals["rhr"] = 300
    with pytest.raises(ValueError):
        DailyVitalsSchema(**invalid_vitals)
    print("✅ Invalid Vitals Caught")

def test_body_composition_validation():
    print("\nTesting BodyCompositionSchema...")
    valid_data = {
        "fecha": "2026-02-02",
        "peso": 75.5,
        "grasa_pct": 15.2
    }
    body = BodyCompositionSchema(**valid_data)
    assert body.peso == 75.5
    print("✅ Body Composition OK")

if __name__ == "__main__":
    test_activity_validation()
    test_daily_vitals_validation()
    test_body_composition_validation()
