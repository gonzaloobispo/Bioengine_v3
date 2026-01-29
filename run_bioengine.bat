@echo off
title Launcher BioEngine V3
setlocal

set LOG_FILE=%~dp0startup_debug.log
echo [%date% %time%] Iniciando sesion de control > "%LOG_FILE%"

echo ======================================================
echo    BIOENGINE V3 - LANZADOR DE SERVICIOS
echo ======================================================
echo.

:: 1. Limpiar procesos viejos
echo [+] Limpiando procesos previos (si existen)...
taskkill /f /im python.exe /t >nul 2>&1
taskkill /f /im node.exe /t >nul 2>&1

:: 2. Iniciar el Backend
echo [+] Iniciando BACKEND (Puerto 8000)...
echo [%date% %time%] Iniciando Backend >> "%LOG_FILE%"
start "BioEngine BACKEND" cmd /k "cd /d %~dp0 && echo Instando dependencias del backend... && python backend\main.py"

:: 3. Iniciar el Frontend
echo [+] Iniciando FRONTEND (Puerto 5173)...
echo [%date% %time%] Iniciando Frontend >> "%LOG_FILE%"
start "BioEngine FRONTEND" cmd /k "cd /d %~dp0frontend && echo Iniciando entorno Vite... && npm run dev"

:: 4. Esperar y verificar
echo [+] Dando 5 segundos para que los motores arranquen...
timeout /t 5 /nobreak > nul

echo [+] Abriendo Dashboard en Google Chrome / Navegador...
start http://localhost:5173

echo.
echo ------------------------------------------------------
echo [!] STATUS: Los servicios estan siendo lanzados.
echo ------------------------------------------------------
echo Si ves un error de 'ERR_CONNECTION_REFUSED':
echo 1. Mira las dos ventanas negras que se abrieron.
echo 2. Si alguna dice 'Error', copiamelo.
echo.
echo Presiona cualquier tecla para cerrar este asistente.
pause > nul
exit
