@echo off
title GASC Idappadi - Smart Sports Management System
color 0A
cls

echo ======================================================================
echo    GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI
echo    SMART SPORTS MANAGEMENT SYSTEM
echo ======================================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing required project dependencies...
    call npm install
    echo.
)

echo [INFO] Starting GASC Idappadi Sports Server...
echo [INFO] Open your browser at: http://localhost:5000
echo.

:: Automatically open default browser after a brief delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5000"

:: Start the Node server
npm start

pause
