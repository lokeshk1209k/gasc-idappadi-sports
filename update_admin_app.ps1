# GASC Sports Admin Synchronizer and Integrity Verifier

Write-Host ">>> Stopping any existing GASC Sports Admin processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*GASC*" -or $_.ProcessName -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$workspace = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports"
$targets = @(
    "D:\GASC-Sports-Admin-Portable\GASC Sports Admin-win32-x64",
    "$workspace\dist\admin-exe\GASC Sports Admin-win32-x64",
    "C:\Users\ELCOT\Downloads\GASC Sports Admin Portal",
    "C:\Users\ELCOT\Desktop\GASC Sports Admin Portable"
)

$staleItems = @(
    "client\public\js\interCollegeAdmin.js",
    "client\public\inter-college",
    "client\public\open-registration",
    "dist\inter-college",
    "dist\open-registration",
    "dist\js\interCollegeAdmin.js",
    "server\routes\interCollegeRoutes.js",
    "server\controllers\interCollegeController.js",
    "api\inter-college",
    "student-client\dist\inter-college",
    "student-client\dist\open-registration",
    "student-client\dist\js\interCollegeAdmin.js",
    "student-client\public\inter-college",
    "student-client\public\open-registration",
    "student-client\public\js\interCollegeAdmin.js",
    "student-client\src\pages\InterCollegeLandingPage.tsx",
    "student-client\src\pages\InterCollegeRegisterPage.tsx",
    "student-client\src\pages\InterCollegeSuccessPage.tsx",
    "student-client\src\pages\OpenRegistrationPage.tsx"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Write-Host ">>> Updating: $target" -ForegroundColor Yellow
        $appDir = Join-Path $target "resources\app"
        if (!(Test-Path $appDir)) {
            New-Item -ItemType Directory -Path $appDir -Force | Out-Null
        }

        # 1. Clean stale other college / inter-college items
        foreach ($stale in $staleItems) {
            $stalePath = Join-Path $appDir $stale
            if (Test-Path $stalePath) {
                Remove-Item -Path $stalePath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  [CLEAN] Removed stale item: $stale" -ForegroundColor Magenta
            }
        }

        # 2. Sync client (cleanly replace public files)
        Copy-Item -Path "$workspace\client" -Destination $appDir -Recurse -Force
        # 3. Sync server
        Copy-Item -Path "$workspace\server" -Destination $appDir -Recurse -Force
        # 4. Sync electron
        Copy-Item -Path "$workspace\electron" -Destination $appDir -Recurse -Force
        # 5. Sync root dist
        if (Test-Path "$workspace\dist") {
            Copy-Item -Path "$workspace\dist" -Destination $appDir -Recurse -Force
        }
        # 6. Sync student-client dist
        if (Test-Path "$workspace\student-client\dist") {
            $studentAppDst = Join-Path $appDir "student-client\dist"
            if (!(Test-Path $studentAppDst)) { New-Item -ItemType Directory -Path $studentAppDst -Force | Out-Null }
            Copy-Item -Path "$workspace\student-client\dist\*" -Destination $studentAppDst -Recurse -Force
        }
        # 7. Sync root config files & local database
        Copy-Item -Path "$workspace\package.json" -Destination $appDir -Force
        if (Test-Path "$workspace\.env") {
            Copy-Item -Path "$workspace\.env" -Destination $appDir -Force
        }
        if (Test-Path "$workspace\gasc_sports_local.db") {
            Copy-Item -Path "$workspace\gasc_sports_local.db" -Destination $appDir -Force
        }

        # 8. Sync any missing node_modules such as compression
        $targetNm = Join-Path $appDir "node_modules"
        if (Test-Path $targetNm) {
            foreach ($mod in @("compression", "compressible", "on-headers")) {
                $modSrc = Join-Path "$workspace\node_modules" $mod
                $modDst = Join-Path $targetNm $mod
                if ((Test-Path $modSrc) -and !(Test-Path $modDst)) {
                    Copy-Item -Path $modSrc -Destination $modDst -Recurse -Force
                }
            }
        }

        # 9. Update / create Start scripts
        $batContent = "@echo off`r`ntitle GASC Sports Admin Portal`r`ncd /d `"%~dp0`"`r`ntaskkill /F /IM `"GASC Sports Admin.exe`" >nul 2>&1`r`necho Starting GASC Sports Admin...`r`nstart `"`" `"GASC Sports Admin.exe`"`r`n"
        Set-Content -Path (Join-Path $target "Start GASC Sports Admin.bat") -Value $batContent -Force
        Set-Content -Path (Join-Path $target "Start App.bat") -Value $batContent -Force

        # 10. Verify admin.js and server.js syntax
        $adminJsPath = Join-Path $appDir "client\public\js\admin.js"
        if (Test-Path $adminJsPath) {
            $syntaxCheck = & node -c $adminJsPath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Syntax check passed for: admin.js" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Syntax check failed for: $adminJsPath" -ForegroundColor Red
                Write-Host $syntaxCheck
            }
        }

        $serverJsPath = Join-Path $appDir "server\server.js"
        if (Test-Path $serverJsPath) {
            $syntaxCheck2 = & node -c $serverJsPath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Syntax check passed for: server.js" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Syntax check failed for: $serverJsPath" -ForegroundColor Red
                Write-Host $syntaxCheck2
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
