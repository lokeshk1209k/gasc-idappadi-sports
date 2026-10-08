# GASC Sports Admin Synchronizer and Integrity Verifier

Write-Host ">>> Stopping any existing GASC Sports Admin processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*GASC*" -or $_.ProcessName -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$workspace = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports"
$targets = @(
    "D:\GASC-Sports-Admin-Portable\GASC Sports Admin-win32-x64",
    "$workspace\dist\admin-exe\GASC Sports Admin-win32-x64",
    "C:\Users\ELCOT\Downloads\GASC Sports Admin Portal",
    "C:\Users\ELCOT\Desktop\GASC Sports Admin Portable",
    "C:\Users\ELCOT\Desktop\GASC Sports Admin"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Write-Host ">>> Updating: $target" -ForegroundColor Yellow
        $appDir = Join-Path $target "resources\app"
        if (!(Test-Path $appDir)) {
            New-Item -ItemType Directory -Path $appDir -Force | Out-Null
        }

        # Sync client
        Copy-Item -Path "$workspace\client" -Destination $appDir -Recurse -Force
        # Sync server
        Copy-Item -Path "$workspace\server" -Destination $appDir -Recurse -Force
        # Sync electron
        Copy-Item -Path "$workspace\electron" -Destination $appDir -Recurse -Force
        # Sync root dist
        if (Test-Path "$workspace\dist") {
            Copy-Item -Path "$workspace\dist" -Destination $appDir -Recurse -Force
        }
        # Sync student-client dist
        if (Test-Path "$workspace\student-client\dist") {
            $studentAppDst = Join-Path $appDir "student-client\dist"
            if (!(Test-Path $studentAppDst)) { New-Item -ItemType Directory -Path $studentAppDst -Force | Out-Null }
            Copy-Item -Path "$workspace\student-client\dist\*" -Destination $studentAppDst -Recurse -Force
        }
        # Sync root config files & local database
        Copy-Item -Path "$workspace\package.json" -Destination $appDir -Force
        if (Test-Path "$workspace\.env") {
            Copy-Item -Path "$workspace\.env" -Destination $appDir -Force
        }
        if (Test-Path "$workspace\gasc_sports_local.db") {
            Copy-Item -Path "$workspace\gasc_sports_local.db" -Destination $appDir -Force
        }
        if (Test-Path "$workspace\server\data\local_db.json") {
            $dataDir = Join-Path $appDir "server\data"
            if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
            Copy-Item -Path "$workspace\server\data\local_db.json" -Destination $dataDir -Force
        }

        # Sync complete node_modules if missing or incomplete
        $targetNm = Join-Path $appDir "node_modules"
        if (!(Test-Path $targetNm)) {
            New-Item -ItemType Directory -Path $targetNm -Force | Out-Null
        }
        $wsNmCount = (Get-ChildItem -Path "$workspace\node_modules" -Directory -ErrorAction SilentlyContinue).Count
        $targetNmCount = (Get-ChildItem -Path $targetNm -Directory -ErrorAction SilentlyContinue).Count
        if ($targetNmCount -lt ($wsNmCount - 10)) {
            Write-Host "  Synchronizing complete node_modules ($wsNmCount packages)..." -ForegroundColor Cyan
            Copy-Item -Path "$workspace\node_modules\*" -Destination $targetNm -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            # Sync key critical packages
            foreach ($mod in @("compression", "compressible", "on-headers", "sql.js", "uuid", "qrcode", "xlsx", "@supabase")) {
                $modSrc = Join-Path "$workspace\node_modules" $mod
                $modDst = Join-Path $targetNm $mod
                if (Test-Path $modSrc) {
                    Copy-Item -Path $modSrc -Destination $modDst -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }

        # Update / create Start scripts
        $batContent = "@echo off`r`ntitle GASC Sports Admin Portal`r`ncd /d `"%~dp0`"`r`ntaskkill /F /IM `"GASC Sports Admin.exe`" >nul 2>&1`r`necho Starting GASC Sports Admin...`r`nstart `"`" `"GASC Sports Admin.exe`"`r`n"
        Set-Content -Path (Join-Path $target "Start GASC Sports Admin.bat") -Value $batContent -Force
        Set-Content -Path (Join-Path $target "Start App.bat") -Value $batContent -Force

        # Verify admin.js syntax
        $adminJsPath = Join-Path $appDir "client\public\js\admin.js"
        if (Test-Path $adminJsPath) {
            $syntaxCheck = & node -c $adminJsPath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Syntax check passed for: $adminJsPath" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Syntax check failed for: $adminJsPath" -ForegroundColor Red
                Write-Host $syntaxCheck
            }
        }
    } else {
        Write-Host "Target not found: $target" -ForegroundColor Gray
    }
}

Write-Host ">>> Clearing stale Electron Chromium caches..." -ForegroundColor Cyan
$cachePaths = @(
    "$env:APPDATA\gasc-idappadi-sports-management\Cache",
    "$env:APPDATA\gasc-idappadi-sports-management\Code Cache",
    "$env:APPDATA\gasc-idappadi-sports-management\DawnCache",
    "$env:APPDATA\gasc-idappadi-sports-management\GPUCache",
    "$env:APPDATA\GASC Sports Admin\Cache",
    "$env:APPDATA\GASC Sports Admin\Code Cache",
    "$env:APPDATA\GASC-Sports-Admin-Portal\Cache"
)
foreach ($cp in $cachePaths) {
    if (Test-Path $cp) {
        Remove-Item -Path $cp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ">>> All GASC Sports Admin distributions updated successfully!" -ForegroundColor Green
