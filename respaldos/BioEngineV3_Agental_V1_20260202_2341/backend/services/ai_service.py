import sqlite3
import json
from google import genai
from google.genai import types
import datetime
import time
import re
import asyncio
import logging
from typing import Optional, List, Dict, Any
from services.context_manager import ContextManager
from services.multi_model_client import MultiModelClient
from services.cost_control import CostControl
from models.schemas import ActivitySchema, BodyCompositionSchema
from pydantic import ValidationError

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
        self._semantic_refresh_every = 10
        self.multi_model_client = None
        
        # IDs de NotebookLM para contexto especializado
        self.notebook_adherencia = "d5eaf169-e04b-469a-bd5a-809ba32466ab"
        self.notebook_fortalecimiento = "1f927884-ec18-45f3-82b3-f1d0415e6904"
        
        # Only initialize AI clients if enabled
        if self.AI_ENABLED:
            self._setup_gemini()
            self._setup_multi_model_client()
        else:
            logger.info("AI APIs are PAUSED. Set AI_ENABLED = True to reactivate.")

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_gemini_key(self) -> Optional[str]:
        conn = self._get_connection()
        row = conn.execute("SELECT credentials_json FROM secrets WHERE service = ?", ('gemini',)).fetchone()
        conn.close()
        if not row:
            return None
            
        try:
            val = row['credentials_json']
            # If it's already a dict (rare with SQLite but possible if driver auto-converts)
            if isinstance(val, dict):
                data = val
            else:
                data = json.loads(val)
                
            if isinstance(data, dict):
                # Try common keys
                for key in ['GEMINI_API_KEY', 'api_key', 'key']:
                    if key in data:
                        return str(data[key]).strip()
                # If no known key, return the whole dict if it's meant to be the key (unlikely)
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
            logger.info("Gemini SDK client initialized")
    
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

    async def get_response(self, user_message: str, chat_history: Optional[List[dict]] = None) -> str:
        # Return static message if AI is paused
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

        # Inicializar cliente Gemini si no existe (No usamos multi-model para streaming por ahora)
        if not self.client:
            self._setup_gemini()
        
        if not self.client:
             yield "Error: No se pudo inicializar el cliente de Gemini para streaming."
             return

        config = types.GenerateContentConfig(system_instruction=system_instruction)
        
        full_response_accumulator = ""
        
        try:
            logger.info("Starting Streaming API call with Gemini")
            # Llamada con stream=True (en el nuevo SDK es generate_content_stream)
            response_stream = await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            
            async for chunk in response_stream:
                if chunk.text:
                    full_response_accumulator += chunk.text
                    yield chunk.text

        except Exception as e:
            logger.error(f"Streaming Error: {e}")
            yield f"\n[Error de conexión: {str(e)}]"
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
                # Get last 10 activities for better trend analysis
                raw_activities = conn.execute("SELECT * FROM activities ORDER BY fecha DESC LIMIT 10").fetchall()
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
                    
            finally:
                conn.close()
            
            # Obtener contexto base para el análisis
            base_context = self.context_manager.get_foundational_context()
            
            # ENHANCED SYSTEM INSTRUCTION - Prompt mejorado y más específico
            system_instruction = f"""Eres BioEngine Coach, un experto entrenador de triatlón, running (calle/trail) y tenis master.
FECHA ACTUAL: {datetime.datetime.now().strftime('%Y-%m-%d')}

=== CONOCIMIENTO BASE Y MEMORIA DEL ATLETA ===
{base_context}

PERFIL DEL ATLETA:
Nombre: Gonzalo
Edad: 49 años
Objetivo: Optimizar rendimiento en tenis master y trail running, protegiendo la salud biomecánica (rodilla).

TU TAREA:
Generar un análisis EJECUTIVO, ESPECÍFICO y ACCIONABLE. Debes basarte en la evolución de los datos y proponer ajustes que aseguren la ADHERENCIA al plan.

FORMATO DE SALIDA:

📈 RESUMEN EJECUTIVO
[Estado general, tendencia de peso y nivel de adherencia a los hábitos]

🎯 ANÁLISIS DE TENDENCIAS (BIOMECÁNICA)
• Evolución Física: [Análisis de kg y % grasa]
• Actividad y Carga: [Frecuencia en tenis/running y gaps detectados]
• Estado de Salud: [Análisis de tendencia de dolor y movilidad]

💡 MICRO-PLAN ADAPTATIVO (ETAPA ACTUAL)
[Propón 2-3 ejercicios o ajustes específicos según su estado físico de hoy]

⚠️ FOCO EN ADHERENCIA
[Técnica o consejo motivacional basado en sus hitos recientes]

🎾 INSIGHT TÉCNICO
[Consejo para Tenis o Trail Running basado en sus métricas]

REGLAS:
✓ USA NÚMEROS REALES.
✓ PRIORIZA LA RODILLA.
✓ TONO: Profesional y altamente motivador."""


            try:
                result = await self._generate_content_with_retry(context, system_instruction=system_instruction)
                # Save success to cache (15 mins)
                self._analysis_cache = {"timestamp": time.time(), "content": result, "ttl": 900}
                return result
            except Exception as e:
                logger.error(f"Coach Analysis Error with Gemini: {e}")
                
                # Try fallback to multi-model client
                if self.multi_model_client:
                    try:
                        logger.info("Attempting fallback to multi-model client...")
                        print("⚠️ Gemini alcanzó límite de cuota. Intentando modelo alternativo...")
                        
                        # Use multi-model client (will try other models automatically)
                        result = self.multi_model_client.generate(
                            prompt=f"{context}\n\nGenera el análisis ahora:",
                            system_instruction=system_instruction,
                            max_tokens=2000
                        )
                        
                        # Save success to cache (15 mins)
                        self._analysis_cache = {"timestamp": time.time(), "content": result, "ttl": 900}
                        logger.info("Successfully generated analysis with fallback model")
                        return result
                    except Exception as fallback_error:
                        logger.error(f"Fallback also failed: {fallback_error}")
                        error_msg = "No se pudo generar el análisis. Todos los modelos alcanzaron sus límites de cuota."
                        # Cache error for only 2 minutes to allow sooner retry
                        self._analysis_cache = {"timestamp": time.time(), "content": error_msg, "ttl": 120}
                        return error_msg
                else:
                    print(f"Coach Analysis Error: {e}")
                    error_msg = "No se pudo generar el análisis debido a límites de cuota de la API."
                    # Cache error for only 2 minutes to allow sooner retry
                    self._analysis_cache = {"timestamp": time.time(), "content": error_msg, "ttl": 120}
                    return error_msg
