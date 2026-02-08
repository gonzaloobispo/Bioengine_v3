# MISIÓN DE ARQUITECTURA: BioEngine Adaptive Coach & Knowledge Bridge
**ROL:** Arquitecto de Sistemas de IA y Científico Deportivo Senior.

**CONTEXTO DEL SISTEMA:**
Estoy construyendo "BioEngine V3".
1.  **El Oráculo (NotebookLM):** Tengo un cuaderno en NotebookLM que contiene mi filosofía de entrenamiento, metodología de carga, y protocolos de recuperación. Este conocimiento está vinculado a ti (Antigravity), pero la App móvil NO tiene acceso directo a él.
2.  **El Paciente/Atleta:** Varón, 50 años, 1.76m, 76kg. Historial de pie plano y pronación severa con dolor recurrente en rodilla derecha. Realiza Running (Trail/Calle) y Tenis.
3.  **La Realidad (Inputs):** La app recolecta actividades (JSON de Garmin), registros de peso diario y una escala de dolor subjetivo (0-10) de la rodilla.

**OBJETIVO PRINCIPAL:**
Diseñar y codificar el **"Motor de Planificación Adaptativa"**. Este motor debe vivir en el backend, consultar la lógica del NotebookLM, analizar mis datos recientes y generar o modificar el plan de entrenamiento (JSON) que la App consumirá.

**REGLAS DE NEGOCIO Y LÓGICA AGÉNTICA:**

1.  **EL ANALISTA DE ESTADO (The Triage Agent):**
    * Analiza las actividades de los últimos 7 días (Carga Aguda) vs. los últimos 28 días (Carga Crónica).
    * Cruza la **Curva de Peso** con el **Rendimiento**: Si el peso sube >2% y el dolor de rodilla >4/10, debe marcar una alerta de "Riesgo de Impacto".
    * **Lógica de Rodilla:** Si el dolor de rodilla es >3, el agente debe prohibir sesiones de intervalos de alta intensidad en pavimento y sugerir elíptica, natación o descanso, basándose en los protocolos de rehabilitación del NotebookLM.

2.  **EL GENERADOR DE PLANES (The Planner):**
    * **Consulta al Oráculo:** Extrae del contexto de NotebookLM la estructura del mesociclo actual.
    * **Verificación de Cumplimiento:** Antes de generar la semana siguiente, mira lo que hice ayer.
        * *Escenario A (Cumplido):* Procede con la progresión lineal del Notebook.
        * *Escenario B (Fallado/No realizado):* No acumules la carga perdida. Recalcula el resto de la semana para redistribuir el volumen sin exceder el 10% de incremento semanal seguro.
        * *Escenario C (Lesión/Dolor):* Si el input de dolor es alto, cambia el plan de "Desarrollo" a "Mantenimiento/Rehabilitación" automáticamente.

3.  **SALIDA ESTRUCTURADA (Interacción con la App):**
    * La salida no puede ser texto libre. Debe ser un objeto JSON validado por Pydantic que la app pueda renderizar (ej: tarjetas de entrenamiento).
    * Debe incluir un campo `"coach_rationale"`: Una explicación breve en lenguaje natural (Español) de POR QUÉ se hizo ese cambio (ej: *"He notado que tu peso subió 1kg y reportaste dolor nivel 5, así que cambié los 10k de hoy por 45min de bici suave para proteger la articulación"*).

**ENTREGABLES REQUERIDOS (Generar Código):**

A.  **`coach_logic.py`**: El script principal de Python. Debe incluir la clase `AdaptiveCoach` con métodos:
    * `analyze_status(weight_log, knee_pain, activities)`
    * `consult_notebook_methodology()` (Simula la recuperación de reglas del NotebookLM)
    * `generate_adaptive_plan(current_status, previous_plan)`

B.  **`training_schema.py`**: Modelos Pydantic para el Plan de Entrenamiento. Debe manejar tipos de sesión (Running, Tenis, Fuerza, Descanso) y métricas objetivo (Zona FC, Ritmo).

**ESTADO: INICIADO.**
