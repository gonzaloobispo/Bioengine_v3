
# 🧠 Base de Conocimiento - Agente NotebookLM MCP

Este documento contiene la información técnica crítica extraída de la investigación en el cuaderno `80b773c1-e174-4ee4-92d9-246dffe5e848` para solucionar la conexión desde cualquier proyecto.

## 🛠️ Arquitectura de Solución: Bridge-Sidecar
Para evitar bloqueos y fallos de sesión, se utiliza una arquitectura dividida:
1. **Sidecar (Motor de Navegación)**: Servidor FastAPI + Selenium (undetected-chromedriver) que mantiene una sesión de Chrome abierta.
2. **Bridge (Puente MCP)**: Script ligero que Antigravity llama y que se comunica vía HTTP con el Sidecar.

## 🔍 Selectores CSS Actualizados (2026)
*   **Chat Input**: `textarea.query-box-input`
*   **Botón Enviar**: `//button[descendant::mat-icon[text()='arrow_forward']]` (XPath)
*   **Respuesta IA**: `.model-response-text` o `.chat-panel-content .response-block`

## ⚠️ Problemas Comunes y Soluciones
| Problema | Causa | Solución |
| :--- | :--- | :--- |
| **JSON-RPC Error** | Logs en stdout | Redirigir logs a un archivo o usar el Bridge. |
| **New Tab / Error 404** | Navegación fallida | El Sidecar fuerza `driver.get(url)` si el ID no está en la URL. |
| **Session Expired** | Google Logout | El Sidecar corre con el perfil `chrome_profile_notebooklm`. Login manual en esa ventana. |
| **Port 8000 Conflict** | Otro servicio | Cambiar puerto en `sidecar_server.py` y `mcp_bridge.py`. |

## 🚀 Cómo Restaurar en un Nuevo Proyecto
1. Copiar la carpeta `agente_notebooklm_mcp` al nuevo proyecto.
2. Asegurar que `START_SIDECAR.bat` apunta a la ruta absoluta del script.
3. Actualizar `claude_desktop_config.json` para que llame al `mcp_bridge.py` del nuevo directorio.
4. Ejecutar `/agente-notebooklm-mcp` para auto-reparar.
