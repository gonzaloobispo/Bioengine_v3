---
description: mantenimiento y actualización de la conexión NotebookLM MCP
---

# Flujo de Trabajo: Agente NotebookLM MCP

Este flujo activa al agente para realizar una revisión completa del sistema.

1. **Analizar Internet**: El agente busca si hay cambios en la arquitectura MCP de Google.
2. **Actualizar**: Si existe una versión superior a la 0.1.15, se instala.
3. **Probar Conexión**: Se realiza un test headless al cuaderno principal.
4. **Reparar**: Si el test falla, se limpian los procesos de Chrome y se reintenta.
5. **Registrar**: Se guarda el log cifrado en `login_records.enc`.

// turbo
Comando de ejecución:
`python -m agente_notebooklm_mcp.agent_logic`
