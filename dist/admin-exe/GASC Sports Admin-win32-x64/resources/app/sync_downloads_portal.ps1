# Synchronize Complete GASC Sports Admin Portal in Downloads
param (
    [string]$DownloadsDir = "C:\Users\ELCOT\Downloads\GASC Sports Admin Portal",
    [string]$SourceDir = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports"
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "🚀 SYNCHRONIZING GASC SPORTS ADMIN PORTAL IN DOWNLOADS" -ForegroundColor Cyan
Write-Host "Destination: $DownloadsDir" -ForegroundColor Yellow
Write-Host "Source:      $SourceDir" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Stop any running GASC processes to prevent file locks
Write-Host "`n>>> [1/6] Stopping any running GASC Sports Admin processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*GASC*" -or $_.ProcessName -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (-not (Test-Path $DownloadsDir)) {
    Write-Host "Error: Target directory does not exist: $DownloadsDir" -ForegroundColor Red
    exit 1
}

$appDir = Join-Path $DownloadsDir "resources\app"
if (-not (Test-Path $appDir)) {
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null
}

# 2. Sync Client (HTML, CSS, JS, Images, Icons)
Write-Host "`n>>> [2/6] Syncing Client folder..." -ForegroundColor Cyan
$clientSrc = Join-Path $SourceDir "client"
$clientDst = Join-Path $appDir "client"
robocopy $clientSrc $clientDst /E /XO /NP /NFL /NDL /NJH /NJS
Write-Host "  Client synced successfully." -ForegroundColor Green

# 3. Sync Server (Controllers, Routes, Models, Data, local_db.json)
Write-Host "`n>>> [3/6] Syncing Server folder..." -ForegroundColor Cyan
$serverSrc = Join-Path $SourceDir "server"
$serverDst = Join-Path $appDir "server"
robocopy $serverSrc $serverDst /E /XO /NP /NFL /NDL /NJH /NJS
Write-Host "  Server synced successfully." -ForegroundColor Green

# 3b. Sync Student Client Dist
Write-Host "`n>>> [3b/6] Syncing Student Client dist..." -ForegroundColor Cyan
$studentSrc = Join-Path $SourceDir "student-client\dist"
$studentDst = Join-Path $appDir "student-client\dist"
robocopy $studentSrc $studentDst /E /XO /NP /NFL /NDL /NJH /NJS
Write-Host "  Student Client dist synced successfully." -ForegroundColor Green

# 4. Sync Electron & Configuration
Write-Host "`n>>> [4/6] Syncing Electron & Root Configuration..." -ForegroundColor Cyan
$electronSrc = Join-Path $SourceDir "electron"
$electronDst = Join-Path $appDir "electron"
robocopy $electronSrc $electronDst /E /XO /NP /NFL /NDL /NJH /NJS

Copy-Item -Path (Join-Path $SourceDir "package.json") -Destination $appDir -Force
if (Test-Path (Join-Path $SourceDir ".env")) {
    Copy-Item -Path (Join-Path $SourceDir ".env") -Destination $appDir -Force
}

# Update Launch Batches
$bat1 = "@echo off`r`ntitle GASC Sports Admin Portal`r`ncd /d `"%~dp0`"`r`nstart `"`" `"GASC Sports Admin.exe`"`r`n"
Set-Content -Path (Join-Path $DownloadsDir "Start GASC Sports Admin.bat") -Value $bat1 -Force
Set-Content -Path (Join-Path $DownloadsDir "Launch in Desktop App Window.bat") -Value $bat1 -Force

# 5. Clear Caches
Write-Host "`n>>> [5/6] Clearing cached Chromium data..." -ForegroundColor Cyan
$cacheDirs = @(
    "$env:APPDATA\gasc-idappadi-sports-management",
    "$env:APPDATA\GASC Sports Admin",
    "$env:LOCALAPPDATA\GASC Sports Admin"
)
foreach ($c in $cacheDirs) {
    if (Test-Path $c) {
        Remove-Item -Path "$c\Cache*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$c\Code Cache*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$c\GPUCache*" -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "  Caches cleared." -ForegroundColor Green

# 6. Syntax & Integrity Verification
Write-Host "`n>>> [6/6] Verifying integrity of updated files..." -ForegroundColor Cyan

$filesToCheck = @(
    (Join-Path $appDir "client\public\js\admin.js"),
    (Join-Path $appDir "server\server.js"),
    (Join-Path $appDir "server\controllers\teamController.js"),
    (Join-Path $appDir "server\controllers\analyticsController.js"),
    (Join-Path $appDir "server\routes\teamRoutes.js"),
    (Join-Path $appDir "server\routes\analyticsRoutes.js")
)

$allPassed = $true
foreach ($f in $filesToCheck) {
    if (Test-Path $f) {
        $res = & node -c $f 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Syntax Valid: $(Split-Path $f -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Syntax Error: $(Split-Path $f -Leaf)" -ForegroundColor Red
            Write-Host "    $res" -ForegroundColor Red
            $allPassed = $false
        }
    } else {
        Write-Host "  [MISSING] $f" -ForegroundColor Red
        $allPassed = $false
    }
}

# Verify local_db.json
$dbPath = Join-Path $appDir "server\data\local_db.json"
if (Test-Path $dbPath) {
    $dbTest = & node -e "try { const db=require('$($dbPath.Replace('\', '/'))'); console.log('Users:', db.users.length, '| Regs:', db.competition_registrations.length, '| Teams:', db.teams.length, '| Members:', db.team_members.length); } catch(e){ console.error('DB Error:', e.message); process.exit(1); }" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database Loaded: $dbTest" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Database Check Failed: $dbTest" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host "`n=====================================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ GASC SPORTS ADMIN PORTAL IN DOWNLOADS IS 100% UPDATED & VERIFIED!" -ForegroundColor Green
} else {
    Write-Host "⚠️ SOME FILES HAD ISSUES - PLEASE REVIEW LOGS" -ForegroundColor Red
}
Write-Host "=====================================================================" -ForegroundColor Cyan
