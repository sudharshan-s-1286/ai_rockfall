@echo off
cd /d %~dp0

echo =================================
echo ROCKSENSE SYSTEM LAUNCHER
echo =================================

echo 1. Starting Backend Server...
start "RockSense Backend" backend\run_server.bat

echo 2. Waiting for Backend (Initialization takes ~20s)...
timeout /t 20 >nul

echo 3. Starting Frontend...
start "RockSense Frontend" frontend\run_frontend.bat

echo.
echo System is launching!
echo Backend: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
pause
