# BioEngine V4.2: Ecosistema Agéntico y Supervisión Clínica SOTA 2026

## 📜 Visión General
BioEngine ha evolucionado de un sistema de seguimiento deportivo convencional a un **Ecosistema de Inteligencia Clínica Adaptativa**. La versión 4.2 marca la consolidación de la arquitectura multi-agente, la integración de conocimiento experto profundo y un sistema de seguridad humana (HITL) sin precedentes.

---

## 🏗️ Arquitectura del Sistema

### 1. El Cerebro: AIService & Agentes
El núcleo del sistema utiliza una arquitectura de **Razonamiento System 2 (Chain-of-Thought)**:
- **Router Agent:** Clasifica las consultas del usuario y las deriva al especialista adecuado.
- **Coach Agent (v4):** Especialista en planificación y carga progresiva. Utiliza el **Manual Maestro 49+** para decisiones clínicas.
- **Recovery Agent:** Especialista en gestión de dolor y rehabilitación (integrado con el sistema PainTrack).
- **Biomechanics Agent:** Analiza métricas de impacto y técnica (MediaPipe Engine).

### 2. Infraestructura MCP (Model Context Protocol)
Utilizamos servidores MCP para garantizar una arquitectura **Zero-Copy** y modular:
- **Biometrics Server:** Gestiona telemetría avanzada (HRV, Sueño, Peso).
- **Context Server:** Mantiene la memoria evolutiva del atleta.
- **Training DB Server:** Persistencia de planes y ejecuciones.

---

## 🛡️ Características SOTA 2026

### 🛑 Human-In-The-Loop (HITL)
Ninguna acción crítica (cambio de fase, aumento de carga >10%, alertas médicas) se ejecuta sin aprobación.
- **Panel de Supervisión:** Una interfaz de centro de control donde el usuario actúa como "Especialista" aprobando o rechazando propuestas de la IA basadas en Riscos y Beneficios.

### 📊 ACWR Dual (Acute:Chronic Workload Ratio)
Monitorización ultra-precisa de la carga articular:
- **Diferenciación de Superficie:** Cálculo independiente para **Asfalto (Road)** y **Montaña (Trail)**.
- **Gestión de Impacto:** Prevención de lesiones de rodilla mediante el seguimiento del ratio más crítico.

### 🧠 Memoria Evolutiva y Procedencia
Cada decisión del Coach incluye metadatos de procedencia:
- Citas directas de manuales médicos.
- Trazas de razonamiento visibles (CoT).
- Justificación basada en historial de 28 días.

---

## 🛠️ Stack Tecnológico
- **Core:** FastAPI (Python 3.13) + SQLite.
- **IA:** Gemini 2.5 Flash / Pro (con Fallback a GPT-4o).
- **Frontend:** React + Vite + Framer Motion + Lucide Icons.
- **Middleware:** CORS habilitado para despliegue local y remoto.
- **Seguridad:** Admin Token y filtrado estricto de Pydantic.

---

## 📈 Hitos Alcanzados (Resumen de Misiones)
1. **Reconciliación de Inventario:** Odometría de precisión para Trek FX (>2,510km) y calzado.
2. **Sincronización de Carreras:** 19 actividades históricas reconciliadas con modelos de impacto.
3. **Estabilización Windows:** Saneo de Unicode y gestión de procesos (Puerto 8000).
4. **Inteligencia Clínica:** Implementación del protocolo de 9 días y alertas proactivas.

---

## 🚀 Próximos Pasos
- Integración de **BioConnect iOS** para biometría en tiempo real.
- Expansión de **Vision Pipeline** para análisis de técnica de marcha automático.
- Implementación de **Context Caching** para optimización de costes.

---
*Documentación generada el 08 de Febrero de 2026 por Antigravity Coach Sync.*
