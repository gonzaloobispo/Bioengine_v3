# 🚀 OpenGravity V4: El Camino del Orquestador
## Plan Maestro de Desarrollo e Integración de Agentes

Este documento establece la hoja de ruta estratégica para evolucionar OpenGravity hacia un orquestador multi-agente, asíncrono y de hiper-fiabilidad (Arquitectura V4).

---

## 🛡️ Capa de Fiabilidad (El "Gold Standard")
Abandonamos el desarrollo basado en "ensayo y error". Cada acción importante en OpenGravity ahora estará gobernada por:
1. **Deterministic Planner**: Para pre-visualizar resultados y pasos antes de tocar el código.
2. **Pre-Action Guard**: Para prevenir sobreescrituras accidentales durante la refactorización masiva.
3. **Impasse Detector**: Monitoreo en tiempo real del Worker V4 para evitar bucles infinitos.

---

## 📈 Hoja de Ruta y Metas

- [x] **M1.1: Integración de Guard Rails** - Modificar `worker.ts` para que active automáticamente el `pre-action-guard` en llamadas a herramientas sensibles. (COMPLETADO)
- [x] **M1.2: Disyuntor de Bucles** - Integrar el `impasse-detector` como middleware en el ciclo de turnos del worker. (COMPLETADO)
- [x] **M1.3: Verificación Basada en Evidencia** - Imponer el uso de `verification-before-completion` para cada commit o entrega de hito. (COMPLETADO)

- [x] **M2.1: Plano Visual C4** - Usar la habilidad `c4-architecture` para mapear el flujo Worker V4 -> Firestore -> Telegram. (COMPLETADO)
- [x] **M2.2: Refactorización Limpia** - Usar `code-refactoring-clean` para dividir `worker.ts` en manejadores especializados (`CognitionHandler`, `ActionHandler`, `MemoryHandler`). (COMPLETADO)
- [x] **M2.3: Visión Arquitectónica - BioEngine Web** - Definir la integración de OpenGravity como motor cognitivo (Bot) y BioEngine como plataforma Web/Móvil (Dashboard, Data, Feedback). (COMPLETADO)

- [x] **M3.1: Memoria de Experiencia** - Implementar el `MemoryHandler` para extracción asíncrona de aprendizajes y preferencias del usuario. (COMPLETADO)
- [x] **M3.2: Delegación V2** - Implementar el patrón `subagent-driven-development` donde el worker puede spawnear "Sub-agentes Desacoplados" para investigación. (COMPLETADO)
- [x] **M3.3: Ciclo de Revisión Adversarial** - Establecer una fase de "Red Team" usando `adversarial-reviewer` para nuevas funciones complejas. (COMPLETADO)
- [x] **M3.4: Automatización de Postmortem** - Configurar el worker para generar un reporte de auto-análisis (`POSTMORTEM.md`) si un Turno falla críticamente. (COMPLETADO)

### Fase 4: Producción y SRE (Escala Global)
*Objetivo: Despliegue y Observabilidad (Motor OpenGravity).*

- [x] **M4.1: Auditoría Cloud Architect** - Revisar índices de Firestore y estrategias de cold-start con la habilidad `cloud-architect`. (COMPLETADO)
- [x] **M4.2: Telemetría SRE** - Implementar logging estructurado y "Heartbeats de Salud" en el despachador de Telegram. (COMPLETADO)
- [x] **M4.3: Sincronización Remota** - Asegurar que las mejoras en las habilidades se suban a la `CentralSkillsLibrary` vía `sync-library.ps1`. (COMPLETADO)

### Fase 5: Fundación de Conocimiento y Plataforma Web
*Objetivo: Establecer la base de conocimiento de la IA (MCP) y construir el *stack* moderno de la aplicación web responsiva.*

- [x] **M5.1: Capa de Contexto y Conocimiento MCP** - Integración de NotebookLM vía servidor MCP para dotar a OpenGravity AI de RAG conversacional sobre la arquitectura y permitirle asistir en las siguientes fases. (COMPLETADO)
- [x] **M5.2: Scaffold Arquitectura Web PWA** - Crear proyecto base (React + Vite + Tailwind v3) preparado para funcionar como App instalable en celulares. (COMPLETADO)
- [x] **M5.3: Autenticación Roles (Admin/Users)** - Implementar Login futurista multi-tenant (Firebase Auth - Google Sign-In) y UI Glassmorphism. (COMPLETADO)

### Fase 6: Arquitectura de Datos y Sincronización de Entidades
*Objetivo: Diseñar el núcleo de bases de datos que soportará tanto a la Web como al Bot de Telegram, y asegurar que ambos sistemas reconozcan al mismo usuario.*

- [x] **M6.1: Modelo de Datos Universal (BioEngine + Bot)** - Esquema Firestore definido (`UserProfile`, `Routine`, `MetricEntry`, `Exercise`), reglas de seguridad configuradas, TypeScript interfaces en `schema.ts`. (COMPLETADO)
- [x] **M6.2: Mapeo de Identidades (Sincronización Perfil)** - Telegram ID `8067043732` vinculado con Firebase UID `HTJlt5RxMjeJwZX9CHlPTeDzNfi1`. Colección `telegram_mappings` activa. Dashboard muestra UID para auto-vinculación. (COMPLETADO)
- [x] **M6.3: Puentes API Internos** - Worker V4 equipado con herramientas `bioengine_link`, `bioengine_save_metric`, `bioengine_get_profile`. Las funciones `linkTelegramId`, `getUserByTelegramId`, `saveBioMetric` integradas en `db.ts`. (COMPLETADO)

### Fase 7: Plataforma Interactiva y El Bot como Coach
*Objetivo: Construir las interfaces visuales (Web/Mobile) y habilitar los comandos de lenguaje natural del Bot para interactuar con esos datos.*

- [x] **M7.1: Companion App Foundation (Sincronización de Datos V3 a V4)** `C:\APP\OpenGravity`
  - [x] Preservar BioEngine V3 intacto como "Mothership" (Desktop/Python).
  - [x] Desarrollar de Sync Script (Puente Unidireccional V3 SQLite a V4 Firestore).
  - [x] Sincronizar exitosamente datos de Garmin (Activities), Withings (Biometrics), Daily Health y Pain Logs hacia Firebase.
- [ ] **M7.2: Intermediario Cognitivo (El Bot Coach)** `C:\APP\OpenGravity`
  - [x] Entrenar el prompt del Worker para usar las herramientas BioEngine en lenguaje natural.
  - [x] Equipar al bot con `bioengine_get_metrics`, `bioengine_get_activities`, `bioengine_get_daily_health` y `bioengine_save_pain`.
  - [ ] Validar flujos conversacionales de consulta de estado ("Resume mis últimos entrenamientos y mi último peso").
  - [x] Habilitar comando de registro de métricas subjetivas ("Fatiga 8", "Rodilla duele 4/10").
  - [ ] Implementar comando de creación de rutina ("Hazme una rutina de piernas").
- [ ] **M7.3: Mobile Dashboard (React V4)** `C:\APP\OpenGravity`
  - [ ] Reemplazar datos estáticos del V4 Dashboard Mobile con las lecturas reales inyectadas en Firestore.
  - [ ] Crear vista de "Mis Rutinas" (Mobile).
  - [ ] Crear formulario de registro rápido de métricas (Mobile).

### Fase 7.4: Estabilización de Planes en Producción (Web + Functions)
*Objetivo: Asegurar generación de planes robusta, reglas deportivas duras y actualización correcta en UI.*

- [x] **M7.4.1: Navegación de Planes en Dashboard Web** - Se agregó entrada `Planes` en sidebar desktop para paridad con mobile. (COMPLETADO)
- [x] **M7.4.2: Headers de Autenticación en Planes** - `PlansView` usa `getAuthHeaders()` para `generate/evaluate` evitando 401/403 por requests sin token. (COMPLETADO)
- [x] **M7.4.3: Fecha de Inicio Segura** - Backend fuerza `start_date >= hoy` para evitar planes en fechas pasadas por desfases de cliente/UTC. (COMPLETADO)
- [x] **M7.4.4: Unicidad de Plan Activo** - Antes de crear plan nuevo, se cierran planes `active` previos para evitar que UI muestre un plan histórico como activo. (COMPLETADO)
- [x] **M7.4.5: Reglas Duras de Estructura** - Validación de 14 días consecutivos, ciclismo solo sábado/domingo (ambos), y fuerza mínima en semana. (COMPLETADO)
- [x] **M7.4.6: Fallback Determinístico Anti-LLM** - Si Gemini devuelve JSON truncado/inválido, se genera plan válido por fallback determinístico para evitar error al usuario. (COMPLETADO)
- [x] **M7.4.7: Timeout/Recursos de Función** - `opengravity` subido a `180s` y `1GiB` para evitar 502 por timeout en generación. (COMPLETADO)
- [x] **M7.4.8: Mensajería de Versión UI** - Pantalla de carga actualizada a "BioEngine V4" y desplegada en hosting. (COMPLETADO)

### Fase 7.5: Pendientes Operativos Inmediatos
*Objetivo: Cerrar deuda técnica funcional detectada en operación real.*

- [ ] **M7.5.1: Trazabilidad de Generación** - Persistir `generation_mode` (`llm` vs `fallback`) y `validation_reason` en el doc de plan para diagnóstico rápido.
- [ ] **M7.5.2: Saneamiento de Warnings de UI** - Corregir warning de gráficos `width(-1)/height(-1)` en vistas con charts.
- [ ] **M7.5.3: Endpoint Settings/Auth** - Revisar 401 intermitente en `/api-cloud/settings` y consolidar renovación de token.
- [ ] **M7.5.4: Validación Conversacional M7.2** - Ejecutar prueba E2E real vía Telegram de comandos de resumen y registro subjetivo.

---

## 🚦 Protocolo de Ejecución

1. **Planificación**: Para cada Milestone, se debe crear un `PLAN.json` temporal (apoyado ahora por el contexto de MCP).
2. **Validación**: Ningún hito se marca como `[x]` sin pasar las pruebas de `verification-before-completion`.
3. **Aprendizaje**: Todo fallo crítico debe generar un `failure-postmortem`.

---

## 📅 Próximo Paso Inmediato
- Iniciar **M7.5.1 (Trazabilidad de Generación)** para distinguir claramente cuándo el plan fue creado por LLM o por fallback determinístico, y con qué motivo de reparación.
