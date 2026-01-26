@echo off
cd /d %~dp0
set TF_ENABLE_ONEDNN_OPTS=0
echo ==========================================
echo RockSense Backend Launcher
echo ==========================================

echo [1/2] Installing Dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Starting RockSense Server...
echo API Documentation will be available at: http://localhost:8000/docs
echo.

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
