@echo off
setlocal
echo ==========================================
echo   AGENTE NOTEBOOKLM - SYNC DASHBOARD
echo ==========================================
echo [*] Conectando con NotebookLM...

cd /d "c:\APP\Notebook"

:: Ejecutar mantenimiento y sincronización completa
python -m agente_notebooklm_mcp.agent_logic

if %errorlevel% neq 0 (
    echo [X] Error en la sincronizacion. Revisa la conexion a Internet.
) else (
    echo.
    echo ✅ DATOS REALES SINCRONIZADOS CON EL DASHBOARD.
    echo [i] Ya puedes abrir tu Dashboard para ver los cambios.
)

pause
