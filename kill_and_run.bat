@echo off
echo Killing any running Python processes...
taskkill /F /IM python.exe
taskkill /F /IM uvicorn.exe
echo.
echo Cleaning up done.
echo.
echo Restarting Server...
call backend\run_server.bat
