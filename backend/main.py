from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
from typing import List, Optional
from pydantic import BaseModel
from services.sync_service import SyncService
from services.ai_service import AIService

# Configuración
DB_PATH = r"c:\BioEngine_V3\bioengine_v3.db"

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
    distancia_km: Optional[float]
    duracion_min: Optional[float]
    calorias: Optional[float]
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
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "online", "version": "3.0.0-alpha"}

@app.post("/sync/all")
def trigger_sync():
    res_garmin = sync_service.sync_garmin()
    res_withings = sync_service.sync_withings()
    return {
        "garmin": res_garmin,
        "withings": res_withings
    }

@app.get("/coach-analysis")
async def get_coach_analysis():
    analysis = await ai_service.get_coach_analysis()
    return {"analysis": analysis}
@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    response = await ai_service.get_response(req.message, req.history)
    return {"response": response}

@app.post("/logs")
def create_log(entry: LogEntry, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO system_logs (event_type, description, data_json) VALUES (?, ?, ?)",
        (entry.event_type, entry.description, json.dumps(entry.data) if entry.data else None)
    )
    db.commit()
    return {"status": "ok"}

@app.get("/logs")
def get_logs(limit: int = 50, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/activities", response_model=List[Activity])
def get_activities(limit: int = 100, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, fecha, tipo, distancia_km, duracion_min, calorias, fuente FROM activities ORDER BY fecha DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/biometrics", response_model=List[Biometric])
def get_biometrics(limit: int = 30, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT fecha, peso, grasa_pct, masa_muscular_kg FROM biometrics ORDER BY fecha DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
