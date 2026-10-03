# GASC Idappadi - Smart Sports Management System Startup Script
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI" -ForegroundColor Green
Write-Host "   SMART SPORTS MANAGEMENT SYSTEM" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please download and install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit..."
    exit 1
}

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing project dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "[INFO] Launching server..." -ForegroundColor Green
Write-Host "[INFO] Opening browser at http://localhost:5000 in 3 seconds..." -ForegroundColor Cyan

# Open browser asynchronously
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5000"
} | Out-Null

# Run server
npm start
