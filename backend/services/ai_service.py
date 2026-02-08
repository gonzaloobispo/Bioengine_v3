import os
import json
import sqlite3
import datetime
import time
import re
import asyncio
import logging
from google import genai
from google.genai import types
from typing import Optional, List, Dict, Any, Union
from services.context_manager import ContextManager
from services.multi_model_client import MultiModelClient
from services.cost_control import CostControl
from models.schemas import ActivitySchema, BodyCompositionSchema
from models.schemas_biomecanica import GaitAnalysis, TennisFatigue, AthleteBiometrics2026, RiskAssessment
from services.biomechanics_pipeline import BiomechanicsPipeline
from pydantic import ValidationError
from services.mcp.mcp_client import MCPClient
from services.agents.agent_registry import AgentRegistry
from services.agents.router_agent import RouterAgent
from services.firebase_service import FirebaseService
from services.agents.coach_agent import CoachAgent
from services.agents.recovery_agent import RecoveryAgent
from services.agents.biomechanics_agent import BiomechanicsAgent
from services.agents.skills.notebooklm_bridge.bridge_logic import NotebookLMBridge

from config import DB_PATH, LOG_FILE, GEMINI_MODEL

# Setup detailed logging for debugging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AIService:
    # === PAUSE FLAG: Set to False to disable AI API calls ===
    AI_ENABLED = True  # <-- Change to True when ready to reactivate AI
    
    def __init__(self):
        self.db_path = DB_PATH
        # Using configured gemini model
        self.model_name = GEMINI_MODEL
        self.client = None
        self.context_manager = ContextManager()
        self._analysis_cache = {"timestamp": 0, "content": None}
        self._lock = None
        self._message_count = 0
        # Inicializar Infraestructura Multi-Agente (SOTA 2026)
        self.agent_registry = AgentRegistry()
        self.mcp_client = MCPClient()
        
        # Registrar especialistas (se completará el setup del cliente tras _setup_gemini)
        self.agent_registry.register(CoachAgent(self.mcp_client))
        self.agent_registry.register(RecoveryAgent(self.mcp_client))
        self.agent_registry.register(BiomechanicsAgent(self.mcp_client))
        
        # Inicializar Router
        self.router = RouterAgent(self.agent_registry)
        self.firebase = FirebaseService()
        
        # NotebookLM Bridge Implementation
        self.notebooklm_bridge = NotebookLMBridge(self.mcp_client)

        # Only initialize AI clients if enabled
        if self.AI_ENABLED:
            self._setup_gemini()
            self._setup_multi_model_client()
        else:
            logger.info("AI APIs are PAUSED. Set AI_ENABLED = True to reactivate.")

    async def is_notebooklm_ready(self) -> bool:
        """Verifica si el gateway de NotebookLM (Context MCP) responde."""
        try:
            # Intentamos una pequeña consulta al contexto
            ctx = await self.mcp_client.get_full_coach_context()
            return ctx is not None and len(ctx) > 0
        except Exception:
            return False

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_gemini_key(self) -> Optional[str]:
        # BioEngine V4: Prioritize environment variables from .env
        from config import GEMINI_API_KEY
        if GEMINI_API_KEY:
            logger.info("Using Gemini API key from environment/config")
            return GEMINI_API_KEY.strip()

        # Fallback to database (legacy)
        conn = self._get_connection()
        row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", ('gemini',)).fetchone()
        conn.close()
        if not row:
            return None
            
        try:
            val = row['credentials_json']
            # If it's already a dict
            if isinstance(val, dict):
                data = val
            else:
                data = json.loads(val)
                
            if isinstance(data, dict):
                # Try common keys
                for key in ['GEMINI_API_KEY', 'api_key', 'key']:
                    if key in data:
                        return str(data[key]).strip()
                return None
            return str(data).strip()
        except Exception:
            # Fallback to raw string if not JSON
            return str(row['credentials_json']).strip()

    def _setup_gemini(self):
        self.api_key = self._get_gemini_key()
        if not self.api_key:
            logger.warning("No Gemini API key found in secrets")
            print("Warning: No Gemini API key found")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
            if self.client:
                logger.info("Gemini API client initialized successfully")
                # Inyectar cliente y modelo en los agentes registrados
                for agent in self.agent_registry.get_all().values():
                    agent.model_client = self.client
                    agent._model_name = self.model_name
                self.router.model_client = self.client
    
    def _get_all_api_keys(self):
        """Retrieve all API keys for multi-model client."""
        conn = self._get_connection()
        keys = {}
        try:
            rows = conn.execute("SELECT provider, api_key FROM api_keys WHERE enabled = 1 ORDER BY priority ASC").fetchall()
            for row in rows:
                keys[row['provider']] = row['api_key']
        except sqlite3.OperationalError as e:
            logger.warning(f"Could not load API keys for multi-model: {e}")
        finally:
            conn.close()
        return keys
    
    def _setup_multi_model_client(self):
        """Initialize the multi-model client with fallback capability."""
        try:
            api_keys = self._get_all_api_keys()
            if api_keys:
                cost_control = CostControl()
                self.multi_model_client = MultiModelClient(api_keys, cost_control)
                logger.info(f"Multi-model client initialized with {len(api_keys)} providers")
            else:
                logger.warning("No API keys found, multi-model client not initialized")
        except Exception as e:
            logger.error(f"Failed to initialize multi-model client: {e}")
            self.multi_model_client = None

    def _get_user_context(self) -> str:
        conn = self._get_connection()
        try:
            # Reduce context size to save tokens and avoid hitting rate limits faster
            raw_activities = conn.execute("SELECT * FROM activities ORDER BY fecha DESC LIMIT 5").fetchall()
            raw_biometrics = conn.execute("SELECT * FROM biometrics ORDER BY fecha DESC LIMIT 3").fetchall()
            
            activities: List[ActivitySchema] = []
            for row in raw_activities:
                try:
                    activities.append(ActivitySchema(**dict(row)))
                except Exception:
                    continue

            biometrics: List[BodyCompositionSchema] = []
            for row in raw_biometrics:
                try:
                    biometrics.append(BodyCompositionSchema(**dict(row)))
                except Exception:
                    continue

            context = "CONTEXTO DEL USUARIO (BIOENGINE V3):\n"
            context += "Últimas Actividades:\n"
            for a in activities:
                date_str = a.fecha.strftime('%Y-%m-%d') if hasattr(a.fecha, 'strftime') else str(a.fecha)
                context += f"- {date_str}: {a.tipo}, {a.distancia_km}km, {a.duracion_min}min, {a.calorias}cal\n"
            
            context += "\nÚltima Biometría (Peso):\n"
            for b in biometrics:
                date_b = b.fecha.strftime('%Y-%m-%d') if hasattr(b.fecha, 'strftime') else str(b.fecha)
                context += f"- {date_b}: {b.peso}kg, {b.grasa_pct}% grasa\n"
        finally:
            conn.close()
            
        return context

    async def _generate_content_with_retry(self, prompt: str, system_instruction: Optional[str] = None, retries: int = 3) -> str:
        """Helper to call Gemini API via SDK with retry logic for 429 errors."""
        if not self.client:
            self._setup_gemini()
            if not self.client:
                raise Exception("Gemini client not initialized")

        logger.info(f"Starting API call with model: {self.model_name}")
        
        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        for attempt in range(retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{retries}")
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config
                )
                
                if response and response.text:
                    logger.info("API call successful via SDK")
                    return response.text
                else:
                    raise Exception("Empty response from Gemini SDK")
                    
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Gemini SDK error (attempt {attempt+1}): {err_msg}")
                
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    delay = 10 * (attempt + 1)
                    logger.warning(f"Rate limit hit, waiting {delay}s")
                    print(f"Gemini API Quota Exceeded. Waiting {delay:.1f}s before retry {attempt+1}/{retries}...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Non-retryable SDK error: {err_msg}")
                    raise e
        
        logger.error("Failed after max retries")
        raise Exception("Failed after max retries due to rate limiting or other errors.")

    def _format_chat_history(self, chat_history, limit=12):
        if not chat_history:
            return ""

        lines = []
        for msg in chat_history[-limit:]:
            if not isinstance(msg, dict):
                continue
            role = (msg.get("role") or msg.get("sender") or msg.get("type") or "").lower()
            text = msg.get("text") or msg.get("content") or msg.get("message")
            if not text:
                continue
            role_label = "Usuario" if role in {"user", "usuario", "human"} else "Coach"
            lines.append(f"{role_label}: {text}")

        if not lines:
            return ""

        return "=== HISTORIAL DE CHAT ===\n" + "\n".join(lines)

    async def get_response(self, user_message: str, chat_history: Optional[List[dict]] = None):
        """
        BioEngine V4: Usa el RouterAgent para derivar la consulta al especialista adecuado.
        """
        logger.info(f"AI Search query: {user_message}")
        
        # 1. Obtener contexto vía MCP (Standard V4)
        context = await self.mcp_client.get_full_coach_context()
        
        # 2. Despachar vía Router
        if not self.router:
            # Fallback a lógica de V3 si el router no está inicializado (no debería pasar)
            logger.warning("RouterAgent no inicializado. Usando fallback.")
            return await self._get_managed_response(user_message, chat_history)
            
        agent_response = await self.router.route(user_message, context, chat_history)
        
        # 3. Formatear respuesta final del agente
        if "error" in agent_response:
            return f"Hubo un error procesando tu consulta con el {agent_response['agent']}: {agent_response['error']}"
            
        final_text = agent_response.get("response", "No se generó respuesta.")
        
        # Añadir marca de agua de enrutamiento
        selected = agent_response["_router"]["selected_agent"]
        final_text += f"\n\n---\n*Respuesta generada por: Specialized {selected.capitalize()} Agent (BioEngine V4)*"

        # Sincronizar con BioConnect iOS via Firebase
        try:
            await self.firebase.sync_agent_response(selected, agent_response)
        except Exception as e:
            logger.error(f"Error syncing agent response with Firebase: {e}")
        
        return final_text

    async def _get_managed_response(self, user_message: str, chat_history: Optional[List[dict]] = None):
        # Mantiene la lógica original de get_response pero como método interno
        if not self.AI_ENABLED:
            return "El asistente de IA está temporalmente pausado. Tus datos de actividades y biométricos siguen sincronizándose normalmente. El análisis se reactivará pronto."
        
        if chat_history is None:
            chat_history = []
        system_instruction = (
            "Eres BioEngine Coach, un asistente experto en triatlón, running (calle y trail), tenis y salud biomecánica.\n"
            f"FECHA ACTUAL: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
            "=== MEMORIA Y CONTEXTO BASE ===\n"
            f"{self.context_manager.get_foundational_context()}\n\n"
            "=== INSTRUCCIONES DE ESPECIALIDAD ===\n"
            "1. RUNNING & TENIS: Tus consejos deben optimizar el rendimiento en carrera de calle/trail y la agilidad en tenis master.\n"
            "2. SALUD BIOMECÁNICA: Prioriza la protección de articulaciones (específicamente la rodilla derecha) mediante ejercicios de fortalecimiento y movilidad.\n"
            "3. ADHERENCIA Y HÁBITOS: Utiliza técnicas de psicología deportiva para fomentar la constancia. Si el usuario muestra desmotivación, ajusta el plan o refuerza los hitos logrados.\n"
            "4. GENERACIÓN DE PLANES Y EJERCICIOS: Al proponer un plan o ejercicios específicos:\n"
            "   - Usa TABLAS MARKDOWN o LISTAS NUMERADAS para organizar series, repeticiones y descansos.\n"
            "   - Incluye una GUÍA DE EJECUCIÓN (2-3 líneas) para cada ejercicio, explicando la técnica correcta y puntos clave de seguridad.\n"
            "   - Especifica el PROPÓSITO BIOMECÁNICO de cada ejercicio (ej: 'Poliquin Step-Up → Fortalece vasto medial → Protege rodilla en descensos').\n"
            "   - Formato ejemplo:\n"
            "     **Ejercicio 1: Sentadilla Búlgara**\n"
            "     - Series: 3 x 12 reps por pierna\n"
            "     - Descanso: 90 segundos\n"
            "     - Ejecución: Pie trasero elevado, rodilla delantera alineada con tobillo, descenso controlado.\n"
            "     - Propósito: Fortalecimiento unilateral del cuádriceps y glúteo, mejora estabilidad de rodilla.\n\n"
            "Tus respuestas deben ser precisas, motivadoras pero realistas, y basadas tanto en los datos históricos como en el conocimiento base.\n"
            "IMPORTANTE: Ten en cuenta la línea de tiempo y las restricciones de lesiones activas.\n\n"
            "=== AUTO-ACTUALIZACIÓN DE MEMORIA ===\n"
            "Si el usuario informa dolor físico: [COMMAND: LOG_PAIN: nivel]\n"
            "Si el usuario confirma que completó un entrenamiento: [COMMAND: UPDATE_CONTEXT: se completó X ejercicio].\n"
            "Habla en español de forma natural y profesional."
        )

        full_context = self._get_user_context()
        history_block = self._format_chat_history(chat_history)
        prompt_parts = [full_context]
        if history_block:
            prompt_parts.append(history_block)
        prompt_parts.append(f"Usuario: {user_message}")
        prompt = "\n\n".join(prompt_parts)

        response = None

        if self.multi_model_client is None:
            self._setup_multi_model_client()

        if self.multi_model_client:
            try:
                logger.info("Attempting chat with multi-model client...")
                response = self.multi_model_client.generate(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    max_tokens=1200
                )
            except Exception as fallback_error:
                logger.error(f"Chat multi-model failed: {fallback_error}")

        if response is None:
            if not self.api_key:
                self._setup_gemini()

            if self.api_key:
                try:
                    response = await self._generate_content_with_retry(prompt, system_instruction=system_instruction)
                except Exception as e:
                    logger.error(f"Chat Error with Gemini: {e}")

        if response is None:
            if self.multi_model_client is None and not self.api_key:
                return "Error: API keys no encontradas para generar respuesta."
            return "Error generando respuesta: todos los modelos alcanzaron sus límites o no están configurados."

        processed_response = response
        if "[COMMAND:" in response:
            pain_match = re.search(r"\[COMMAND: LOG_PAIN: (\d+)\]", response)
            if pain_match:
                level = int(pain_match.group(1))
                self.context_manager.log_pain(level, f"Registrado vía chat: {user_message[:100]}")
                logger.info(f"Pain logged from AI response: {level}")

            update_match = re.search(r"\[COMMAND: UPDATE_CONTEXT: (.+?)\]", response)
            if update_match:
                update_text = update_match.group(1).strip()
                self.context_manager.log_context_update(update_text, source="chat")
                logger.info("Context update logged from AI response")
                try:
                    asyncio.create_task(self._update_semantic_summary())
                except RuntimeError:
                    await self._update_semantic_summary()

            processed_response = re.sub(r"\[COMMAND:.*?\]", "", response).strip()

        self._message_count += 1
        if self._message_count % self._semantic_refresh_every == 0:
            try:
                asyncio.create_task(self._update_semantic_summary(force=True))
            except RuntimeError:
                await self._update_semantic_summary(force=True)

        return processed_response

    async def get_streaming_response(self, user_message: str, chat_history: Optional[List[dict]] = None):
        """
        Generador asíncrono para Streaming SSE.
        Yields: Chunks de texto.
        Post-procesamiento: Ejecuta comandos al finalizar el stream.
        """
        if not self.AI_ENABLED:
            yield "El asistente de IA está temporalmente pausado. Tus datos de actividades y biométricos siguen sincronizándose normalmente. El análisis se reactivará pronto."
            return

        if chat_history is None:
            chat_history = []
        
        # Reutilizar lógica de construcción de prompt (podríamos refactorizar esto a un método privado común)
        system_instruction = (
            "Eres BioEngine Coach, un asistente experto en triatlón, running (calle y trail), tenis y salud biomecánica.\n"
            f"FECHA ACTUAL: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
            "=== MEMORIA Y CONTEXTO BASE ===\n"
            f"{self.context_manager.get_foundational_context()}\n\n"
            "=== INSTRUCCIONES DE ESPECIALIDAD ===\n"
            "1. RUNNING & TENIS: Tus consejos deben optimizar el rendimiento en carrera de calle/trail y la agilidad en tenis master.\n"
            "2. SALUD BIOMECÁNICA: Prioriza la protección de articulaciones (específicamente la rodilla derecha) mediante ejercicios de fortalecimiento y movilidad.\n"
            "3. ADHERENCIA Y HÁBITOS: Utiliza técnicas de psicología deportiva para fomentar la constancia. Si el usuario muestra desmotivación, ajusta el plan o refuerza los hitos logrados.\n"
            "4. GENERACIÓN DE PLANES: Tienes la capacidad de proponer micro-sesiones de ejercicio adaptadas a la etapa física actual del usuario (registrada en su historial médico y de dolor).\n\n"
            "Tus respuestas deben ser precisas, motivadoras pero realistas, y basadas tanto en los datos históricos como en el conocimiento base.\n"
            "IMPORTANTE: Ten en cuenta la línea de tiempo y las restricciones de lesiones activas.\n\n"
            "=== AUTO-ACTUALIZACIÓN DE MEMORIA ===\n"
            "Si el usuario informa dolor físico: [COMMAND: LOG_PAIN: nivel]\n"
            "Si el usuario confirma que completó un entrenamiento: [COMMAND: UPDATE_CONTEXT: se completó X ejercicio].\n"
            "Habla en español de forma natural y profesional."
        )

        full_context = self._get_user_context()
        history_block = self._format_chat_history(chat_history)
        prompt_parts = [full_context]
        if history_block:
            prompt_parts.append(history_block)
        prompt_parts.append(f"Usuario: {user_message}")
        prompt = "\n\n".join(prompt_parts)

        if not self.multi_model_client:
             self._setup_multi_model_client()

        full_response_accumulator = ""
        
        try:
            logger.info("Starting Multi-Model Streaming API call")
            async for chunk in self.multi_model_client.generate_stream(
                prompt=prompt,
                system_instruction=system_instruction
            ):
                full_response_accumulator += chunk
                yield chunk

        except Exception as e:
            logger.error(f"Multi-Model Streaming Error: {e}")
            yield f"\n[Error crítico del sistema: {str(e)}]"
            return

        # --- Post-procesamiento de Comandos (Invisible para el yield, pero ejecuta lógica) ---
        if "[COMMAND:" in full_response_accumulator:
            pain_match = re.search(r"\[COMMAND: LOG_PAIN: (\d+)\]", full_response_accumulator)
            if pain_match:
                level = int(pain_match.group(1))
                self.context_manager.log_pain(level, f"Registrado vía chat (Stream): {user_message[:100]}")
                logger.info(f"Pain logged from AI response (Stream): {level}")

            update_match = re.search(r"\[COMMAND: UPDATE_CONTEXT: (.+?)\]", full_response_accumulator)
            if update_match:
                update_text = update_match.group(1).strip()
                self.context_manager.log_context_update(update_text, source="chat_stream")
                logger.info("Context update logged from AI response (Stream)")
                try:
                    asyncio.create_task(self._update_semantic_summary())
                except RuntimeError:
                    await self._update_semantic_summary()

        # Actualizar contadores
        self._message_count += 1
        if self._message_count % self._semantic_refresh_every == 0:
             try:
                asyncio.create_task(self._update_semantic_summary(force=True))
             except RuntimeError:
                await self._update_semantic_summary(force=True)

    async def _update_semantic_summary(self, force=False):
        data = self.context_manager.get_semantic_summary_data()
        total_count = data.get("total_count", 0)
        
        if total_count == 0:
            return

        last_count = data.get("last_count", 0)
        # Si force=True o hay más entradas que la última vez
        if force or total_count > last_count:
            logger.info(f"Updating semantic summary. New entries: {total_count - last_count}")
            
            # Obtener solo las nuevas memorias desde la base de datos
            new_memories = self.context_manager.get_new_evolutionary_memories(last_count)
            
            if not new_memories:
                return

            new_text = "\n".join([f"- [{m['date']}] {m['lesson']} ({m['context']})" for m in new_memories])
            
            system_instruction = (
                "Eres un sistema de memoria de BioEngine. Resume en español la memoria evolutiva del usuario. "
                "Debes producir un resumen compacto pero rico: perfil, lesiones activas, restricciones, objetivos, "
                "preferencias, hábitos clave y cualquier patrón importante. Mantén el tono clínico-profesional. "
                "Salida: 6-10 líneas concisas, sin listas numeradas ni emojis."
            )

            current_summary = data.get("current_summary", "")
            prompt = f"RESUMEN ACTUAL:\n{current_summary}\n\nNUEVAS ENTRADAS:\n{new_text}\n\nGenera el resumen actualizado:"

            summary_text = None
            if self.multi_model_client is None:
                self._setup_multi_model_client()

            if self.multi_model_client:
                try:
                    summary_text = self.multi_model_client.generate(
                        prompt=prompt,
                        system_instruction=system_instruction,
                        max_tokens=600
                    )
                except Exception as e:
                    logger.error(f"Semantic summary via multi-model failed: {e}")

            if summary_text:
                self.context_manager.set_semantic_summary(summary_text, total_count)



    async def get_coach_analysis(self) -> str:
        # Return static message if AI is paused
        if not self.AI_ENABLED:
            return """📊 **Análisis del Coach - MODO OFFLINE**

El análisis de IA está temporalmente pausado mientras se resuelven límites de cuota de la API.

**Mientras tanto, puedes:**
• Sincronizar datos de Garmin y Withings normalmente
• Revisar tus actividades y métricas en el dashboard
• Consultar el historial de peso y biometría

*El análisis inteligente se reactivará pronto.*"""
        
        # Initialize lock lazily to ensure it attaches to the current event loop
        if self._lock is None:
            self._lock = asyncio.Lock()

        async with self._lock:
            # Check cache with dynamic TTL
            now = time.time()
            if self._analysis_cache["content"]:
                ttl = self._analysis_cache.get("ttl", 900)
                if now - self._analysis_cache["timestamp"] < ttl:
                    return self._analysis_cache["content"]

            if not self.api_key:
                self._setup_gemini()
                if not self.api_key:
                    return "Configura tu API Key para ver el análisis."

            # Get enhanced context with more data points
            conn = self._get_connection()
            try:
                # Get last 50 activities for better trend analysis (including synced competitions)
                raw_activities = conn.execute("SELECT * FROM activities ORDER BY fecha DESC LIMIT 50").fetchall()
                # Get last 5 weight measurements for trend
                raw_biometrics = conn.execute("SELECT * FROM biometrics ORDER BY fecha DESC LIMIT 5").fetchall()

                activities: List[ActivitySchema] = []
                for row in raw_activities:
                    try:
                        activities.append(ActivitySchema(**dict(row)))
                    except ValidationError as e:
                        logger.warning(f"Skipping invalid activity {row['id']}: {e}")

                biometrics: List[BodyCompositionSchema] = []
                for row in raw_biometrics:
                    try:
                        biometrics.append(BodyCompositionSchema(**dict(row)))
                    except ValidationError as e:
                        logger.warning(f"Skipping invalid biometric {row['id']}: {e}")
                
                # Build detailed context
                context = "DATOS DEL ATLETA (Gonzalo - 49 años, Tenis Master):\n\n"
                
                # Activity summary
                context += "📊 ACTIVIDADES RECIENTES:\n"
                if activities:
                    total_km = sum(a.distancia_km or 0 for a in activities)
                    total_time = sum(a.duracion_min or 0 for a in activities)
                    activity_types = {}
                    for a in activities:
                        tipo = a.tipo or 'Desconocido'
                        activity_types[tipo] = activity_types.get(tipo, 0) + 1
                        # Note: fecha is datetime object now if parsed correctly, or str if schema keeps it str. 
                        # We defined datetime in schema, so let's format it.
                        date_str = a.fecha.strftime('%Y-%m-%d') if hasattr(a.fecha, 'strftime') else str(a.fecha)
                        context += f"  • {date_str}: {tipo} - {a.distancia_km or 0}km, {a.duracion_min or 0}min, {a.calorias or 0}cal\n"
                    
                    context += f"\nRESUMEN: {len(activities)} actividades, {total_km:.1f}km totales, {total_time:.0f}min\n"
                    context += f"Tipos: {', '.join([f'{k} ({v})' for k, v in activity_types.items()])}\n"
                else:
                    context += "  No hay actividades registradas recientemente.\n"
                
                # Weight trend
                context += "\n⚖️ TENDENCIA DE PESO:\n"
                if biometrics and len(biometrics) >= 2:
                    latest = biometrics[0]
                    oldest = biometrics[-1]
                    diff = latest.peso - oldest.peso
                    date_latest = latest.fecha if isinstance(latest.fecha, str) else latest.fecha.strftime('%Y-%m-%d')
                    date_oldest = oldest.fecha if isinstance(oldest.fecha, str) else oldest.fecha.strftime('%Y-%m-%d')
                    
                    context += f"  • Actual: {latest.peso}kg ({date_latest})\n"
                    context += f"  • Anterior: {oldest.peso}kg ({date_oldest})\n"
                    context += f"  • Cambio: {diff:+.2f}kg\n"
                    if latest.grasa_pct:
                        context += f"  • Grasa corporal: {latest.grasa_pct}%\n"
                elif biometrics:
                    b = biometrics[0]
                    date_b = b.fecha if isinstance(b.fecha, str) else b.fecha.strftime('%Y-%m-%d')
                    context += f"  • Peso actual: {b.peso}kg ({date_b})\n"
                else:
                    context += "  No hay datos de peso disponibles.\n"
                
                # Agregar datos de dolor de rodilla
                context += "\n🦵 HISTORIAL DE DOLOR DE RODILLA:\n"
                pain_logs = conn.execute("SELECT date, level, location, notes FROM pain_logs ORDER BY created_at DESC LIMIT 5").fetchall()
                if pain_logs:
                    for p in pain_logs:
                        pain_date = p['date'].split('T')[0] if 'T' in p['date'] else p['date']
                        context += f"  • {pain_date}: Nivel {p['level']}/10 - {p['notes']}\n"
                else:
                    context += "  • No hay registros de dolor.\n"
                    
            finally:
                conn.close()
            
            # Get pain history from database
            # NEW: Get context via MCP (Standard V4 Zero-Copy)
            mcp_ctx = await self.mcp_client.get_full_coach_context()
            
            # Extract and format data for the reasoning engine
            try:
                pain_history = json.loads(mcp_ctx.get('pain_history', '[]'))
                if not isinstance(pain_history, list):
                    pain_history = []
            except:
                pain_history = []
                
            foundational = f"""
## PERFIL Y CONTEXTO DE USUARIO (MCP)
{mcp_ctx.get('user_context', 'No disponible')}

## PLAN DE ENTRENAMIENTO (Knowledge Hub)
{mcp_ctx.get('training_plan', 'No disponible')}

## MANUAL TÉCNICO DE FISIOTERAPIA
{mcp_ctx.get('manual_fisioterapia', 'No disponible')}

- Peso/Composición: {mcp_ctx.get('weight')}
- Frecuencia Cardíaca/HRV: {mcp_ctx.get('heart_rate')}

## EQUIPAMIENTO Y ODÓMETRO
{mcp_ctx.get('equipment', 'No disponible')}

## MANUAL MASTER 49+ (PROTOCOLO 9 DÍAS)
{mcp_ctx.get('manual_master_49', 'No disponible')}
"""
            
            # Build SYSTEM 2 CHAIN-OF-THOUGHT PROMPT
            prompt = f"""Eres el Coach de BioEngine, un entrenador experto para atletas máster. 
Analiza los datos del usuario usando RAZONAMIENTO DELIBERATIVO (System 2).

**IMPORTANTE: Sigue estos pasos de pensamiento ANTES de generar tu análisis:**

## PASO 1: PENSAR (Análisis de Datos)
Examina los datos disponibles e identifica patrones clave:
- ¿Qué tendencias observas en actividades, peso y dolor?
- ¿Hay señales de alarma o mejoras significativas?
- ¿Los datos son consistentes con el perfil médico del usuario?

## PASO 2: VERIFICAR (Restricciones de Seguridad)
Comprueba contra estas restricciones médicas CRÍTICAS:
- ✅ NO recomendar ejercicios de alto impacto si dolor > 3/10
- ✅ NO aumentar carga más de 10% por semana (atleta máster)
- ✅ RESPETAR tendinosis rotuliana activa (evitar saltos, sprints en frío)
- ✅ RESPETAR pronación severa/pie plano (uso obligatorio de plantillas)
- ✅ RESPETAR psoas acortado (estiramientos diarios obligatorios)
- ✅ RESPETAR recuperación máster (48-72h entre sesiones del mismo grupo muscular)

## PASO 3: SIMULAR (Consecuencias)
Antes de recomendar algo, pregúntate:
- ¿Qué pasaría si el usuario sigue esta recomendación dado su estado actual?
- ¿Hay riesgos de lesión o sobrecarga?
- ¿Es sostenible a largo plazo?

## PASO 4: DECIDIR (Generar Análisis)
Basándote en los pasos anteriores, genera tu análisis con este formato OBLIGATORIO:

## ⚙️ RAZONAMIENTO DEL ENTRENADOR (System 2)
### Paso 1: Pensamiento Crítico y Análisis de Datos
[Razonamiento sobre tendencias de peso, dolor y entrenamiento detectados]

### Paso 2: Verificación de Restricciones y Seguridad
[Cruzamiento de datos con historial médico y reglas del manual]

### Paso 3: Simulación de Resultados
[Evaluación de riesgos/beneficios de las recomendaciones propuestas]

### Paso 4: Decisión y Síntesis Final
[Justificación técnica de las acciones recomendadas]

---

# 🏃‍♂️ Análisis del Coach BioEngine

## 📊 RESUMEN EJECUTIVO
[2-3 líneas del estado general: ¿Está progresando? ¿Hay alertas?]

## ⚖️ PESO Y COMPOSICIÓN
• Peso actual: [X kg el DD/MM/YYYY]
• Tendencia: [Mejorando/Estable/Empeorando - explicar cambio en últimas semanas]
• Interpretación: [Impacto en el rendimiento y salud articular]

## 🦵 ESTADO DE RODILLA
• Último registro de dolor: [Nivel X/10 el DD/MM/YYYY - SIEMPRE mostrar el último registro, incluso si es 0]
• Tendencia: [Mejorando/Estable/Empeorando basado en historial]
• Interpretación: [Si nivel = 0: "Excelente estado, ventana óptima para progresión controlada". Si nivel > 0: análisis de restricciones]
• Recomendación inmediata: [Si nivel = 0: "Aprovechar para ejercicios de Fase 2-3 del plan". Si nivel > 0: acciones específicas según nivel]

## 🏃 ÚLTIMA ACTIVIDAD Y EVOLUCIÓN
• Actividad: [Tipo - Distancia - Duración - Fecha]
• Comparación evolutiva: [Comparar con actividades similares previas: ¿mejoró el ritmo? ¿aumentó la distancia?]
• Análisis técnico: [FC media, elevación si aplica, cadencia]

## 💪 RECOMENDACIONES PRIORIZADAS
1. **[Acción más importante]**: [Explicación detallada con referencia al manual de entrenamiento]
2. **[Segunda acción]**: [Explicación]
3. **[Tercera acción]**: [Explicación]

## ⚠️ ALERTAS Y PRECAUCIONES
[Si hay restricciones activas o riesgos detectados, listarlos aquí. Si todo está bien, decir "Sin alertas activas"]

---

**DATOS DISPONIBLES:**

{context}

**HISTORIAL DE DOLOR:**
{json.dumps(pain_history, indent=2, ensure_ascii=False)}

**CONTEXTO BASE (Perfil Médico, Equipamiento, Manual):**
{foundational[:50000]}... [Contexto completo disponible]

**AHORA GENERA TU ANÁLISIS SIGUIENDO LOS 4 PASOS DE RAZONAMIENTO Y EL FORMATO OBLIGATORIO.**
"""

            # Generate analysis using Gemini with System 2 reasoning
            system_instruction = """Eres un entrenador deportivo experto especializado en atletas máster (49+ años).
Tu prioridad es la SEGURIDAD y la prevención de lesiones. 
Usa razonamiento deliberativo (System 2) para tomar decisiones informadas.

IMPORTANTE: Antes de generar tu análisis final, PIENSA EN VOZ ALTA siguiendo los 4 pasos:
1. PENSAR: Analiza los datos y patrones. **REVISA EL ODÓMETRO DEL EQUIPAMIENTO (especialmente la Trek FX Sport AL 3 > 2500km).**
2. VERIFICAR: Comprueba restricciones médicas y **CITAR EL PROTOCOLO DE 9 DÍAS del Manual Master 49+**.
3. SIMULAR: Evalúa consecuencias de tus recomendaciones.
4. DECIDIR: Genera el análisis final.

SIEMPRE sigue el formato de análisis especificado y añade una sección de 'MANTENIMIENTO DE EQUIPO' si detectas umbrales superados.
"""

            try:
                response_text = await self._generate_content_with_retry(
                    prompt=prompt,
                    system_instruction=system_instruction
                )
                
                # Cache the analysis with dynamic TTL
                ttl = 900  # 15 minutes default
                # If there's recent pain or significant changes, reduce TTL
                if pain_history and pain_history[0].get('level', 0) > 3:
                    ttl = 300  # 5 minutes if pain is high
                
                self._analysis_cache = {
                    "content": response_text,
                    "timestamp": time.time(),
                    "ttl": ttl
                }
                
                return response_text
                
            except Exception as e:
                logger.error(f"Error generating coach analysis: {e}", exc_info=True)
                return f"Error al generar análisis: {str(e)}"
            finally:
                conn.close()

    async def analyze_biomechanics_video(self, video_path: str, analysis_type: str = 'gait') -> AthleteBiometrics2026:
        """
        Analiza un video de biomecánica usando Gemini 3 Pro (Visión Nativa).
        Ingesta directa de video aprovechando la ventana de contexto de 1M tokens.
        """
        if not self.AI_ENABLED:
            raise Exception("AI is disabled")

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")

        logger.info(f"Starting biomechanics video analysis: {analysis_type} for {video_path}")

        # En una implementación real de 2026 con google-genai SDK >= 0.3.0:
        # file = self.client.files.upload(path=video_path)
        # while file.state.name == 'PROCESSING':
        #     time.sleep(2)
        #     file = self.client.files.get(name=file.name)

        prompt = ""
        if analysis_type == 'gait':
            prompt = (
                "Analiza este video de carrera (Gait Analysis). "
                "Detecta: cadencia (SPM), tipo de pisada (strike type), "
                "pronación, y específicamente el riesgo de valgo de rodilla (ángulo en grados). "
                "Responde EXCLUSIVAMENTE con un objeto JSON que siga el esquema AthleteBiometrics2026.gait."
            )
        else:
            prompt = (
                "Analiza este video de tenis (Serve Mechanics). "
                "Detecta: pérdida de velocidad en el servicio, tiempo de reacción y eficiencia del golpe. "
                "Evalúa la fatiga biomecánica y riesgo de lesión. "
                "Responde EXCLUSIVAMENTE con un objeto JSON que siga el esquema AthleteBiometrics2026.tennis_fatigue."
            )

        # Simulación de llamada SOTA 2026
        try:
            # response = await self.client.aio.models.generate_content(
            #     model=self.model_name,
            #     contents=[file, prompt],
            #     config=types.GenerateContentConfig(
            #         response_mime_type='application/json',
            #         response_schema=AthleteBiometrics2026
            #     )
            # )
            # data = json.loads(response.text)
            
            # Mock de respuesta para desarrollo inicial
            logger.info("Simulating Gemini 3 Pro response for biomechanics")
            mock_data = {
                "clínical_notes": "Análisis preliminar detecta buena estabilidad, pero leve valgo en rodilla derecha al fatigar.",
                "next_step": "Realizar 3 series de Clamshells antes de la próxima salida."
            }
            if analysis_type == 'gait':
                mock_data["gait"] = {
                    "cadence_spm": 174,
                    "pronation_type": "Neutral",
                    "strike_type": "Midfoot",
                    "knee_valgus_assessment": {
                        "angle_degrees": 8.5,
                        "risk_level": "medium",
                        "recommendation": "Ejercicios de glúteo medio (Clamshells)"
                    }
                }
            elif analysis_type == 'tennis':
                mock_data["tennis_fatigue"] = {
                    "serve_speed_loss_pct": 12.0,
                    "reaction_time_ms": 450,
                    "stroke_efficiency": 0.85,
                    "injury_warning": False,
                    "fatigue_score": 6.5
                }
            
            return AthleteBiometrics2026(**mock_data)

        except Exception as e:
            logger.error(f"Error in biomechanics video analysis: {e}")
            raise e
    async def analyze_biomechanics_hybrid(self, video_path: str, user_profile: Dict[str, Any]) -> RiskAssessment:
        """
        Análisis Híbrido: MediaPipe (Visión Local) + Gemini 3 Pro (Razonamiento Clínico).
        """
        logger.info(f"Starting hybrid analysis for {video_path}")
        
        # 1. Capa de Visión Local (MediaPipe)
        json_metrics_path = self.vision_pipeline.process_video(video_path)
        with open(json_metrics_path, 'r') as f:
            metrics_data = json.load(f)
            
        # 2. Capa de Razonamiento (Gemini 3 Pro)
        prompt_template_path = os.path.join(os.path.dirname(__file__), "clinical_prompt_template.txt")
        with open(prompt_template_path, 'r', encoding='utf-8') as f:
            system_instruction = f.read()

        # Enriquecer el prompt con datos reales
        user_context_str = f"Atleta: {user_profile.get('name')}, Edad: {user_profile.get('age')}, " \
                           f"Historial: {user_profile.get('injury_history')}, Dolor Actual: {user_profile.get('pain_level')}/10"
        
        metrics_str = json.dumps(metrics_data["metrics"], indent=2)
        
        prompt = f"### DATOS DEL ATLETA:\n{user_context_str}\n\n" \
                 f"### MÉTRICAS MEDIAPIPE (3D LANDMARKS):\n{metrics_str}\n\n" \
                 f"Analiza el riesgo biomecánico y responde en el formato JSON solicitado."

        try:
            # Configurar respuesta estructurada (SOTA 2026)
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type='application/json'
                )
            )
            
            raw_response = response.text
            # Safety Check: Inyección de Alerta de Asimetría Manual si falla el LLM
            if metrics_data["metrics"]["asymmetry_pct"] > 15.0:
                logger.warning("HIGH ASYMMETRY DETECTED (>15%). Forcing alert.")
                # Aquí podríamos modificar el JSON de respuesta antes de validarlo
            
            return RiskAssessment.model_validate_json(raw_response)

        except Exception as e:
            logger.error(f"Error in hybrid analysis: {e}")
            # Fallback a un objeto de riesgo conservador si falla la IA
            return RiskAssessment(
                risk_level="ALTO",
                observations=["Error en el procesamiento de IA."],
                recommendation="Detener actividad y consultar físio.",
                clinical_rationale="El sistema no pudo validar la seguridad del movimiento.",
                asymmetry_alert=metrics_data["metrics"]["asymmetry_pct"] > 15.0
            )
