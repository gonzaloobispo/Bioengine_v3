@echo off
title "Lanzador BioEngine V4 & OpenGravity - AUTO"
setlocal EnableDelayedExpansion

:: Configuración de Rutas
set "OPENGRAVITY_PATH=C:\APP\OpenGravity"
set "BIOENGINE_PATH=C:\APP\BioEngine"

echo ==========================================
echo    OpenGravity V4 - Lanzador Unificado
echo ==========================================
echo.

:: Limpiar procesos previos en puertos conocidos
echo [+] Limpiando procesos previos...
:: Vite (5173) y otros posibles
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: 1. Lanzar OpenGravity Agent (Bot)
echo [+] Paso 1: Iniciando OpenGravity Agent (Cerebro/Bot)...
start "OpenGravity AGENT" cmd /k "cd /d %OPENGRAVITY_PATH% && echo INICIANDO AGENTE... && npm run dev"

:: 2. Lanzar BioEngine Web
echo [+] Paso 2: Iniciando BioEngine Web Dashboard...
start "BioEngine WEB" cmd /k "cd /d %BIOENGINE_PATH% && echo INICIANDO DASHBOARD... && npm run dev"

:: Esperar a que carguen
echo [+] Esperando 7 segundos a que los servicios esten listos...
timeout /t 7 /nobreak >nul

:: Abrir Navegador automáticamente
echo [+] Abriendo Dashboard en el navegador...
start http://localhost:5173

echo.
echo ==========================================
echo [LISTO] El sistema se ha iniciado.
echo ==========================================
echo 1. Se han abierto 2 ventanas: una para el BOT y otra para la WEB.
echo 2. El navegador deberia haberse abierto en: http://localhost:5173
echo.
echo Si ves "Error de conexion", espera unos segundos y pulsa F5.
echo No cierres las ventanas negras mientras uses la app.
echo.
pause
