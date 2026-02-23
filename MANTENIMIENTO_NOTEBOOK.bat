@echo off
setlocal
echo ==========================================
echo   AGENTE NOTEBOOKLM MCP - MANTENIMIENTO
echo ==========================================
echo [*] Iniciando ciclo de salud...

cd /d "c:\APP\Notebook"

:: Ejecutar la lógica del agente
python -m agente_notebooklm_mcp.agent_logic

if %errorlevel% neq 0 (
    echo [X] El mantenimiento fallo. Por favor revisa los logs en la carpeta agente_notebooklm_mcp.
) else (
    echo [OK] Sistema NotebookLM MCP operativo y seguro.
)

pause
