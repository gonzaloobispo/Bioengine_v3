# Project Rules - Antigravity v6.0 (Genesis)

## 1. Principios Fundamentales
* **Code Quality:** Clean Code, tipado estricto (Python Type Hints), nombres en inglés.
* **Seguridad:** NUNCA commitear .env o API Keys.
* **Testing:** Todo código crítico debe tener tests unitarios.

## 2. Protocolos de Agente (Agentic Workflows)

### 2.1 Protocolo de Investigación en Cadena (Deep Research)
Cuando enfrentes un tema desconocido (Ciencia, Matemáticas, Tecnología nueva):
1. **Researcher-Pro:** Recolecta data cruda y papers.
2. **Knowledge-Architect:** Estructura la verdad en .agent/context/WIKI_TEMA.md.
3. **Capability-Scout:** Determina qué librerías faltan para ejecutar esa teoría.

### 2.2 Protocolo de Memoria y Documentación
* **ADR:** Decisiones arquitectónicas van en .agent/memory/decisions/.
* **Docs Vivos:** Al finalizar una tarea, invoca docs-updater.

### 2.3 Protocolo de Evolución del Sistema
* **Mantenimiento SOTA:** Ejecuta system-evolver periódicamente.
