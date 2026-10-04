$vendorDir = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\client\public\vendor"
$fontsDir = Join-Path $vendorDir "fonts"
if (-not (Test-Path $vendorDir)) { New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null }
if (-not (Test-Path $fontsDir)) { New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null }

Write-Host "Downloading Bootstrap CSS..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" -OutFile (Join-Path $vendorDir "bootstrap.min.css") -UseBasicParsing

Write-Host "Downloading Bootstrap Bundle JS..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" -OutFile (Join-Path $vendorDir "bootstrap.bundle.min.js") -UseBasicParsing

Write-Host "Downloading Chart.js..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js" -OutFile (Join-Path $vendorDir "chart.umd.min.js") -UseBasicParsing

Write-Host "Downloading Bootstrap Icons CSS..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" -OutFile (Join-Path $vendorDir "bootstrap-icons.min.css") -UseBasicParsing

Write-Host "Downloading Bootstrap Icons Font (woff2)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2" -OutFile (Join-Path $fontsDir "bootstrap-icons.woff2") -UseBasicParsing

Write-Host "Downloading Bootstrap Icons Font (woff)..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff" -OutFile (Join-Path $fontsDir "bootstrap-icons.woff") -UseBasicParsing

Write-Host "All vendor assets downloaded successfully!" -ForegroundColor Green
Get-ChildItem -Path $vendorDir
