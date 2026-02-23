@echo off
title Lanzador BioEngine V3 - AUTO
setlocal EnableDelayedExpansion

:: Forzar carpeta
cd /d "c:\BioEngine_V3"
echo [+] Iniciando en: %cd%

:: Matar procesos previos para evitar bloqueos
echo [+] Limpiando procesos previos...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: Lanzar Backend
echo [+] Paso 1: Iniciando BACKEND (Puerto 8001)...
start "BioEngine BACKEND" cmd /k "cd /d c:\BioEngine_V3 && echo INICIANDO SERVIDOR... && python backend\main.py"

:: Lanzar Frontend
echo [+] Paso 2: Iniciando FRONTEND (Puerto 5174)...
start "BioEngine FRONTEND" cmd /k "cd /d c:\BioEngine_V3\frontend && echo INICIANDO INTERFAZ... && npm run dev -- --port 5174"

:: Esperar a que carguen
echo [+] Esperando 5 segundos a que los servicios esten listos...
timeout /t 5 /nobreak >nul

:: Abrir Navegador automáticamente
echo [+] Abriendo BioEngine V3 en el navegador...
start http://localhost:5174

echo.
echo ==========================================
echo [LISTO] El sistema se ha iniciado.
echo ==========================================
echo 1. Se han abierto 2 ventanas negras de servicio.
echo 2. El navegador deberia haberse abierto en: http://localhost:5174
echo.
echo Si ves "Error de conexion" en el navegador, espera 5 segundos y pulsa F5.
echo No cierres las ventanas negras mientras uses la app.
echo.
pause
