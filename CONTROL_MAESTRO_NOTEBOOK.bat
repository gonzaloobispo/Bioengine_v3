@echo off
setlocal
title AGENTE NOTEBOOKLM - CONTROL MAESTRO (BRIGDE VERSION)

color 07
echo.
echo ================================================================
echo           AGENTE NOTEBOOKLM MCP - CONTROL MAESTRO v2
echo ================================================================
echo.

:: 1. Verificación de Servidor Sidecar
echo [+] [1/3] VERIFICANDO MOTOR DE NAVEGACION (SIDECAR)...
curl -s http://127.0.0.1:8000/health > nul
if errorlevel 1 (
    color 0C
    echo [X] ERROR: El servidor Sidecar NO esta corriendo.
    echo [!] Por favor, ejecuta 'START_SIDECAR.bat' antes de continuar.
    echo.
    pause
    exit /b 1
)
echo [OK] Motor Sidecar detectado y activo.
echo.

:: 2. Test de Comunicacion Real
echo [+] [2/3] VALIDANDO PUENTE MCP...
python -c "import httpx; r = httpx.post('http://127.0.0.1:8000/query', json={'notebook_id': '1f927884-ec18-45f3-82b3-f1d0415e6904', 'message': 'test health check'}, timeout=30.0); print('[OK] Respuesta recibida' if r.status_code == 200 else '[X] Error')"
if errorlevel 1 (
    color 0E
    echo [!] Advertencia: La comunicacion con el navegador es lenta o requiere login.
) else (
    echo [OK] Puente operativo.
)
echo.

:: 3. Sincronización de Dashboard
echo [+] [3/3] ACTUALIZANDO DATOS DEL DASHBOARD...
python -c "from agente_notebooklm_mcp.sync_dashboard import update_dashboard_data; update_dashboard_data()"
if errorlevel 1 (
    echo [!] Error al sincronizar datos.
) else (
    echo [OK] Dashboard sincronizado.
)

echo.
echo ================================================================
echo           ESTADO FINAL: PROCESO COMPLETADO
echo ================================================================
echo.
pause
