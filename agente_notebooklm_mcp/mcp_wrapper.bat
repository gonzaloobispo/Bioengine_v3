@echo off
setlocal

:: CONFIGURACIÓN: Ajusta estas rutas si es necesario
set "EXECUTABLE=C:\Users\gonza\AppData\Roaming\Python\Python313\Scripts\notebooklm-mcp.exe"
set "LOG_FILE=c:\APP\Notebook\agente_notebooklm_mcp\mcp_errors.log"

:: Ejecuta el servidor MCP
:: El '2>>' redirige el flujo de errores (stderr) al archivo log para mantener STDIO (canal JSON) limpio.
"%EXECUTABLE%" server %* 2>>"%LOG_FILE%"
