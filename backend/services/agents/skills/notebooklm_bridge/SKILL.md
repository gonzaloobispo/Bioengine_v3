---
name: notebooklm-bridge
description: Habilidad para realizar "Grounded Reasoning" consultando los manuales maestros y protocolos clínicos de BioEngine.
---

# Skill: NotebookLM Bridge

Esta habilidad permite a los agentes de BioEngine realizar consultas semánticas a la base de conocimiento estructurada para validar decisiones y citar fuentes oficiales.

## Triggers Semánticos
- Consultas sobre protocolos de lesiones.
- Dudas sobre fisiología de atletas master (49+).
- Validación de estrategias de adherencia y psicología.
- Definición de estándares de la app BioConnect.

## Flujo de Ejecución
1. **Identificación de Intención:** El agente detecta la necesidad de validación clínica.
2. **Búsqueda Semántica:** Se consulta el servidor MCP de Contexto para recuperar fragmentos de los manuales.
3. **Anclaje (Grounding):** El agente integra las citas en su respuesta System 2.

## Referencias Clave
- [Manual Master 49+](file:///c:/BioEngine_V3/BioEngine_V3_Contexto_Base/manual_master_49.md)
- [Estrategia BioConnect](file:///c:/BioEngine_V3/BioEngine_V3_Contexto_Base/bioconnect_ios_spec.md)
