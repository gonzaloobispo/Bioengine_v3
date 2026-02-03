from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
from typing import List, Optional
from pydantic import BaseModel
from services.sync_service import SyncService
from services.ai_service import AIService

from config import DB_PATH, ADMIN_TOKEN

app = FastAPI(title="BioEngine V3 API")
sync_service = SyncService()
ai_service = AIService()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class Activity(BaseModel):
    id: int
    fecha: str
    tipo: Optional[str]
    nombre: Optional[str]
    distancia_km: Optional[float]
    duracion_min: Optional[float]
    calorias: Optional[float]
    fc_media: Optional[float]
    fc_max: Optional[float]
    elevacion_m: Optional[float]
    cadencia_media: Optional[float]
    fuente: Optional[str]

class Biometric(BaseModel):
    fecha: str
    peso: float
    grasa_pct: Optional[float]
    masa_muscular_kg: Optional[float]

class LogEntry(BaseModel):
    event_type: str
    description: str
    data: Optional[dict] = None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

# Dependencia de DB
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def verify_admin_token(x_admin_token: str = Header(None)) -> bool:
    token = ADMIN_TOKEN
    print(f"[DEBUG] Expected token: [{token}]")
    print(f"[DEBUG] Received token: [{x_admin_token}]")
    if not token:
        raise HTTPException(status_code=503, detail="Admin token no configurado")
    if not x_admin_token or x_admin_token != token:
        raise HTTPException(status_code=401, detail="Token invalido")
    return True

# --- Endpoints ---

@app.get("/")
def read_root() -> dict:
    return {"status": "BioEngine V3 API Operational", "version": "3.1.0-v4.2"}

@app.post("/sync/all")
def trigger_sync(_: bool = Depends(verify_admin_token)) -> dict:
    res_garmin = sync_service.sync_garmin()
    res_withings = sync_service.sync_withings()
    return {
        "garmin": res_garmin,
        "withings": res_withings
    }

@app.get("/coach-analysis")
async def get_coach_analysis() -> dict:
    analysis = await ai_service.get_coach_analysis()
    return {"analysis": analysis}
@app.post("/chat")
async def chat_endpoint(req: ChatRequest) -> dict:
    response = await ai_service.get_response(req.message, req.history)
    return {"response": response}

@app.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    return StreamingResponse(
        ai_service.get_streaming_response(req.message, req.history),
        media_type="text/plain"
    )

@app.get("/memory")
def get_memory_snapshot(limit: int = 20, _: bool = Depends(verify_admin_token)) -> dict:
    snapshot = ai_service.context_manager.get_memory_snapshot(recent_limit=limit)
    return snapshot

@app.get("/system/status")
def get_system_status(_: bool = Depends(verify_admin_token)) -> dict:
    """
    Returns aggregated system health, costs, and memory stats.
    """
    cost_status = ai_service.multi_model_client.cost_control.get_status() if ai_service.multi_model_client else {"error": "Multi-model client not initialized"}
    memory_stats = ai_service.context_manager.get_semantic_summary_data()
    
    return {
        "aiservice_enabled": ai_service.AI_ENABLED,
        "gemini_connected": ai_service.client is not None,
        "costs": cost_status,
        "memory": {
            "total_logs": memory_stats.get("total_count", 0),
            "last_summarized": memory_stats.get("last_count", 0),
            "summary_length": len(memory_stats.get("current_summary", ""))
        },
        "version": "3.1.0-v4.2"
    }

@app.post("/system/cost-toggle")
def toggle_costs(enabled: bool, _: bool = Depends(verify_admin_token)) -> dict:
    if not ai_service.multi_model_client:
        raise HTTPException(status_code=503, detail="Multi-model client no cargado")
        
    if enabled:
        ai_service.multi_model_client.cost_control.enable_paid_models()
    else:
        ai_service.multi_model_client.cost_control.disable_paid_models()
        
    return {"status": "ok", "enabled": enabled}

@app.post("/logs")
def create_log(entry: LogEntry, db: sqlite3.Connection = Depends(get_db)) -> dict:
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO system_logs (event_type, description, data_json) VALUES (?, ?, ?)",
        (entry.event_type, entry.description, json.dumps(entry.data) if entry.data else None)
    )
    db.commit()
    return {"status": "ok"}

@app.get("/logs")
def get_logs(limit: int = 50, db: sqlite3.Connection = Depends(get_db)) -> List[dict]:
    cursor = db.cursor()
    cursor.execute("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/activities", response_model=List[Activity])
def get_activities(limit: int = 2000, skip: int = 0, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, fecha, tipo, nombre, distancia_km, duracion_min, calorias, 
               fc_media, fc_max, elevacion_m, cadencia_media, fuente 
        FROM activities 
        ORDER BY fecha DESC 
        LIMIT ? OFFSET ?
    """, (limit, skip))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/biometrics", response_model=List[Biometric])
def get_biometrics(limit: int = 1000, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT fecha, peso, grasa_pct, masa_muscular_kg FROM biometrics ORDER BY fecha DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/equipment")
def get_equipment(db: sqlite3.Connection = Depends(get_db)) -> dict:
    """
    Returns equipment info from equipamiento.md with dynamic km calculations.
    """
    try:
        # Read equipamiento.md
        equipment_path = r"c:\BioEngine_V3\BioEngine_V3_Contexto_Base\equipamiento.md"
        with open(equipment_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Calculate km by activity type from database
        cursor = db.cursor()
        
        # Running asfalto
        cursor.execute("""
            SELECT SUM(distancia_km) as total_km 
            FROM activities 
            WHERE LOWER(tipo) IN ('carrera', 'running', 'run', 'correr')
            AND fecha >= '2024-01-01'
        """)
        training_km = cursor.fetchone()['total_km'] or 0
        
        # Trail/Trekking
        cursor.execute("""
            SELECT SUM(distancia_km) as total_km 
            FROM activities 
            WHERE LOWER(tipo) IN ('trail', 'trekking', 'hiking', 'montaña')
            AND fecha >= '2024-01-01'
        """)
        trail_km = cursor.fetchone()['total_km'] or 0
        
        # Bicicleta
        cursor.execute("""
            SELECT SUM(distancia_km) as total_km 
            FROM activities 
            WHERE LOWER(tipo) IN ('ciclismo', 'bicicleta', 'cycling', 'bike')
            AND fecha >= '2024-06-15'
        """)
        bike_km = cursor.fetchone()['total_km'] or 0
        
        # Tenis (count sessions)
        cursor.execute("""
            SELECT COUNT(*) as sessions 
            FROM activities 
            WHERE LOWER(tipo) IN ('tenis', 'tennis')
            AND fecha >= '2024-01-01'
        """)
        tennis_sessions = cursor.fetchone()['sessions'] or 0
        
        return {
            "markdown_content": content,
            "stats": {
                "training_km": round(training_km, 1),
                "trail_km": round(trail_km, 1),
                "bike_km": round(bike_km, 1),
                "bike_km_total": round(2450 + bike_km, 1),  # Base km desde compra
                "tennis_sessions": tennis_sessions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading equipment: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
