# MISIÓN: Actualización de Arquitectura BioEngine V3 a Estándar SOTA 2026

**ROL:** Actúas como el Arquitecto Principal de Soluciones de IA y Especialista en Biomecánica Deportiva.

**CONTEXTO DEL PROYECTO:**
BioEngine V3 es un ecosistema agéntico para la salud articular y el rendimiento en Triatlón y Tenis. Actualmente opera sobre una arquitectura heredada (Gemini 2.0/OpenAI 2025) que presenta riesgos de obsolescencia técnica y alucinaciones clínicas.

**OBJETIVO:**
Analizar la base de código actual y diseñar un plan de migración técnica estricto hacia **Gemini 3 Pro (Preview)** y APIs de 2026, priorizando la precisión médica y el análisis de video nativo.

**INSTRUCCIONES DE EJECUCIÓN:**

1.  **AUDITORÍA DE "CEREBRO" (HLE & VPCT):**
    * Diseña la sustitución de los endpoints de chat actuales por la API de **Gemini 3 Pro**.
    * *Justificación Técnica:* Debemos capitalizar su puntuación #1 en el benchmark médico "Humanity's Last Exam" (HLE) para reducir riesgos en consejos de fisioterapia, y su capacidad de "Visión Nativa" para análisis de técnica deportiva sin OCR.

2.  **INGENIERÍA DE DATOS (PYDANTIC STRICT):**
    * Genera una estructura de validación usando **PydanticAI**.
    * El objetivo es que la IA nunca devuelva texto libre para métricas de salud, sino objetos JSON tipados (ej: `class KneeValgusRisk(BaseModel)`). Esto es crítico para la seguridad del usuario.

3.  **PIPELINE DE VIDEO (BIOMECÁNICA):**
    * Propón una implementación de código para el módulo "Gait Analysis" (Running) y "Serve Mechanics" (Tenis).
    * El sistema debe ingerir video directo (no frames separados) aprovechando la ventana de contexto de 1M tokens de Gemini 3 Pro.

4.  **GESTIÓN DE CONOCIMIENTO (CONTEXT CACHING):**
    * Diseña una estrategia para cargar nuestra biblioteca de PDFs de fisioterapia usando **Context Caching** de Google para reducir latencia y costos, eliminando la necesidad de una base de datos vectorial compleja (RAG) si es posible.

**ENTREGABLES REQUERIDOS (Generar como Artefactos):**

A.  **`MIGRATION_PLAN.md`**: Una lista paso a paso de los archivos que debo modificar, las librerías que debo actualizar en `requirements.txt` o `package.json`, y los nuevos endpoints de API a configurar.
B.  **`schemas_biomecanica.py`**: Un borrador de código en Python con los modelos Pydantic para validar: 1) Análisis de pisada en running y 2) Detección de fatiga en tenis.

**ANÁLISIS INICIADO.**
