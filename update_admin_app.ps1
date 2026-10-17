# GASC Sports Admin Synchronizer and Integrity Verifier

Write-Host ">>> Stopping any existing GASC Sports Admin processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*GASC*" -or $_.ProcessName -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$workspace = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports"
$targets = @(
    "D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64",
    "D:\GASC-Sports-Admin-Portable\GASC Sports Admin-win32-x64",
    "D:\GASC-Sports-Admin-v1.3\GASC Sports Admin-win32-x64",
    "D:\GASC-Sports-Admin-v1.2\GASC Sports Admin-win32-x64",
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

        # 2. Sync client (cleanly replace public files)
        Copy-Item -Path "$workspace\client" -Destination $appDir -Recurse -Force
        # 3. Sync server
        Copy-Item -Path "$workspace\server" -Destination $appDir -Recurse -Force
        # 4. Sync electron
        Copy-Item -Path "$workspace\electron" -Destination $appDir -Recurse -Force
        # 5. Sync root dist (exclude heavy packaged binaries)
        if (Test-Path "$workspace\dist") {
            $distDst = Join-Path $appDir "dist"
            if (!(Test-Path $distDst)) { New-Item -ItemType Directory -Path $distDst -Force | Out-Null }
            Get-ChildItem -Path "$workspace\dist" -Exclude "admin-exe", "admin-portable" | ForEach-Object {
                Copy-Item -Path $_.FullName -Destination $distDst -Recurse -Force
            }
        }
        # 6. Sync student-client dist
        if (Test-Path "$workspace\student-client\dist") {
            $studentAppDst = Join-Path $appDir "student-client\dist"
            if (!(Test-Path $studentAppDst)) { New-Item -ItemType Directory -Path $studentAppDst -Force | Out-Null }
            Copy-Item -Path "$workspace\student-client\dist\*" -Destination $studentAppDst -Recurse -Force
        }
        # 7. Sync api serverless functions
        $apiSrc = Join-Path $workspace "api"
        $apiDst = Join-Path $appDir "api"
        if (Test-Path $apiSrc) {
            if (!(Test-Path $apiDst)) { New-Item -ItemType Directory -Path $apiDst -Force | Out-Null }
            Copy-Item -Path "$apiSrc\*" -Destination $apiDst -Recurse -Force
            Write-Host "  [OK] Synced api serverless functions" -ForegroundColor Green
        }
        # 8. Sync root config files & local database
        Copy-Item -Path "$workspace\package.json" -Destination $appDir -Force
        if (Test-Path "$workspace\.env") {
            Copy-Item -Path "$workspace\.env" -Destination $appDir -Force
        }
        if (Test-Path "$workspace\gasc_sports_local.db") {
            Copy-Item -Path "$workspace\gasc_sports_local.db" -Destination $appDir -Force
        }

        # 9. Sync any missing node_modules such as compression, qrcode, nodemailer
        $targetNm = Join-Path $appDir "node_modules"
        if (Test-Path $targetNm) {
            foreach ($mod in @("compression", "compressible", "on-headers", "ws", "qrcode", "nodemailer")) {
                $modSrc = Join-Path "$workspace\node_modules" $mod
                $modDst = Join-Path $targetNm $mod
                if ((Test-Path $modSrc) -and !(Test-Path $modDst)) {
                    Copy-Item -Path $modSrc -Destination $modDst -Recurse -Force
                    Write-Host "  [OK] Added missing module: $mod" -ForegroundColor Green
                }
            }
        }

        # 10. Update / create Start scripts
        $batContent = "@echo off`r`ntitle GASC Sports Admin Portal`r`ncd /d `"%~dp0`"`r`ntaskkill /F /IM `"GASC Sports Admin.exe`" >nul 2>&1`r`necho Starting GASC Sports Admin...`r`nstart `"`" `"GASC Sports Admin.exe`"`r`n"
        Set-Content -Path (Join-Path $target "Start GASC Sports Admin.bat") -Value $batContent -Force
        Set-Content -Path (Join-Path $target "Start App.bat") -Value $batContent -Force

        # 11. Verify admin.js and server.js syntax
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

        $interCollegeAdminJsPath = Join-Path $appDir "client\public\js\interCollegeAdmin.js"
        if (Test-Path $interCollegeAdminJsPath) {
            $syntaxCheck3 = & node -c $interCollegeAdminJsPath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Syntax check passed for: interCollegeAdmin.js" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Syntax check failed for: $interCollegeAdminJsPath" -ForegroundColor Red
                Write-Host $syntaxCheck3
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
