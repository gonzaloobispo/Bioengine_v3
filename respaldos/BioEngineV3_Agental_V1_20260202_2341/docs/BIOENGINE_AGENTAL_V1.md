# 🧠 BioEngine Agental V1: El Coach Evolutivo

Este documento detalla la arquitectura de agentes y la inteligencia clínica implementada en la versión 3.1.0 de BioEngine.

---

## 🏛️ Arquitectura: El Cerebro y las Manos

BioEngine ha evolucionado de un simple dashboard a un sistema agéntico donde la toma de decisiones está distribuida y anclada en una base de conocimientos real.

### 1. El Cerebro (NotebookLM)
- **Función:** Actúa como la "Corteza Cerebral" del sistema.
- **Anclaje:** Contiene toda la documentación técnica, planes de entrenamiento de triatlón, protocolos de fisioterapia para rodilla y estudios biomecánicos.
- **Conectividad:** Integrado mediante un servidor MCP que permite al sistema hacer consultas clínicas en tiempo real.

### 2. Las Manos (Skills System)
Ubicadas en `agent/skills/`, son módulos de lógica pura que ejecutan tareas específicas:

- **`entrenador-adaptativo` (Maestra):** Orquesta la rutina diaria. Si te duele la rodilla, consulta a NotebookLM un ejercicio alternativo y ajusta el entrenamiento de Garmin.
- **`analyze-gait` (Biomecánica):** Evalúa tu cadencia y tiempo de contacto para prevenir lesiones.
- **`adjust-nutrition` (Nutrición):** Calcula tus macros basándose en la carga de entrenamiento real (ACWR).
- **`emergency` (Protocolo de Riesgo):** Detecta anomalías cardíacas o fatiga extrema y detiene el entrenamiento automáticamente.

---

## 🌊 Flujo de Datos y Experiencia Usuario

### 🏎️ Streaming en Tiempo Real (SSE)
El Coach ya no te hace esperar. Las respuestas se generan palabra por palabra, proporcionando una sensación de conversación fluida.

### 🔒 Robustez con Pydantic
Cada kilo de peso y cada kilómetro recorrido está validado. El sistema rechaza datos corruptos o fuera de rango fisiológico, garantizando que el Coach siempre trabaje con información veraz.

### 📊 Dashboard de Sistema (Control de Mando)
Una nueva vista dedicada a la salud del software:
- **Salud de Agentes:** Monitorización en vivo de la conexión con Gemini y NotebookLM.
- **Control de Costes:** Visualización de gasto en APIs y capacidad de bloquear modelos de pago con un clic.
- **Memoria Evolutiva:** Estado de la síntesis de información de tus logs diarios.

---

## 🛠️ Mantenimiento Autónomo

BioEngine ahora "se cuida solo":
- **`log-manager`:** Rotación automática de logs cuando superan los 10MB para proteger el almacenamiento.
- **`deep-research`:** Capacidad para buscar y resumir nuevos papers científicos para mantener al Coach actualizado.

---

## 📂 Estructura de Archivos Clave

- `backend/main.py`: Corazón de la API FastAPI.
- `backend/services/ai_service.py`: El orquestador de IA (Streaming, Comandos, Prompts).
- `agent/skills/`: Directorio de las habilidades agénticas.
- `BioEngine_V3_Contexto_Base/`: La fuente de la verdad para el entrenamiento y salud.

---

**BioEngine V3: Inteligencia que evoluciona contigo.**
