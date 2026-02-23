
# Agente NotebookLM MCP 🤖

Este agente es el responsable de la salud, seguridad y actualización de la conexión entre tus aplicaciones y Google NotebookLM.

## Capacidades:
1.  **Vigilancia de Versiones**: Busca y actualiza automáticamente el servidor MCP a la última versión disponible.
2.  **Autodiagnóstico y Reparación**: Prueba la conexión y limpia procesos bloqueados si detecta fallos.
3.  **Seguridad Cifrada**: Mantiene un registro de todos los intentos de login y estados de conexión cifrados con Fernet (AES-128).
4.  **Soporte Multi-App**: Diseñado para servir como base de datos o motor de IA para cualquier desarrollo externo (como tu Dashboard).

## Estructura del Agente:
- `agent_logic.py`: Orquestador principal.
- `encryption_utils.py`: Gestión de seguridad y cifrado.
- `connection_tester.py`: Motor de pruebas y corrección.

## Cómo ejecutar mantenimiento manually:
Ejecuta: `python -m agente_notebooklm_mcp.agent_logic` desde la raíz.

---
*Desarrollado por Antigravity para optimizar el ecosistema BioEngine.*
