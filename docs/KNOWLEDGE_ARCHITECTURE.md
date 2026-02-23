# 🧠 Arquitectura de Conocimiento (NotebookLM Registry)

Este documento centraliza la configuración y el propósito de los diversos "cerebros" de NotebookLM integrados en BioEngine V3.

## 📋 Registro de Cuadernos

| Rol del Agente / Skill | Nombre del Cuaderno | Notebook ID | Documento de Origen | Propósito Principal |
| :--- | :--- | :--- | :--- | :--- |
| **Cerebro Maestro** | Base de Conocimiento Maestro | `44746a67-16ce-43bf-9207-f1c53948836d` | [consultar-notebooklm/SKILL.md](file:///c:/BioEngine_V3/agent/skills/consultar-notebooklm/SKILL.md) | Validación técnica/clínica, recuperación de protocolos médicos y ACWR. |
| **El Oráculo** | Master Planning | `1f927884-ec18-45f3-82b3-f1d0415e6904` | [ADAPTIVE_COACH_MISSION.md](file:///c:/BioEngine_V3/docs/architecture/ADAPTIVE_COACH_MISSION.md) | Filosofía de entrenamiento, metodología de carga y planificación adaptativa. |
| **Arquitecto de IA** | Desarrollo Apps IA (Tendencias 2026) | `a9340a6c-2f47-4a9e-8e30-1aaf1fdddc07` | [.agent/skills/ai-architect/SKILL.md](file:///c:/BioEngine_V3/.agent/skills/ai-architect/SKILL.md) | Vigilancia tecnológica, mejores prácticas de ingeniería e innovación SOTA. |
| **Analista Deportivo** | Kpis claves en el deporte | `cb8c8240-bdba-4d18-9597-8d8dca43a673` | [KNOWLEDGE_ARCHITECTURE.md](file:///c:/BioEngine_V3/docs/KNOWLEDGE_ARCHITECTURE.md) | Definición de métricas clave, benchmarks de rendimiento y KPIs clínicos. |

---

## 🛠️ Integración Técnica

### 1. Configuración del Servidor MCP
La conexión se gestiona a través del servidor MCP `notebooklm-mcp`. El archivo de configuración principal es:
- [notebooklm-config.json](file:///c:/BioEngine_V3/notebooklm-config.json)

### 2. Flujo de Contexto (Grounding)
Los agentes utilizan el `NotebookLMBridge` (`backend/services/agents/skills/notebooklm_bridge/bridge_logic.py`) para:
1.  **Consultar:** Enviar queries específicas basadas en el estado del atleta o el sistema.
2.  **Validar:** Contrastar decisiones contra las fuentes de verdad alojadas en los cuadernos.
3.  **Anotar:** Cada respuesta generada incluye la procedencia (citations) para garantizar transparencia clínica.

### 3. Mantenimiento de Conocimiento
- **Actualización:** Una vez al mes, el `AI-Architect` realiza un "Deep Research" para actualizar el cuaderno de Tendencias.
- **Feedback Loop:** Los resultados de las fases de entrenamiento se inyectan como nuevas fuentes para refinar la lógica del Coach.

## 🚀 Plan de Evolución
Para detalles sobre la implementación de la Fase 4 (Hard-Stops, Máquina de Estados y KPIs integrados), consultar:
- [implementation_plan_strategic.md](file:///C:/Users/gonza/.gemini/antigravity/brain/5e761244-97ed-4ee5-9dcd-b57e2296fc07/implementation_plan_strategic.md)

---
*Última auditoría de integridad: 2026-02-09*
