from fastapi import FastAPI, Depends, HTTPException, Header, Request, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
import time
from typing import List, Optional
from pydantic import BaseModel, ValidationError
from datetime import datetime, date
from services.sync_service import SyncService
from services.ai_service import AIService
from services.hitl_service import get_hitl_service, ActionSeverity
from services.coach_logic import AdaptiveCoach
from services.kpi_service import calculate_training_intelligence
from routes import auth_routes

from config import DB_PATH, ADMIN_TOKEN

app = FastAPI(title="BioEngine V3 API")
app.include_router(auth_routes.router, prefix="/api")
sync_service = SyncService()
ai_service = AIService()
hitl_service = get_hitl_service()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:3000", "*"], # Added specific origins for safety
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serving System Manual
@app.get("/manual")
async def get_manual():
    manual_path = os.path.join(os.path.dirname(__file__), "../BioEngine_V3_System_Manual.md")
    try:
        with open(manual_path, "r", encoding="utf-8") as f:
            md_content = f.read()
    except Exception as e:
        return HTMLResponse(content=f"Error loading manual: {e}", status_code=500)
    
    js_safe_md = json.dumps(md_content)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>BioEngine V3 System Manual</title>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <style>
            body {{
                box-sizing: border-box;
                min-width: 200px;
                max-width: 980px;
                margin: 0 auto;
                padding: 45px;
                background-color: #0d1117;
                color: #c9d1d9;
            }}
            .markdown-body {{
                font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
                background-color: #0d1117;
                color: #c9d1d9;
            }}
        </style>
    </head>
    <body class="markdown-body">
        <div id="content"></div>
        <script>
            const markdownText = {js_safe_md};
            document.getElementById('content').innerHTML = marked.parse(markdownText);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# ... Endpoints ...
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
    training_load: Optional[float]
    aerobic_te: Optional[float]
    anaerobic_te: Optional[float]
    training_effect_label: Optional[str]
    hr_zone_1: Optional[int]
    hr_zone_2: Optional[int]
    hr_zone_3: Optional[int]
    hr_zone_4: Optional[int]
    hr_zone_5: Optional[int]
    calzado: Optional[str]
    evento_nombre: Optional[str]

class Biometric(BaseModel):
    fecha: str
    peso: float
    grasa_pct: Optional[float]
    masa_muscular_kg: Optional[float]

class DailyHealth(BaseModel):
    fecha: str
    sleep_hours: float
    hrv_value: Optional[float]
    readiness_score: Optional[float]
    body_battery: Optional[int]
    resting_hr: Optional[int]
    stress_level: Optional[int]
    spo2_avg: Optional[int]
    spo2_min: Optional[int]
    respiration_avg: Optional[float]
    floors_ascended: Optional[float]

class UserProfile(BaseModel):
    nombre: str
    fecha_nacimiento: Optional[str] = None
    sexo: Optional[str] = "Masculino"
    altura_cm: Optional[int] = 176
    peso_objetivo_kg: Optional[float] = 74.0
    experiencia_deportiva: Optional[dict] = {}
    medicaciones: List[str] = []

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
    try:
        with open("debug_sync.txt", "a") as f:
            f.write(f"Sync triggered at {datetime.now()}\n")
        
        print("Starting sync...")
        res_garmin = sync_service.sync_garmin()
        with open("debug_sync.txt", "a") as f:
            f.write(f"Garmin result: {res_garmin}\n")
            
        res_withings = sync_service.sync_withings()
        with open("debug_sync.txt", "a") as f:
            f.write(f"Withings result: {res_withings}\n")
            
        # Invalidar cache de análisis para forzar regeneración con nuevos datos
        ai_service.clear_analysis_cache()
        
        return {
            "garmin": res_garmin,
            "withings": res_withings
        }
    except Exception as e:
        with open("debug_sync.txt", "a") as f:
            f.write(f"SYNC ERROR: {e}\n")
        return {"status": "error", "message": str(e)}

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
    cursor = db.execute("SELECT * FROM training_plans ORDER BY start_date DESC, id DESC")
    plans = [dict(row) for row in cursor.fetchall()]
    
    # Evaluar dinámicamente el plan activo
    for p in plans:
        if p.get('status') == 'active':
            try:
                from services.context_manager import ContextManager
                ctx = ContextManager()
                activities = ctx.get_activity_history(days=30)
                coach = AdaptiveCoach(athlete_profile={})
                eval_data = coach.evaluate_performance(p['content'], activities)
                
                plan_content = json.loads(p['content'])
                session_status = eval_data.get('session_status', [])
                
                for idx, session in enumerate(plan_content.get('sessions', [])):
                    if idx < len(session_status):
                        session['is_completed'] = session_status[idx].get('is_completed', False)
                        session['matched_date'] = session_status[idx].get('matched_date')
                
                p['content'] = json.dumps(plan_content)
            except Exception as e:
                print(f"Error evaluating active plan: {e}")
                
    return plans

class PlanGenerateRequest(BaseModel):
    start_date: Optional[date] = None

@app.post("/plans/generate")
async def generate_plan(req: PlanGenerateRequest = None, db: sqlite3.Connection = Depends(get_db)):
    # 1. Obtener datos del contexto directamente de la DB
    cursor = db.cursor()
    
    # Biometrics history (últimos 30 días)
    cursor.execute("""
        SELECT fecha, peso, grasa_pct, masa_muscular_kg 
        FROM biometrics 
        WHERE fecha >= date('now', '-30 days')
        ORDER BY fecha DESC
    """)
    weight_log = [dict(row) for row in cursor.fetchall()]
    
    # Pain history (últimos 30 días)
    cursor.execute("""
        SELECT date as fecha, location as zona, level as intensidad, notes as notas 
        FROM pain_logs 
        WHERE date >= date('now', '-30 days')
        ORDER BY date DESC
    """)
    pain_log = [dict(row) for row in cursor.fetchall()]
    
    # Activity history (últimos 30 días)
    cursor.execute("""
        SELECT fecha, tipo, distancia_km, duracion_min, calorias, fc_media, fc_max
        FROM activities 
        WHERE fecha >= date('now', '-30 days')
        ORDER BY fecha DESC
    """)
    activities = [dict(row) for row in cursor.fetchall()]
    
    # 2. Obtener plan previo si existe
    last_plan_row = db.execute("SELECT * FROM training_plans ORDER BY end_date DESC LIMIT 1").fetchone()
    last_plan = dict(last_plan_row) if last_plan_row else None
    if last_plan:
        last_plan['sessions'] = json.loads(last_plan['content']).get('sessions', [])

    # 3. Usar CoachLogic para generar
    start_date_override = req.start_date if req else None
    
    from services.context_manager import ContextManager
    ctx = ContextManager()
    profile = ctx._get_context_value('perfil_usuario') or {}
    
    coach = AdaptiveCoach(athlete_profile=profile)
    status = coach.analyze_status(weight_log, pain_log, activities)
    new_plan = coach.generate_adaptive_plan(status, last_plan, start_date_override=start_date_override)
    
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
    side: str = "derecha" # derecha, izquierda, ambas
    source: str = "user_manual"
    notes: str = ""

@app.post("/pain")
async def log_pain(req: PainLogRequest, db: sqlite3.Connection = Depends(get_db)):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    ctx.log_pain(
        level=req.level, 
        notes=req.notes, 
        location=req.location, 
        side=req.side, 
        source=req.source
    )
    return {"status": "success", "message": f"Dolor nivel {req.level} en {req.location} ({req.side}) registrado correctamente"}

@app.get("/pain/history")
async def get_pain_history(limit: int = 10, db: sqlite3.Connection = Depends(get_db)):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    history = ctx.get_pain_history(limit=limit)
    return {"status": "success", "history": history}

@app.delete("/pain/{log_id}")
async def delete_pain_log(log_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM pain_logs WHERE id = ?", (log_id,))
    db.commit()
    return {"status": "success", "message": f"Registro {log_id} eliminado"}

@app.get("/knowledge/{doc_id}")
async def get_knowledge_doc(doc_id: str):
    """Returns the content of a markdown document from the context base."""
    docs = {
        "manual_master": "manual_master_49.md",
        "entrenamiento_master": "manual_entrenamiento_master.md",
        "plan_reforzado": "plan_maestro_reformulado_v4.md",
        "protocolo_9_dias": "manual_master_49.md" # For now, same doc but could be specific
    }
    
    if doc_id == "system_manual":
        path = os.path.join(os.path.dirname(__file__), "../BioEngine_V3_System_Manual.md")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {"status": "success", "id": doc_id, "content": content}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    filename = docs.get(doc_id)
    if not filename:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
        
    path = os.path.join(r"c:\BioEngine_V3\BioEngine_V3_Contexto_Base", filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"status": "success", "id": doc_id, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nutrition")
async def get_nutrition(limit: int = 30):
    """Returns nutrition data for the last N days."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM nutrition ORDER BY date DESC LIMIT ?", (limit,))
        data = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/exercises")
async def get_exercises():
    """Returns the list of master-recommended exercises."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM exercises ORDER BY category, name")
        data = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    return StreamingResponse(
        ai_service.get_streaming_response(req.message, req.history),
        media_type="text/plain"
    )

@app.get("/profile")
def get_user_profile():
    from services.context_manager import ContextManager
    ctx = ContextManager()
    profile = ctx._get_context_value('perfil_usuario')
    return profile or {}

@app.post("/profile")
def update_user_profile(profile: UserProfile):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    ctx._set_context_value('perfil_usuario', profile.dict())
    return {"status": "success", "message": "Perfil actualizado correctamente"}

class SettingsUpdate(BaseModel):
    provider: str
    api_key: str
    enabled: bool = True

@app.get("/settings")
def get_settings(db: sqlite3.Connection = Depends(get_db)):
    # Obtener llaves API
    cursor = db.cursor()
    cursor.execute("SELECT provider, enabled, priority, created_at FROM api_keys ORDER BY priority ASC")
    keys = [dict(row) for row in cursor.fetchall()]
    
    return {
        "api_keys": keys,
        "ai_enabled": ai_service.AI_ENABLED,
        "gemini_model": ai_service.model_name
    }

@app.post("/settings/api-key")
def update_api_key(req: SettingsUpdate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO api_keys (provider, api_key, enabled)
        VALUES (?, ?, ?)
    """, (req.provider, req.api_key, 1 if req.enabled else 0))
    db.commit()
    
    # Recargar llaves en el servicio de IA
    ai_service._setup_multi_model_client()
    return {"status": "success", "message": f"Llave para {req.provider} actualizada"}

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
               fc_media, fc_max, elevacion_m, cadencia_media, fuente,
               training_load, aerobic_te, anaerobic_te, training_effect_label,
               hr_zone_1, hr_zone_2, hr_zone_3, hr_zone_4, hr_zone_5,
               calzado, evento_nombre
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

@app.get("/health/daily", response_model=List[DailyHealth])
def get_daily_health(limit: int = 7, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT fecha, sleep_hours, hrv_value, readiness_score, body_battery, resting_hr, stress_level, spo2_avg, spo2_min, respiration_avg, floors_ascended FROM daily_health ORDER BY fecha DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/equipment")
def get_equipment(db: sqlite3.Connection = Depends(get_db)) -> dict:
    """
    Returns equipment info from equipamiento.md with dynamic km calculations.
    """
    try:
        import re
        equipment_path = r"c:\BioEngine_V3\BioEngine_V3_Contexto_Base\equipamiento.md"
        with open(equipment_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Extraer bases del markdown usando regex (soportando multilínea)
        def extract_km(pattern, text):
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return float(match.group(1).replace(',', ''))
            return 0.0

        # Buscar bases específicas en el texto
        kayano_base = extract_km(r"Kayano 31.*?\~(\d+[,.]?\d*) km", content)
        brooks_base = extract_km(r"Brooks Adrenaline GTS 23.*?\~(\d+[,.]?\d*) km", content)
        trek_base = extract_km(r"Trek FX Sport AL 3.*?\~(\d+[,.]?\d*) km", content)
        hoka_base = extract_km(r"Hoka Speedgoat 6.*?\~(\d+[,.]?\d*) km", content)
        tennis_base = extract_km(r"Babolat Fury 3.*?\~(\d+[,.]?\d*)", content)

        return {
            "markdown_content": content,
            "stats": {
                "training_km": kayano_base,
                "brooks_km": brooks_base,
                "trail_km": hoka_base,
                "bike_km_total": trek_base,
                "tennis_km": tennis_base
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading equipment: {str(e)}")

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

class PainLogRequest(BaseModel):
    level: int
    side: str = 'derecha'
    location: str = 'Rodilla'
    notes: Optional[str] = ''
    source: str = 'user_manual'

@app.post("/pain")
async def log_pain(req: PainLogRequest):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    ctx.log_pain(level=req.level, notes=req.notes, location=req.location, side=req.side, source=req.source)
    return {"status": "success"}

@app.get("/pain/history")
async def get_pain_history(limit: int = 10):
    from services.context_manager import ContextManager
    ctx = ContextManager()
    history = ctx.get_pain_history(limit=limit)
    return {"history": history}

@app.delete("/pain/{log_id}")
async def delete_pain_log(log_id: int):
    # Asumimos que podemos eliminar por ID, aunque log_pain no devuelve dicts con ID todavía por defecto. 
    # Añadimos un fallback genérico.
    import sqlite3
    from config import DB_PATH
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("DELETE FROM pain_logs WHERE id = ?", (log_id,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/kpis/training-intelligence")
def get_training_intelligence(db: sqlite3.Connection = Depends(get_db)):
    """
    Returns advanced Training Intelligence KPIs:
    - Training Load Balance (aerobic/anaerobic ratio)
    - Polarization Index (80/20 model)
    - Recovery Quality Score (multi-factorial readiness)
    """
    cursor = db.cursor()
    
    # Get recent activities (last 30 days for polarization)
    cursor.execute("""
        SELECT id, fecha, tipo, nombre, distancia_km, duracion_min, calorias,
               fc_media, fc_max, elevacion_m, cadencia_media, fuente,
               training_load, aerobic_te, anaerobic_te, training_effect_label,
               hr_zone_1, hr_zone_2, hr_zone_3, hr_zone_4, hr_zone_5
        FROM activities 
        WHERE fecha >= date('now', '-30 days')
        ORDER BY fecha DESC
    """)
    activities = [dict(row) for row in cursor.fetchall()]
    
    # Get recent health data (last 7 days for recovery)
    cursor.execute("""
        SELECT fecha, sleep_hours, hrv_value, readiness_score, body_battery, 
               resting_hr, stress_level, spo2_avg, spo2_min, respiration_avg, 
               floors_ascended 
        FROM daily_health 
        ORDER BY fecha DESC 
        LIMIT 7
    """)
    health_data = [dict(row) for row in cursor.fetchall()]
    
    # Get profile for HR zone adjustments
    from services.context_manager import ContextManager
    ctx = ContextManager()
    profile = ctx._get_context_value('perfil_usuario')

    # Calculate KPIs
    kpis = calculate_training_intelligence(activities, health_data, profile=profile)
    
    return kpis

@app.get("/kpis/trends")
def get_training_trends(db: sqlite3.Connection = Depends(get_db)):
    """
    Returns historical trends for Training Intelligence KPIs (last 30 days)
    """
    cursor = db.cursor()
    
    # Get all activities and health data to allow calculation over time
    cursor.execute("""
        SELECT fecha, tipo, distancia_km, duracion_min, fc_media, training_load
        FROM activities 
        ORDER BY fecha ASC
    """)
    activities = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("""
        SELECT fecha, sleep_hours, hrv_value, readiness_score, body_battery, 
               resting_hr, stress_level, spo2_avg, respiration_avg
        FROM daily_health 
        ORDER BY fecha ASC
    """)
    health_data = [dict(row) for row in cursor.fetchall()]
    
    from services.kpi_service import calculate_historical_trends
    trends = calculate_historical_trends(activities, health_data, days=30)
    
    return trends

@app.post("/log/remote")
async def remote_log(data: dict):
    """Log messages from the frontend for debugging"""
    log_dir = os.path.join(os.getcwd(), "log_temp")
    if os.path.exists(log_dir):
        with open(os.path.join(log_dir, "frontend_remote.log"), "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                **data
            }) + "\n")
    return {"status": "ok"}

@app.post("/analyze/video")
async def analyze_video(video: UploadFile = File(...)):
    """Recibe un video del frontend y usa Gemini Vision para análisis biomecánico."""
    temp_path = f"temp_{video.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            buffer.write(await video.read())
        
        # Llamar al servicio AI
        result = await ai_service.analyze_video_technique(temp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis de video: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
