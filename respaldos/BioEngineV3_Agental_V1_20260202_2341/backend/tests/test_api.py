import pytest
from fastapi.testclient import TestClient
import sys
import os

# Añadir el directorio backend al path para poder importar main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from config import ADMIN_TOKEN

client = TestClient(app)

def test_read_main():
    """Verifica que la raíz de la API responda correctamente"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BioEngine V3 API Operational"
    assert "version" in data

def test_get_activities():
    """Verifica que el endpoint de actividades funcione"""
    response = client.get("/activities")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_biometrics():
    """Verifica que el endpoint de biometría funcione"""
    response = client.get("/biometrics")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_coach_analysis_auth():
    """Verifica que el análisis del coach requiera token o devuelva 200 si no tiene seguridad estricta aún"""
    # En la implementación actual, coach-analysis parece no tener Header de seguridad obligatorio en el GET
    response = client.get("/coach-analysis")
    assert response.status_code == 200
    assert "analysis" in response.json()

def test_sync_unauthorized():
    """Verifica que la sincronización fallé sin el token de admin"""
    response = client.post("/sync/all")
    assert response.status_code == 401 # Token invalido o faltante

def test_sync_authorized():
    """Verifica que la sincronización responda con el token correcto"""
    response = client.post("/sync/all", headers={"x-admin-token": ADMIN_TOKEN})
    # Nota: Si no hay credenciales de Garmin/Withings configuradas, puede dar 500 o un error controlado.
    # Pero aquí validamos que pase el middleware de seguridad.
    assert response.status_code in [200, 500, 503] 

def test_system_status_auth():
    """Verifica que el estado del sistema requiera token"""
    response = client.get("/system/status")
    assert response.status_code == 401
    
    response = client.get("/system/status", headers={"x-admin-token": ADMIN_TOKEN})
    assert response.status_code == 200
    assert "costs" in response.json()
    assert "memory" in response.json()

def test_chat_stream_headers():
    """Verifica que el endpoint de streaming devuelva el tipo de contenido correcto"""
    payload = {"message": "Hola", "history": []}
    response = client.post("/chat/stream", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
