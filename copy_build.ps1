$processes = Get-Process | Where-Object { $_.Name -like "*GASC*" }
foreach ($p in $processes) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

$src = "c:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\dist\admin-exe\GASC Sports Admin-win32-x64"
$dest1 = "C:\Users\ELCOT\Downloads\GASC Sports Admin Portal"
$dest2 = "C:\Users\ELCOT\Desktop\GASC Sports Admin Portable"

if (!(Test-Path $dest1)) { New-Item -ItemType Directory -Path $dest1 -Force }
if (!(Test-Path $dest2)) { New-Item -ItemType Directory -Path $dest2 -Force }

Copy-Item -Path "$src\*" -Destination $dest1 -Recurse -Force
Copy-Item -Path "$src\*" -Destination $dest2 -Recurse -Force

Write-Host "DESTRUCTIVE_COPY_SUCCESS"
