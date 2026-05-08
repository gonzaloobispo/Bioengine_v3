# 🤖 Mapa de Agentes y Skills: OpenGravity V3.0

Este documento detalla la fuerza laboral digital integrada en el proyecto OpenGravity. Define cada capacidad, su utilidad específica y cómo contribuye a llevar el proyecto al siguiente nivel de optimización.

---

## 🤵 Agente Principal: OpenGravity (Orquestador)

**Definición:** El cerebro central basado en Gemini 2.1 Flash, diseñado bajo la filosofía "Agent-First" de la Guía Maestra v3.0.  
**Utilidad:** Gestiona el ciclo de vida de las solicitudes del usuario, decide qué herramientas usar y coordina a los sub-agentes.  
**Optimización:** Al delegar tareas a skills especializadas, reduce la alucinación y maximiza la precisión en la ejecución de comandos de Google Workspace y desarrollo de código.

---

## 🛠️ Skills de Gestión de Workspace

### 1. Gmail Manager (`gmail_manager`)
- **Definición:** Interfaz experta para el manejo de correos electrónicos vía `gog` CLI.
- **Utilidad:** Buscar, leer, archivar y organizar la bandeja de entrada según prioridades.
- **Optimización:** Transforma la gestión de emails en una conversación fluida, permitiendo acciones masivas (batch) sin intervención manual.

### 2. Calendar Manager (`calendar_manager`)
- **Definición:** Controlador de eventos y recordatorios de Google Calendar.
- **Utilidad:** Gestiona la agenda diaria, detecta conflictos de horario y crea eventos usando lenguaje natural.
- **Optimización:** Sincronización perfecta con el huso horario local (`GOG_TIMEZONE`), asegurando que nunca se pierdan compromisos importantes.

### 3. NotebookLM Sidecar (`notebooklm-sidecar`)
- **Definición:** Puente estable (Arquitectura Bridge-Sidecar v2) para interactuar con los cuadernos inteligentes de Google.
- **Utilidad:** Consulta conocimientos profundos y fuentes de investigación que la IA estándar no tiene.
- **Optimización:** Supera las limitaciones de sesión en la nube al permitir que el bot actúe como cliente de un navegador local estable en tu PC.

---

## 🔬 Skills de Inteligencia y Evolución

### 4. Researcher Pro (`researcher-pro`)
- **Definición:** Investigador del Estado del Arte (SOTA).
- **Utilidad:** Valida que las soluciones propuestas no estén obsoletas y busca las mejores librerías de 2026.
- **Optimización:** Evita la deuda técnica temprana al asegurar que cada funcionalidad use la tecnología más eficiente y segura disponible.

### 5. Agent Evolution (`agent-evolution`)
- **Definición:** Mecanismo de automejora del sistema.
- **Utilidad:** Detecta fallos recurrentes y propone nuevas herramientas o cambios en la arquitectura.
- **Optimización:** El proyecto no es estático; el bot "aprende" a detectar sus propias limitaciones y sugiere cómo expandirlas.

### 6. Data Matcher (`data-matcher`)
- **Definición:** Especialista en normalización y limpieza de datos (Fuzzy Matching).
- **Utilidad:** Evita duplicados en la memoria a largo plazo y normaliza nombres de contactos/eventos.
- **Optimización:** Mantiene la base de datos limpia y coherente, facilitando búsquedas precisas en el futuro.

---

## 🎭 Skills de Orquestación (Loki Mode)

### 7. Dispatching Parallel Agents (`dispatching-parallel-agents`)
- **Definición:** Motor de ejecución paralela para tareas múltiples.
- **Utilidad:** Divide un requerimiento complejo en partes independientes (ej: Frontend y Backend) para trabajarlas simultáneamente.
- **Optimización:** Reduce drásticamente el tiempo de desarrollo y la probabilidad de errores al separar preocupaciones (Separation of Concerns).

### 8. Subagent Driven Development (`subagent-driven-development`)
- **Definición:** Capacidad de crear y supervisar sub-instancias de IA para tareas específicas.
- **Utilidad:** Un sub-agente puede estar investigando mientras el principal escribe código.
- **Optimización:** Aprovecha al máximo la capacidad multi-proceso de la IA, permitiendo que OpenGravity actúe como un equipo completo de ingenieros.

---

---

## 🛠️ Skills de Desarrollo y Calidad Técnica

### 9. Test Driven Development (`test-driven-development`)
- **Definición:** Ciclo de desarrollo "Falla primero, arregla después".
- **Utilidad:** Forza la creación de pruebas antes que el código funcional.
- **Optimización:** Garantiza que cada nueva funcionalidad sea robusta y no rompa nada de lo anterior.

### 10. Systematic Debugging (`systematic-debugging`)
- **Definición:** Protocolo de diagnóstico paso a paso para errores complejos.
- **Utilidad:** Identifica la raíz de un bug sin adivinar, analizando logs y estado del sistema.
- **Optimización:** Reduce el tiempo de inactividad del bot y previene arreglos superficiales.

### 11. Verification Before Completion (`verification-before-completion`)
- **Definición:** Control de calidad final obligatorio.
- **Utilidad:** Ejecuta pruebas de integración y compilación antes de entregar el trabajo.
- **Optimización:** Asegura que nada sea reportado como "listo" si realmente no funciona al 100%.

### 12. Using Git Worktrees (`using-git-worktrees`)
- **Definición:** Gestión de múltiples contextos de trabajo en Git.
- **Utilidad:** Permite trabajar en una nueva característica sin ensuciar la rama principal.
- **Optimización:** Mantiene el código limpio y organizado, permitiendo cambios rápidos de contexto.

---

## 🧠 Skills de Planificación y Concepto

### 13. AI Architect (`ai-architect`)
- **Definición:** Ingeniero y Arquitecto Jefe del proyecto.
- **Utilidad:** Dirige las decisiones técnicas, arquitecturas modulares y adopción de SOTA.
- **Optimización:** Previene la formación de monolitos y deuda técnica a gran escala.

### 14. Brainstorming (`brainstorming`)
- **Definición:** Generador de ideas y refinamiento de requerimientos.
- **Utilidad:** Explora posibilidades antes de que el usuario se decida por una implementación.
- **Optimización:** Mejora el diseño de las funciones asegurando que resuelvan el problema real del usuario.

### 15. Writing & Executing Plans (`writing-plans` / `executing-plans`)
- **Definición:** El dúo de arquitectura y construcción.
- **Utilidad:** Uno diseña el paso a paso detallado y el otro lo sigue con precisión.
- **Optimización:** Evita que el agente se pierda en tareas largas, manteniendo un rumbo claro.

### 16. Writing Skills (`writing-skills`)
- **Definición:** Capacidad de autorreplicación y expansión.
- **Utilidad:** Permite al agente crear nuevas habilidades (como hice con las de hoy).
- **Optimización:** Hace que el bot sea una herramienta que crece sola con el tiempo.

---

## ⚡ Skills de Infraestructura y Review

### 17. Using Superpowers (`using-superpowers`)
- **Definición:** Punto de entrada y gestión de todas las habilidades.
- **Utilidad:** Es la que decide qué motor usar para cada situación.

### 18. Finishing a Development Branch (`finishing-a-development-branch`)
- **Definición:** Cierre limpio de ciclos de desarrollo.
- **Utilidad:** Gestiona merges, limpiezas de archivos temporales y notificaciones.
- **Optimización:** Mantiene el repositorio profesional y sin "basura" técnica.

### 19. Code Review (`requesting-code-review` / `receiving-code-review`)
- **Definición:** Ciclo de retroalimentación técnica.
- **Utilidad:** El agente pide y recibe críticas constructivas sobre su código.
- **Optimización:** Mejora la legibilidad y mantenibilidad del software.

### 20. Knowledge Architect (`knowledge-architect`)
- **Definición:** Organizador de la base de conocimientos y sintetizador del Sidecar.
- **Utilidad:** Estructura documentos y destila información pesada (`WIKI_[TEMA].md`).
- **Optimización:** Mantiene un "caché permanente" local para evitar re-investigaciones costosas.

### 21. Docs Updater (`docs-updater`)
- **Definición:** Mantenedor automático de documentación.
- **Utilidad:** Sincroniza el código con `README.md` y `AGENTS_AND_SKILLS.md` tras hacer cambios grandes.
- **Optimización:** Elimina el abandono de la documentación, haciéndola autogestionada.

---

## 🏎️ Skills de Escudería V4 (F1 Edition)

### 22. Cloud & Firebase Architect (`cloud-architect`)
- **Definición:** Especialista en Google Cloud Platform, Firebase y Firestore.
- **Utilidad:** Resuelve cold starts, diseña índices y maneja cargas pesadas.
- **Optimización:** Garantiza que la latencia no sea un cuello de botella durante el Loki Mode.

### 23. Security & Privacy Auditor (`security-auditor`)
- **Definición:** CISO centrado en LLMs y exposición de datos.
- **Utilidad:** Previene Prompt Injection y valida aislamiento estricto de contexto.
- **Optimización:** Asegura que el acceso de los agentes a Gmail/Calendar no tenga vulnerabilidades.

### 24. Conversational UX Designer (`telegram-ux-designer`)
- **Definición:** Experto en interacción humano-máquina vía Telegram.
- **Utilidad:** Diseña flujos con botones, teclados en línea y Markdown enriquecido.
- **Optimización:** Transforma una consola de texto en una "SuperApp" nativa conversacional.

### 25. Site Reliability Engineer (`sre-agent`)
- **Definición:** Encargado de la observabilidad y telemetría (SRE).
- **Utilidad:** Implementa logging estructurado y tracing asíncrono.
- **Optimización:** Permite depurar errores en producción ("Loki Mode") sin volverse ciego ante fallos silenciosos.

### 26. Live Debugger (`live-debugger`)
- **Definición:** Especialista en Escaneo y Reparación en Tiempo Real.
- **Utilidad:** Actúa como escáner monitoreando los resultados y errores mientras el usuario prueba la app. Propone y aplica parches en vivo.
- **Optimización:** Acelera el ciclo de pruebas manuales y automáticas (Fase 4), reparando fallos sin requerir contexto estructurado previo.
### 27. Product Tailor (`product-tailor`)
- **Definición:** Especialista en UX, empatía y diseño de producto (El Sastre).
- **Utilidad:** Entiende las necesidades ambiguas del usuario y diseña flujos a medida antes de programar.
- **Optimización:** Asegura que las funciones desarrolladas realmente aporten valor y encajen en la vida del usuario (ej. interacción correcta con Bioengine).

### 28. Tech Radar (`tech-radar`)
- **Definición:** Agente de I+D Proactivo.
- **Utilidad:** Investiga tendencias SOTA, diseña planes de actualización autónomos y alerta al usuario.
- **Optimización:** Mantiene al ecosistema OpenGravity permanentemente actualizado. Genera archivos `.ag_update.md` listos para ejecución.

---

## 📈 Resumen de Optimización Máxima

Para maximizar el rendimiento del proyecto, OpenGravity utiliza estos componentes de la siguiente manera:

1.  **Reducción de Latencia Cognitiva:** Al usar Skills, el bot no "piensa" cómo hacer algo, simplemente "lo hace" siguiendo el protocolo probado.
2.  **Blindaje de Datos:** La combinación de `verification-before-completion` y `systematic-debugging` asegura que el código sea de calidad industrial.
3.  **Ubicuidad:** Gracias al despliegue en Firebase sustentado por la arquitectura Sidecar, el asistente está disponible 24/7 con acceso a tu conocimiento local más privado (NotebookLM).

**Estado Actual:** Sistema Operativo Agéntico V3.0 — Activo y en evolución constante.
