@echo off
title BioEngine V3 Launcher
setlocal EnableDelayedExpansion

set ROOT=%~dp0
set LOG_FILE=%ROOT%startup_debug.log

if "%BIOENGINE_ADMIN_TOKEN%"=="" set BIOENGINE_ADMIN_TOKEN=bioengine-local

if /i "%1"=="--frontend" goto :frontend
if /i "%1"=="--backend" goto :backend

echo [%date% %time%] Iniciando sesion de control > "%LOG_FILE%"
echo [%date% %time%] BIOENGINE_ADMIN_TOKEN=%BIOENGINE_ADMIN_TOKEN% >> "%LOG_FILE%"

echo ======================================================
echo    BIOENGINE V3 - ONE CLICK LAUNCHER
echo ======================================================
echo.

:: 1. Limpiar procesos viejos solo en puertos conocidos
echo [+] Liberando puertos 8000 y 5173 (si estan en uso)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
  echo [%date% %time%] Cerrando PID %%a (puerto 8000) >> "%LOG_FILE%"
  taskkill /f /t /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
  echo [%date% %time%] Cerrando PID %%a (puerto 5173) >> "%LOG_FILE%"
  taskkill /f /t /pid %%a >nul 2>&1
)

:: 2. Verificar herramientas basicas
where python >nul 2>&1
if errorlevel 1 (
  echo [!] ERROR: Python no encontrado en PATH.
  echo [%date% %time%] ERROR: Python no encontrado >> "%LOG_FILE%"
  goto :final
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [!] ERROR: npm no encontrado en PATH.
  echo [%date% %time%] ERROR: npm no encontrado >> "%LOG_FILE%"
  goto :final
)

:: 3. Iniciar el Backend
echo [+] Iniciando BACKEND (Puerto 8000)...
echo [%date% %time%] Iniciando Backend >> "%LOG_FILE%"
start "BioEngine BACKEND" "%~f0" --backend

:: 4. Iniciar el Frontend
echo [+] Iniciando FRONTEND (Puerto 5173)...
echo [%date% %time%] Iniciando Frontend >> "%LOG_FILE%"
start "BioEngine FRONTEND" "%~f0" --frontend

:: 5. Esperar a que el frontend este listo
echo [+] Esperando puerto 5173...
set READY=
for /l %%i in (1,1,20) do (
  for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    set READY=1
  )
  if defined READY goto :open
  timeout /t 1 /nobreak > nul
)

echo [!] No se detecto 5173 escuchando. Revisa la ventana FRONTEND.
goto :final

:open
echo [+] Abriendo Dashboard en el navegador...
start http://127.0.0.1:5173

echo [+] Verificando salud de servicios...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/ -TimeoutSec 5) | Out-Null; Write-Host 'Backend: OK' } catch { Write-Host 'Backend: FAIL' }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/ -TimeoutSec 5) | Out-Null; Write-Host 'Frontend: OK' } catch { Write-Host 'Frontend: FAIL' }"

echo.
echo ------------------------------------------------------
echo [!] STATUS: Servicios lanzados.
echo ------------------------------------------------------
echo Si ves ERR_CONNECTION_REFUSED:
echo 1. Revisa la ventana FRONTEND.
echo 2. Copia el primer error aqui.
echo.

:final
echo Presiona cualquier tecla para cerrar este asistente.
pause > nul
exit

:frontend
cd /d "%ROOT%frontend"
echo Iniciando entorno Vite en %cd%...
if not exist node_modules (
  echo Instalando dependencias...
  npm install
)
echo Ejecutando: npm run dev -- --host --port 5173 --strictPort
call npm run dev -- --host --port 5173 --strictPort
echo.
echo El proceso del frontend termino. Presiona una tecla para cerrar.
pause > nul
exit /b

:backend
cd /d "%ROOT%"
echo Iniciando backend en %cd%...
python backend\main.py
echo.
echo El proceso del backend termino. Presiona una tecla para cerrar.
pause > nul
exit /b
