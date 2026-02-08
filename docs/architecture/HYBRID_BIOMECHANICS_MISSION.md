# MISIÓN DE ARQUITECTURA: BioEngine V3 - Pipeline Híbrido de Biomecánica & Salud
**ROL:** Arquitecto de Software Deportivo y Especialista en Visión por Computadora.

**CONTEXTO CRÍTICO (Actualización Feb 2026):**
Hemos descartado el análisis de video puramente generativo por falta de precisión temporal (sampling rate).
Vamos a implementar una **Arquitectura de Dos Etapas** para garantizar que detectamos patologías rápidas (running gait / saque de tenis) sin perder cuadros, manteniendo a Gemini 3 Pro como el "Cerebro Clínico".

**OBJETIVOS TÉCNICOS:**

1.  **CAPA DE VISIÓN (LOS "OJOS"): Implementación de MediaPipe BlazePose**
    * Diseña un script en Python que utilice **Google MediaPipe** (o MoveNet Thunder) para procesar los videos subidos por el usuario localmente o en el servidor.
    * **Extracción de Métricas:** El script debe generar un JSON temporal (`motion_data.json`) que contenga:
        * Ángulos de rodilla (Flexión/Valgo) frame a frame.
        * Cadencia (pasos por minuto).
        * Tiempo de contacto con el suelo (GCT).
    * *Justificación:* Esto nos da datos a 30/60 FPS que un LLM nativo perdería.

2.  **CAPA DE RAZONAMIENTO (EL "CEREBRO"): Integración Gemini 3 Pro (API)**
    * Configura el cliente de API para enviar a **Gemini 3 Pro** un prompt híbrido que incluya:
        * El resumen estadístico del JSON de MediaPipe (ej: "Ángulo máximo de valgo: 18°").
        * El perfil del usuario (Edad: 50, Pie plano, Dolor rodilla > 3).
        * Contexto médico recuperado (reglas de fisioterapia).
    * **Misión del LLM:** No es "ver" el video pixel por pixel, sino interpretar si los datos numéricos de MediaPipe representan un riesgo de lesión para *este* usuario específico.

3.  **VALIDACIÓN CLÍNICA & SEGURIDAD:**
    * Utiliza **Pydantic** para estructurar la salida de Gemini.
    * Define una clase `RiskAssessment` que obligue a clasificar el riesgo en: `BAJO`, `MODERADO` (revisar técnica), o `ALTO` (detener actividad).
    * *Safety Check:* Si MediaPipe detecta asimetría >15% entre pierna izquierda/derecha, disparar alerta automática independientemente de lo que diga el LLM.

4.  **ESTRATEGIA DE COSTOS (API):**
    * Prioriza el uso del **Tier Gratuito** de Google AI Studio para el desarrollo.
    * El procesamiento de video con MediaPipe es gratuito (open source), lo que reduce drásticamente el consumo de tokens comparado con subir video crudo al LLM.

**ENTREGABLES REQUERIDOS (Artefactos de Código):**

A.  **`biomechanics_pipeline.py`**: Código Python que ingesta un video `.mp4`, corre MediaPipe, extrae los ángulos clave de la rodilla derecha y formatea el payload para la API de Gemini.
B.  **`clinical_prompt_template.txt`**: El prompt del sistema que se enviará a Gemini, instruyéndole cómo actuar como fisioterapeuta basándose en los datos numéricos de los sensores de visión.

**ESTADO: INICIADO.**
