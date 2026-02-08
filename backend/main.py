from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
import time
from typing import List, Optional
from pydantic import BaseModel, ValidationError
from datetime import datetime
from services.sync_service import SyncService
from services.ai_service import AIService
from services.hitl_service import get_hitl_service, ActionSeverity
from services.coach_logic import AdaptiveCoach

from config import DB_PATH, ADMIN_TOKEN

app = FastAPI(title="BioEngine V3 API")
sync_service = SyncService()
ai_service = AIService()
hitl_service = get_hitl_service()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration": f"{duration:.4f}s"
    }
    
    try:
        log_dir = os.path.join(os.getcwd(), "log_temp")
        if os.path.exists(log_dir):
            with open(os.path.join(log_dir, "test_sessions.log"), "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass # Don't block requests if logging fails
            
    return response

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

@app.get("/plans")
async def get_plans(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.execute("SELECT * FROM training_plans ORDER BY start_date DESC")
    return [dict(row) for row in cursor.fetchall()]

@app.post("/plans/generate")
async def generate_plan(db: sqlite3.Connection = Depends(get_db)):
    # 1. Obtener contexto para Triage
    from services.context_manager import ContextManager
    ctx = ContextManager()
    weight_log = ctx.get_biometrics_history(days=30)
    pain_log = ctx.get_pain_history(days=30)
    activities = ctx.get_activity_history(days=30)
    
    # 2. Obtener plan previo si existe
    last_plan_row = db.execute("SELECT * FROM training_plans ORDER BY end_date DESC LIMIT 1").fetchone()
    last_plan = dict(last_plan_row) if last_plan_row else None
    if last_plan:
        last_plan['sessions'] = json.loads(last_plan['content']).get('sessions', [])

    # 3. Usar CoachLogic para generar
    coach = AdaptiveCoach(athlete_profile={}) # Perfil se sacaría de DB en real
    status = coach.analyze_status(weight_log, pain_log, activities)
    new_plan = coach.generate_adaptive_plan(status, last_plan)
    
    # 4. Persistir en DB
    db.execute(
        "INSERT INTO training_plans (start_date, end_date, status, title, content, evaluation) VALUES (?, ?, ?, ?, ?, ?)",
        (str(new_plan.start_date), str(new_plan.end_date), "active", "Plan Adaptativo SOTA 2026", new_plan.json(), "")
    )
    db.commit()
    
    return {"status": "success", "plan": new_plan}

@app.post("/plans/{plan_id}/evaluate")
async def evaluate_plan(plan_id: int, db: sqlite3.Connection = Depends(get_db)):
    # 1. Obtener el plan a evaluar
    plan_row = db.execute("SELECT * FROM training_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    plan_dict = dict(plan_row)
    
    # 2. Obtener actividades del periodo del plan
    from services.context_manager import ContextManager
    ctx = ContextManager()
    activities = ctx.get_activity_history(days=30)  # Simplificado, idealmente filtrar por fechas del plan
    
    # 3. Evaluar rendimiento
    coach = AdaptiveCoach(athlete_profile={})
    evaluation = coach.evaluate_performance(plan_dict['content'], activities)
    
    # 4. Actualizar el plan con la evaluación
    db.execute(
        "UPDATE training_plans SET evaluation = ?, status = ? WHERE id = ?",
        (json.dumps(evaluation), "completed", plan_id)
    )
    db.commit()
    
    return {"status": "success", "evaluation": evaluation}

class PainLogRequest(BaseModel):
    level: int  # 0-10
    location: str = "Rodilla Derecha"
    notes: str = ""

@app.post("/pain")
async def log_pain(req: PainLogRequest, db: sqlite3.Connection = Depends(get_db)):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    ctx.log_pain(req.level, f"{req.location}: {req.notes}")
    return {"status": "success", "message": f"Dolor nivel {req.level} registrado correctamente"}

@app.get("/pain/history")
async def get_pain_history(limit: int = 10, db: sqlite3.Connection = Depends(get_db)):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    history = ctx.get_pain_history(limit=limit)
    return {"status": "success", "history": history}

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
async def get_system_status(_: bool = Depends(verify_admin_token)) -> dict:
    """
    Returns aggregated system health, costs, and memory stats.
    """
    cost_status = ai_service.multi_model_client.cost_control.get_status() if ai_service.multi_model_client else {"error": "Multi-model client not initialized"}
    memory_stats = ai_service.context_manager.get_semantic_summary_data()
    
    # Check NotebookLM Status
    notebooklm_live = await ai_service.is_notebooklm_ready()
    
    return {
        "aiservice_enabled": ai_service.AI_ENABLED,
        "gemini_connected": ai_service.client is not None,
        "notebooklm_connected": notebooklm_live,
        "costs": cost_status,
        "memory": {
            "total_logs": memory_stats.get("total_count", 0),
            "last_summarized": memory_stats.get("last_count", 0),
            "summary_length": len(memory_stats.get("current_summary", ""))
        },
        "version": "3.1.0-v4.2"
    }

    return {"status": "ok", "enabled": enabled}

@app.get("/chat/status")
def get_chat_status():
    """Retorna el modelo de IA activo actualmente"""
    if hasattr(ai_service, 'multi_model_client') and ai_service.multi_model_client:
        return ai_service.multi_model_client.get_current_model_info()
    return {"description": "Gemini 3 Pro (Standard)"}

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

# --- HITL Endpoints ---

class ApproveActionRequest(BaseModel):
    action_id: str
    approved: bool
    reason: Optional[str] = ''

@app.get("/hitl/pending")
async def get_pending_actions():
    """Retrieve all pending HITL actions"""
    return hitl_service.get_pending_actions()

@app.post("/hitl/approve")
async def approve_hitl_action(req: ApproveActionRequest):
    """Approve or reject a HITL action"""
    if req.approved:
        success = hitl_service.approve_action(req.action_id)
    else:
        success = hitl_service.reject_action(req.action_id, req.reason or "Rechazado por el usuario")
    
    return {"status": "success" if success else "error"}
