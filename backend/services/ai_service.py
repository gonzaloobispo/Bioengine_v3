import sqlite3
import json
from google import genai
import datetime
import time
import re
import asyncio
import logging
from services.context_manager import ContextManager
from services.multi_model_client import MultiModelClient
from services.cost_control import CostControl

# Setup detailed logging for debugging
logging.basicConfig(
    filename=r'c:\BioEngine_V3\ai_service_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DB_PATH = r"c:\BioEngine_V3\db\bioengine_v3.db"

class AIService:
    def __init__(self):
        self.db_path = DB_PATH
        # Using gemini-1.5-flash-latest (stable for v1beta API)
        self.model_name = "gemini-1.5-flash-latest"
        self._setup_gemini()
        self.context_manager = ContextManager()
        self._analysis_cache = {"timestamp": 0, "content": None}
        self._lock = None
        self._message_count = 0
        self._semantic_refresh_every = 10
        
        # Initialize Multi-Model Client for fallback
        self.multi_model_client = None
        self._setup_multi_model_client()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_gemini_key(self):
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
            print("Warning: No Gemini API key found")
        # Using REST API directly, no SDK client needed
    
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

    def _get_user_context(self):
        conn = self._get_connection()
        try:
            # Reduce context size to save tokens and avoid hitting rate limits faster
            activities = conn.execute("SELECT * FROM activities ORDER BY fecha DESC LIMIT 5").fetchall()
            biometrics = conn.execute("SELECT * FROM biometrics ORDER BY fecha DESC LIMIT 3").fetchall()
            
            context = "CONTEXTO DEL USUARIO (BIOENGINE V3):\n"
            context += "Últimas Actividades:\n"
            for a in activities:
                context += f"- {a['fecha']}: {a['tipo']}, {a['distancia_km']}km, {a['duracion_min']}min, {a['calorias']}cal\n"
            
            context += "\nÚltima Biometría (Peso):\n"
            for b in biometrics:
                context += f"- {b['fecha']}: {b['peso']}kg, {b['grasa_pct']}% grasa\n"
        finally:
            conn.close()
            
        return context

    async def _generate_content_with_retry(self, contents, retries=3):
        """Helper to call Gemini API via REST with retry logic for 429 errors."""
        import requests
        
        logger.info(f"Starting API call with model: {self.model_name}")
        key_preview = self.api_key[:10] if self.api_key else "no-key"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={key_preview}..."
        logger.debug(f"URL: {url}")
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": contents
                }]
            }]
        }
        
        for attempt in range(retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{retries}")
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}",
                    headers=headers, 
                    json=payload, 
                    timeout=30
                )
                
                logger.info(f"Response status: {response.status_code}")
                logger.debug(f"Response body: {response.text[:500]}")
                
                if response.status_code == 200:
                    data = response.json()
                    result = data['candidates'][0]['content']['parts'][0]['text']
                    logger.info("API call successful")
                    return result
                elif response.status_code == 429 or 'RESOURCE_EXHAUSTED' in response.text:
                    error_data = response.json() if response.text else {}
                    delay = 10 * (attempt + 1)
                    
                    # Try to extract retry delay from response
                    if 'error' in error_data and 'details' in error_data['error']:
                        for detail in error_data['error']['details']:
                            if detail.get('@type') == 'type.googleapis.com/google.rpc.RetryInfo':
                                retry_delay = detail.get('retryDelay', '')
                                if 's' in retry_delay:
                                    try:
                                        delay = float(retry_delay.replace('s', '')) + 1
                                    except:
                                        pass
                    
                    logger.warning(f"Rate limit hit, waiting {delay}s")
                    print(f"Gemini API Quota Exceeded. Waiting {delay:.1f}s before retry {attempt+1}/{retries}...")
                    await asyncio.sleep(delay)
                else:
                    error_msg = f"{response.status_code} {response.text}"
                    logger.error(f"API error: {error_msg}")
                    raise Exception(error_msg)
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error: {str(e)}")
                if attempt == retries - 1:
                    raise Exception(f"Network error: {str(e)}")
                await asyncio.sleep(5)
        
        logger.error("Failed after max retries")
        raise Exception("Failed after max retries due to rate limiting.")

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

    async def get_response(self, user_message, chat_history=None):
        if chat_history is None:
            chat_history = []
        system_instruction = (
            "Eres BioEngine Coach, un asistente experto en triatlón, running y salud biomecánica.\n"
            f"FECHA ACTUAL: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
            "=== MEMORIA Y CONTEXTO BASE ===\n"
            f"{self.context_manager.get_foundational_context()}\n\n"
            "Tus respuestas deben ser precisas, motivadoras pero realistas, y basadas tanto en los datos históricos "
            "como en el conocimiento base arriba mencionado.\n"
            "IMPORTANTE: Ten en cuenta la línea de tiempo. Si hay lesiones mencionadas en el contexto, "
            "respeta las restricciones indicadas hasta que se registren cambios.\n\n"
            "=== AUTO-ACTUALIZACIÓN DE MEMORIA ===\n"
            "Si el usuario informa dolor físico, debes incluir al FINAL de tu respuesta (en una línea nueva) "
            "el siguiente comando exactamente: [COMMAND: LOG_PAIN: nivel] (donde nivel es del 1 al 10).\n"
            "Si el usuario confirma que ha completado un ejercicio del plan, incluye: [COMMAND: UPDATE_CONTEXT: se completó X ejercicio].\n"
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
                query = f"{system_instruction}\n\n{prompt}"
                try:
                    response = await self._generate_content_with_retry(query)
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

    async def _update_semantic_summary(self, force=False):
        data = self.context_manager.get_semantic_summary_data()
        entries = data.get("entries", [])
        total_count = len(entries)
        if total_count == 0:
            return

        last_count = data.get("last_count", 0)
        if last_count < 0:
            last_count = 0
        if last_count > total_count:
            last_count = total_count

        if force:
            last_count = 0

        new_entries = entries[last_count:]
        if not new_entries:
            return

        prev_summary = data.get("summary", "").strip()
        new_lines = []
        for entry in new_entries:
            fecha = entry.get("fecha", "N/A")
            aprendizaje = entry.get("aprendizaje", "N/A")
            contexto_item = entry.get("contexto", "")
            if contexto_item:
                new_lines.append(f"- {fecha}: {aprendizaje} ({contexto_item})")
            else:
                new_lines.append(f"- {fecha}: {aprendizaje}")

        system_instruction = (
            "Eres un sistema de memoria de BioEngine. Resume en español la memoria evolutiva del usuario. "
            "Debes producir un resumen compacto pero rico: perfil, lesiones activas, restricciones, objetivos, "
            "preferencias, hábitos clave y cualquier patrón importante. Mantén el tono clínico-profesional. "
            "Salida: 6-10 líneas concisas, sin listas numeradas ni emojis."
        )

        prompt = "RESUMEN ACTUAL (si existe):\n"
        prompt += prev_summary or "(vacío)"
        prompt += "\n\nNUEVAS ENTRADAS A INCORPORAR:\n"
        prompt += "\n".join(new_lines)
        prompt += "\n\nGenera el resumen actualizado ahora."

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

        if summary_text is None:
            if not self.api_key:
                self._setup_gemini()

            if self.api_key:
                query = f"{system_instruction}\n\n{prompt}"
                try:
                    summary_text = await self._generate_content_with_retry(query)
                except Exception as e:
                    logger.error(f"Semantic summary via Gemini failed: {e}")

        if summary_text:
            cleaned = summary_text.strip()
            self.context_manager.set_semantic_summary(cleaned, total_count)

    async def get_coach_analysis(self):
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
                activities = conn.execute("SELECT * FROM activities ORDER BY fecha DESC LIMIT 10").fetchall()
                # Get last 5 weight measurements for trend
                biometrics = conn.execute("SELECT * FROM biometrics ORDER BY fecha DESC LIMIT 5").fetchall()
                
                # Build detailed context
                context = "DATOS DEL ATLETA (Gonzalo - 49 años, Tenis Master):\n\n"
                
                # Activity summary
                context += "📊 ACTIVIDADES RECIENTES:\n"
                if activities:
                    total_km = sum(a['distancia_km'] or 0 for a in activities)
                    total_time = sum(a['duracion_min'] or 0 for a in activities)
                    activity_types = {}
                    for a in activities:
                        tipo = a['tipo'] or 'Desconocido'
                        activity_types[tipo] = activity_types.get(tipo, 0) + 1
                        context += f"  • {a['fecha']}: {tipo} - {a['distancia_km'] or 0}km, {a['duracion_min'] or 0}min, {a['calorias'] or 0}cal\n"
                    
                    context += f"\nRESUMEN: {len(activities)} actividades, {total_km:.1f}km totales, {total_time:.0f}min\n"
                    context += f"Tipos: {', '.join([f'{k} ({v})' for k, v in activity_types.items()])}\n"
                else:
                    context += "  No hay actividades registradas recientemente.\n"
                
                # Weight trend
                context += "\n⚖️ TENDENCIA DE PESO:\n"
                if biometrics and len(biometrics) >= 2:
                    latest = biometrics[0]
                    oldest = biometrics[-1]
                    diff = latest['peso'] - oldest['peso']
                    context += f"  • Actual: {latest['peso']}kg ({latest['fecha']})\n"
                    context += f"  • Anterior: {oldest['peso']}kg ({oldest['fecha']})\n"
                    context += f"  • Cambio: {diff:+.2f}kg\n"
                    if latest['grasa_pct']:
                        context += f"  • Grasa corporal: {latest['grasa_pct']}%\n"
                elif biometrics:
                    context += f"  • Peso actual: {biometrics[0]['peso']}kg ({biometrics[0]['fecha']})\n"
                else:
                    context += "  No hay datos de peso disponibles.\n"
                    
            finally:
                conn.close()
            
            # Obtener contexto base para el análisis
            base_context = self.context_manager.get_foundational_context()
            
            # ENHANCED SYSTEM INSTRUCTION - Prompt mejorado y más específico
            system_instruction = f"""Eres BioEngine Coach, un entrenador de alto rendimiento.
FECHA ACTUAL: {datetime.datetime.now().strftime('%Y-%m-%d')}

=== CONOCIMIENTO BASE Y MEMORIA DEL ATLETA ===
{base_context}

PERFIL DEL ATLETA:
Nombre: Gonzalo
Edad: 49 años
Objetivo principal: Mantener rendimiento en tenis mientras optimiza composición corporal.
Consideraciones: El ciclismo es clave para movilidad de rodilla. Sigue el plan de 'Tenis Master 49+'.

TU TAREA:
Analizar los datos biométricos y de actividad para generar un análisis EJECUTIVO, ESPECÍFICO y ACCIONABLE, basado en la evolución temporal y el estado actual de sus lesiones/plan.

FORMATO DE SALIDA OBLIGATORIO:

📈 RESUMEN EJECUTIVO
[2-3 líneas concisas sobre el estado general. Incluye tendencia de peso y nivel de actividad]

🎯 ANÁLISIS DE TENDENCIAS
• Peso y Composición Corporal: [Analiza cambios reales en kg]
• Actividad Física: [Evalúa frecuencia y gaps]
• Rendimiento Deportivo: [Análisis de distancias y duraciones]

💡 RECOMENDACIONES PRIORITARIAS
1. [TENIS/TÉCNICA]: [Específico para tenis master]
2. [BIOMECÁNICA/PREVENCIÓN]: [Consejo para proteger rodilla/hombro]
3. [NUTRICIÓN/RECUPERACIÓN]: [Sugerencia sobre alimentación o descanso]

⚠️ PUNTO DE ATENCIÓN
[Observación crítica que requiere acción inmediata]

🎾 INSIGHT ESPECÍFICO DE TENIS
[Consejo técnico o táctico basado en los datos]

REGLAS CRÍTICAS:
✓ USA NÚMEROS REALES (fechas, kg, km)
✓ SÉ ESPECÍFICO: "bajaste 1.2kg" NO "has perdido peso"
✓ MENCIONA TENIS MASTER
✓ SEÑALA gaps de actividad
✓ TONO: Profesional, motivador pero realista."""


            query = f"{system_instruction}\n\n{context}\n\nGenera el análisis ahora:"

            try:
                result = await self._generate_content_with_retry(query)
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
