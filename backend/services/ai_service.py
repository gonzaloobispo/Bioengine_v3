import sqlite3
import json
from google import genai
import datetime
import time
import re
import asyncio
import logging

# Setup detailed logging for debugging
logging.basicConfig(
    filename=r'c:\BioEngine_V3\ai_service_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DB_PATH = r"c:\BioEngine_V3\bioengine_v3.db"

class AIService:
    def __init__(self):
        self.db_path = DB_PATH
        # Using gemini-2.5-flash (latest stable model, confirmed available)
        self.model_name = "gemini-2.5-flash"
        self._setup_gemini()
        self._analysis_cache = {"timestamp": 0, "content": None}
        self._lock = None

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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key[:10]}..."
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

    async def get_response(self, user_message, chat_history=[]):
        if not self.api_key:
            self._setup_gemini()
            if not self.api_key:
                return "Error: API Key de Gemini no encontrada o inválida. Verifica la tabla 'secrets'."

        system_instruction = (
            "Eres BioEngine Coach, un asistente experto en triatlón, running y salud biomecánica. "
            "Tienes acceso a los datos reales del usuario (Gonzalo). "
            "Tus respuestas deben ser precisas, motivadoras pero realistas, y basadas en los datos proporcionados. "
            "Si el usuario pregunta por su progreso, analiza las últimas actividades y peso. "
            "Habla en español de forma natural y profesional."
        )

        full_context = self._get_user_context()
        query = f"{system_instruction}\n\n{full_context}\n\nUsuario: {user_message}"
        
        try:
            return await self._generate_content_with_retry(query)
        except Exception as e:
            return f"Error generando respuesta: {str(e)}"

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
            
            # ENHANCED SYSTEM INSTRUCTION - Prompt mejorado y más específico
            system_instruction = """Eres BioEngine Coach, un entrenador de alto rendimiento especializado en:
- Tenis Master (categoría 45-50 años)
- Biomecánica deportiva y prevención de lesiones
- Running y entrenamiento cardiovascular
- Análisis de datos biométricos y rendimiento

PERFIL DEL ATLETA:
Nombre: Gonzalo
Edad: 49 años
Deporte principal: Tenis Master (competitivo)
Actividades complementarias: Running, Caminata, Entrenamiento funcional
Objetivo principal: Mantener rendimiento en tenis mientras optimiza composición corporal
Consideraciones: Prevención de lesiones típicas de edad (rodilla, hombro, codo de tenista)

TU TAREA:
Analizar los datos biométricos y de actividad para generar un análisis EJECUTIVO, ESPECÍFICO y ACCIONABLE.

FORMATO DE SALIDA OBLIGATORIO:

📈 RESUMEN EJECUTIVO
[2-3 líneas concisas sobre el estado general. Incluye:
- Tendencia de peso (últimas 2-4 semanas)
- Nivel de actividad (frecuencia semanal)
- Una observación clave o patrón detectado]

🎯 ANÁLISIS DE TENDENCIAS

• Peso y Composición Corporal:
[Analiza cambios en peso. Especifica:
- Cambio absoluto en kg (ej: "-1.2kg en 3 semanas")
- Velocidad de cambio (saludable: 0.5-1kg/semana)
- Si está en rango óptimo para tenis master (IMC 22-25)
- Impacto en rendimiento (peso óptimo mejora movilidad en cancha)]

• Actividad Física:
[Evalúa frecuencia y consistencia. Incluye:
- Días activos por semana (ideal: 4-6 para tenis master)
- Distribución de tipos de actividad (tenis vs cardio vs descanso)
- Gaps preocupantes (>3 días sin actividad)
- Patrones semanales (ej: "concentrado en martes/jueves/sábado")]

• Rendimiento Deportivo:
[Analiza métricas de rendimiento:
- Distancias promedio por tipo de actividad
- Duración de sesiones (tenis: 60-90min ideal)
- Calorías quemadas (tendencia)
- Comparación con semanas anteriores]

💡 RECOMENDACIONES PRIORITARIAS

1. [TENIS/TÉCNICA]: [Recomendación específica para mejorar rendimiento en tenis master. 
   Ejemplos: "Aumenta sesiones de movilidad pre-partido", "Incorpora trabajo de core 2x/semana para potencia de saque"]

2. [BIOMECÁNICA/PREVENCIÓN]: [Consejo para prevenir lesiones típicas.
   Ejemplos: "Fortalece rotadores de hombro para prevenir tendinitis", "Trabajo excéntrico de cuádriceps para proteger rodilla"]

3. [NUTRICIÓN/RECUPERACIÓN]: [Sugerencia sobre alimentación, hidratación o descanso.
   Ejemplos: "Aumenta proteína post-entrenamiento (30g en 30min)", "Prioriza 7-8h de sueño para recuperación muscular"]

⚠️ PUNTO DE ATENCIÓN
[UNA observación crítica que requiere acción inmediata. Puede ser:
- Riesgo de lesión por sobreentrenamiento
- Necesidad de descanso activo
- Gap peligroso en entrenamiento (pérdida de condición)
- Oportunidad de mejora específica
- Alerta sobre tendencia negativa en peso/actividad]

🎾 INSIGHT ESPECÍFICO DE TENIS
[Consejo técnico o táctico basado en los datos. Ejemplos:
- "Tu frecuencia de 3 partidos/semana es óptima para master"
- "Considera agregar 1 sesión de footwork para mejorar desplazamientos"
- "El trabajo cardiovascular complementario mejorará tu resistencia en sets largos"]

REGLAS CRÍTICAS:
✓ USA NÚMEROS REALES de los datos proporcionados (fechas, kg, distancias, calorías)
✓ SÉ ESPECÍFICO: "bajaste 1.2kg en 3 semanas" NO "has perdido peso"
✓ MENCIONA TENIS MASTER en contexto relevante
✓ SEÑALA gaps de actividad si existen (ej: "4 días sin entrenar entre 20-24 enero")
✓ EVALÚA velocidad de cambio de peso (muy rápido >1kg/sem = alerta)
✓ TONO: Profesional, motivador pero realista. Como un entrenador de confianza.
✓ MÁXIMO 300 palabras total
✓ NO uses placeholders genéricos ("X días", "Y kg") - USA DATOS REALES
✓ NO repitas información - cada sección debe aportar valor único
✓ PRIORIZA insights accionables sobre descripciones obvias

CONTEXTO ADICIONAL:
- Tenis master requiere equilibrio entre potencia, resistencia y prevención de lesiones
- A los 49 años, la recuperación es más lenta - enfatiza descanso adecuado
- El peso óptimo mejora movilidad en cancha sin sacrificar potencia
- La consistencia es más importante que la intensidad extrema"""


            query = f"{system_instruction}\n\n{context}\n\nGenera el análisis ahora:"

            try:
                result = await self._generate_content_with_retry(query)
                # Save success to cache (15 mins)
                self._analysis_cache = {"timestamp": time.time(), "content": result, "ttl": 900}
                return result
            except Exception as e:
                print(f"Coach Analysis Error: {e}")
                error_msg = "No se pudo generar el análisis debido a límites de cuota de la API."
                # Cache error for only 2 minutes to allow sooner retry
                self._analysis_cache = {"timestamp": time.time(), "content": error_msg, "ttl": 120}
                return error_msg
