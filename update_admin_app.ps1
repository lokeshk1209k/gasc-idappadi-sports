# GASC Sports Admin Synchronizer and Integrity Verifier

Write-Host ">>> Stopping any existing GASC Sports Admin processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*GASC*" -or $_.ProcessName -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$workspace = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports"
$targets = @(
    "$workspace\dist\admin-exe\GASC Sports Admin-win32-x64",
    "C:\Users\ELCOT\Downloads\GASC Sports Admin Portal",
    "C:\Users\ELCOT\Desktop\GASC Sports Admin Portable"
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
        # Sync student-client dist
        if (Test-Path "$workspace\student-client\dist") {
            $studentAppDst = Join-Path $appDir "student-client\dist"
            if (!(Test-Path $studentAppDst)) { New-Item -ItemType Directory -Path $studentAppDst -Force | Out-Null }
            Copy-Item -Path "$workspace\student-client\dist\*" -Destination $studentAppDst -Recurse -Force
        }
        # Sync root config files
        Copy-Item -Path "$workspace\package.json" -Destination $appDir -Force
        if (Test-Path "$workspace\.env") {
            Copy-Item -Path "$workspace\.env" -Destination $appDir -Force
        }

        # Update / create Start GASC Sports Admin.bat
        $batContent = "@echo off`r`ntitle GASC Sports Admin Portal`r`ncd /d `"%~dp0`"`r`nstart `"`" `"GASC Sports Admin.exe`"`r`n"
        Set-Content -Path (Join-Path $target "Start GASC Sports Admin.bat") -Value $batContent -Force

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
