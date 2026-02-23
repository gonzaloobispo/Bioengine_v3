# BioEngine V3 - Manual del Sistema y Capacidades SOTA 🚀
*Documento Vivo - Última Actualización: Febrero 2026*

Este documento técnico sirve como manual detallado de todas las capacidades, módulos y lógicas de negocio implementadas en BioEngine V3. Actúa como referencia para el usuario y como base de conocimiento para futuros agentes.

---

## 1. Arquitectura General
BioEngine V3 es una plataforma de análisis deportivo y de salud diseñada específicamente para un atleta Máster (49+ años, hipertensión controlada con Atenolol).
- **Frontend**: React + Vite + TailwindCSS + Framer Motion (Interactividad SOTA).
- **Backend**: FastAPI (Python) asíncrono.
- **Base de Datos**: SQLite (`bioengine.db`) con arquitectura **Multi-tenant**.
- **Seguridad**: Autenticación vía JWT (JSON Web Tokens) con hashing Passlib/Bcrypt.
- **Motor Cognitivo (IA)**: Google Gemini 2.5 Flash / Pro Vision, orquestado a través de infraestructura Multi-Agente y Servidores MCP (Model Context Protocol).

---

## 2. Arquitectura Multiusuario (Multi-tenant)
BioEngine ha evolucionado de una herramienta personal a una plataforma escalable para múltiples usuarios.
- **Aislamiento de Datos**: Cada registro de actividad, biometría y contexto está vinculado a un `user_id`.
- **RBAC (Role-Based Access Control)**: Sistema de roles (Admin, User) para gestionar permisos.
- **Feature Flags**: Capacidad de activar/desactivar módulos costosos (como el Coach AI) de forma granular por usuario.
- **Sincronización Personalizada**: Cada usuario puede configurar sus propios `secrets` de Garmin, Apple Health o Withings.

---

## 2. Capacidades y Módulos Core

### 2.1. Gestión de Zonas Cardíacas Dinámicas (Clínico)
- **Fórmula de Brawner Adaptativa**: El sistema calcula la Frecuencia Cardíaca Máxima (FC Max) dinámicamente usando la fórmula de Brawner adaptada para usuarios en tratamiento con betabloqueantes (Atenolol 50mg): `FC_Max = 164 - (0.7 * Edad)`.
- **Actualización Automática**: Al cambiar la edad del usuario (vía fecha de nacimiento en el perfil), las zonas de HR se recalculan automáticamente sin intervención manual.
- **Límites Protectivos**: Cualquier pulso que exceda los límites de la fórmula bajo efecto del Atenolol detona alertas clínicas en el análisis del Coach.

### 2.2. Sistema de Rastreo de Dolor (Traceability)
- **Log de Dolor Preciso**: Registro de niveles de dolor (0-10), notas, articulación y **Lateralidad** (Izquierda/Derecha).
- **CRUD Completo desde UI**: Los usuarios pueden añadir y **eliminar** registros de dolor erróneos directamente desde el Dashboard interactivo.
- **Bloqueo Clínico (Clinical Lock)**: Si el sistema detecta múltiples registros recientes de dolor severo (>3/10), el Coach activa restricciones automáticas negando ejercicios de impacto.

### 2.3. Rehabilitación Inteligente y Fisioterapia
- **Protocolos en Vuelo**: El Coach consulta un manual dinámico de rehabilitación (`rehab_protocols.md`) según el nivel de dolor reportado:
  - Fase 1 (Dolor > 6): Isométricos y reposo activo.
  - Fase 2 (Dolor 3-5): Fortalecimiento excéntrico (ej. sentadillas búlgaras).
  - Fase 3 (Dolor < 2): Re-entrenamiento al impacto (pliometría leve).
- **Catálogo Multimedia**: La interfaz de Fisioterapia muestra videos tutoriales específicos incrustados directamente para los ejercicios sugeridos por la IA.

### 2.4. Visión Biomecánica SOTA (Análisis de Video)
- **Procesamiento de Video (Gemini 2.0 Pro Vision)**: La plataforma permite subir videos de técnica de carrera o tenis (MP4/MOV).
- **Extracción de Insights**: Analiza la cinemática, extrae la *cadencia visual*, evalúa la *oscilación vertical* y detecta anomalías articulares críticas (ej. *Valgo de rodilla* en el aterrizaje).
- **Feedback Inmediato**: Prescribe ejercicios compensatorios basados en los déficits biomecánicos detectados en el video.

### 2.5. IA y Context Caching SOTA (Rendimiento)
- **Context Caching en Gemini**: Para reducir la latencia (hasta un 80%) y el costo de tokens repetitivos, los manuales largos estáticos (Fisioterapia, Protocolos Master 49+, Rehabilitación) se suben a la caché del servidor de Gemini con un TTL dinámico.
- **Coach Ultra-Veloz**: Al solicitar el análisis del Coach, el sistema ensambla el contexto dinámico (peso de hoy, HRV actual, dolor de las últimas 24h) y lo inyecta junto al identificador de la caché estática, permitiendo inferencias complejas casi en tiempo real con System 2 Reasoning.

### 2.6. Biometría y Corrección del HRV
- **Dashboard Interactivo**: Gráficas de peso, glucosa y carga de entrenamiento que responden fluidamente al comportamiento del usuario (animaciones hover).
- **Atenuación de HRV**: Algoritmo que corrige los picos falsos-positivos de Variabilidad de la Frecuencia Cardíaca (HRV) inducidos artificialmente por los betabloqueantes.

---

## 3. Integraciones Externas
- **Garmin Connect API**: Sincronización continua de actividades y telemetría avanzada.
  - **Métricas de Carrera Nativas**: Soporte para Potencia de carrera, Oscilación Vertical, Tiempo de Contacto con el Suelo (GCT), Longitud de Zancada y Ratio Vertical (vía Forerunner 965 o bandas HRM).
- **Withings API**: Obtención de báscula inteligente (peso, % grasa).

---

## 4. Herramientas de Mantenimiento y Calidad
- **Database Auditor (`audit_db.py`)**: Script especializado para detectar datos de prueba (mocks), valores fuera de rango (outliers fisiológicos) y asegurar la integridad de la base de datos tras migraciones.
- **NotebookLM MCP Agent**: Agente autónomo encargado de mantener la salud de la conexión con la base de conocimiento de Google NotebookLM, incluyendo autodiagnóstico y reinicio de procesos bloqueados.

---
*(Este manual será iterado y expandido con los futuros desarrollos de la plataforma)*
