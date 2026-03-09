@echo off
title BioEngine V3 [Hybrid SOTA 2026] - Lanzador Local
setlocal EnableDelayedExpansion

:: Configuración de Rutas
set "ROOT_PATH=%~dp0"
cd /d "%ROOT_PATH%"

echo ==========================================
echo    BioEngine V3 + Engine V4 [STABLE]
echo ==========================================
echo.

:: Limpiar procesos previos
echo [+] Limpiando procesos previos (Puertos 8001 y 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: 1. Lanzar Backend
echo [+] Paso 1: Iniciando BACKEND (Puerto 8001)...
start "BioEngine BACKEND" cmd /k "cd /d %ROOT_PATH% && echo INICIANDO SERVIDOR... && python backend\main.py"

:: 2. Lanzar Frontend
echo [+] Paso 2: Iniciando FRONTEND (Puerto 5173)...
start "BioEngine FRONTEND" cmd /k "cd /d %ROOT_PATH%\frontend && echo INICIANDO INTERFAZ... && npm run dev"

:: Esperar a que carguen
echo [+] Esperando 5 segundos a que los servicios esten listos...
timeout /t 5 /nobreak >nul

:: Abrir Navegador automáticamente
echo [+] Abriendo Dashboard...
start http://localhost:5173

echo.
echo ==========================================
echo [LISTO] El sistema se ha iniciado correctamente.
echo ==========================================
echo.
pause
