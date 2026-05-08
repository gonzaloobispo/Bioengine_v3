# 🧠 JARVIS_MEMORY - Núcleo de Estado de OpenGravity V4
**Proyecto:** OpenGravity (V4 / F1 - Mobile Platform)
**Estado Actual:** Fase 7 - Habilitación del Bot Coach y Mobile Dashboard.
**Contexto Crítico:** 
- BioEngine V3 (Desktop) es el "Mothership" (SQLite local). No tocar.
- OpenGravity V4 es el "Companion" (Firebase Firestore).
- Sincronización unidireccional V3 -> V4 funcionando para Garmin/Withings.

**Reglas de Oro (Biblioteca Maestra v3.0):**
1. Siempre usa el Protocolo SOTA antes de grandes cambios.
2. Ejecuta QA entre agentes (Loki Mode).
3. Mantener commits semánticos y atómicos.
4. **BioEngine Sync Integrity:** Nunca escribir hacia V3 desde V4. El sync es solo lectura para movilidad.

**Objetivo Inmediato:** Validar el flujo conversacional del Coach en Telegram y conectar el Dashboard Web real.
