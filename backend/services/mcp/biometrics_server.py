import json
from mcp.server.fastmcp import FastMCP
from datetime import datetime

# Inicializar FastMCP para biometría (Simulación de Garmin/Withings SOTA 2026)
mcp = FastMCP("BioEngine Biometrics")

@mcp.resource("biometrics://heart_rate/latest")
def get_latest_heart_rate() -> str:
    """Obtiene la frecuencia cardíaca en reposo más reciente sincronizada."""
    # Simulación de datos Garmin 2026
    data = {
        "bpm": 52,
        "hrv": 78,
        "timestamp": datetime.now().isoformat(),
        "source": "Garmin Fenix 8"
    }
    return json.dumps(data, indent=2)

@mcp.resource("biometrics://weight/latest")
def get_latest_weight() -> str:
    """Obtiene el último registro de peso de la báscula inteligente."""
    # Simulación de datos Withings 2026
    data = {
        "weight_kg": 78.59,
        "fat_percentage": 14.2,
        "timestamp": "2026-02-07T08:00:00Z",
        "source": "Withings Body Scan"
    }
    return json.dumps(data, indent=2)

@mcp.resource("biometrics://glucose/latest")
def get_latest_glucose() -> str:
    """Obtiene el nivel de glucosa en sangre más reciente (CGM Simulado)."""
    data = {
        "mg_dl": 94,
        "trend": "STABLE",
        "timestamp": datetime.now().isoformat(),
        "source": "Dexcom G7"
    }
    return json.dumps(data, indent=2)

@mcp.resource("biometrics://hrv/trend")
def get_hrv_trend() -> str:
    """Obtiene la tendencia de la variabilidad de frecuencia cardíaca de los últimos 7 días."""
    data = {
        "average_ms": 68,
        "status": "IMPROVING",
        "last_7_days": [62, 65, 64, 66, 68, 67, 68]
    }
    return json.dumps(data, indent=2)

@mcp.tool()
def query_telemetry_range(metric: str, start_date: str, end_date: str) -> str:
    """Consulta datos históricos de una métrica biométrica en un rango de fechas."""
    return f"Simulando entrega de datos para {metric} desde {start_date} hasta {end_date}. La tendencia muestra estabilidad absoluta."

@mcp.tool()
def log_biometric_event(event_type: str, value: str) -> str:
    """Registra un evento biométrico manual (ej. estrés, fatiga percibida)."""
    return f"Evento {event_type} con valor {value} registrado en el pipeline de biometría."

if __name__ == "__main__":
    mcp.run()
