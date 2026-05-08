@echo off
:: setup-garmin-daily-sync.bat
:: Registra una tarea en el Programador de Tareas de Windows
:: que ejecuta el Agente de Sincronización Local DIARIAMENTE a las 8am.
:: Bypass de bloqueos de IP de Garmin para Cloud Functions.

echo ========================================================
echo   Configurando Sincronizador Local Diario de BioEngine
echo ========================================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Se requieren privilegios de ADMINISTRADOR.
    echo Por favor, haz clic derecho y selecciona "Ejecutar como administrador".
    pause
    exit /b 1
)

set TASK_NAME="BioEngine-LocalSync"
set APP_DIR="c:\BioEngine_V3\apps\bot-telegram"
set LOG_DIR="c:\BioEngine_V3\logs"

if not exist %LOG_DIR% mkdir %LOG_DIR%

echo Creando tarea programada: %TASK_NAME%
echo Directorio: %APP_DIR%

schtasks /create /tn %TASK_NAME% ^
  /tr "cmd /c cd /d %APP_DIR% && npx tsx scripts\refresh-garmin-token-silent.ts >> %LOG_DIR%\sync-local.log 2>&1" ^
  /sc DAILY /st 08:00 ^
  /f /rl HIGHEST

if %ERRORLEVEL% == 0 (
    echo.
    echo ✅ OK - Tarea "%TASK_NAME%" creada correctamente.
    echo Se ejecutara todos los dias a las 8:00 AM.
    echo.
    echo Puedes probar la tarea ahora ejecutando:
    echo schtasks /run /tn %TASK_NAME%
    echo.
    echo Los logs se guardan en: %LOG_DIR%\sync-local.log
) else (
    echo ❌ ERROR al crear la tarea. Revisa los mensajes arriba.
)

pause
