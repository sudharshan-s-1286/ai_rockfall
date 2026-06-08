@echo off
echo ==========================================
echo Starting RockSense System
echo ==========================================

echo Starting Backend Server...
start "RockSense Backend" cmd /k "cd backend && run_server.bat"

echo Starting Frontend Dev Server...
start "RockSense Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in new windows.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
