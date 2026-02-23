@echo off
setlocal
title AGENTE NOTEBOOKLM - MASTER CONTROL

:: Simple colors using the COLOR command (Windows Native)
:: 0 = Black, 7 = White, 9 = Light Blue, A = Green, E = Yellow, C = Red
color 07

echo.
echo ================================================================
echo           AGENTE NOTEBOOKLM MCP - CONTROL MAESTRO         
echo ================================================================
echo.

:: 1. Verificación de Entorno y Actualizaciones
echo [+] [1/3] VERIFICANDO ACTUALIZACIONES...
python -m pip install --upgrade notebooklm-mcp-server --quiet
if errorlevel 1 (
    echo [!] Advertencia: No se pudo verificar actualizaciones.
) else (
    echo [OK] Servidor MCP al dia.
)
echo.

:: 2. Test y Reparación de Conexión
echo [+] [2/3] VALIDANDO CONEXION Y SEGURIDAD...
:: Ejecutamos el agente
python -m agente_notebooklm_mcp.agent_logic
set RES_LOGIC=%errorlevel%

if not "%RES_LOGIC%"=="0" (
    color 0C
    echo.
    echo [X] ERROR CRITICO DE CONEXION:
    echo El Agente no pudo establecer una sesion segura con NotebookLM.
    echo [SUGERENCIA] Ejecuta 'notebooklm-mcp-auth' para renovar tu sesion.
    goto END_BLOCK
)

color 0A
echo [OK] Conexion validada y logs cifrados correctamente.
echo.

:: 3. Sincronización de Datos Reales
echo [+] [3/3] ACTUALIZANDO CUADERNOS EN EL DASHBOARD...
python -c "from agente_notebooklm_mcp.sync_dashboard import update_dashboard_data; update_dashboard_data()"
if errorlevel 1 (
    color 0E
    echo [!] Error al sincronizar datos con el Dashboard.
) else (
    echo [OK] Dashboard actualizado con datos reales.
)
echo.

:END_BLOCK
echo ================================================================
if "%RES_LOGIC%"=="0" (
    echo          ESTADO FINAL: TODO OPERATIVO (SUCCESS)          
) else (
    echo          ESTADO FINAL: ERROR EN EL PROCESO (FAILED)        
)
echo ================================================================
echo.
echo El Agente NotebookLM ha terminado su tarea.
pause
exit /b %RES_LOGIC%
