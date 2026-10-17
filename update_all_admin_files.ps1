# Kill any old running instances holding port 5000
Get-Process | Where-Object { $_.Name -like "*GASC*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

if (Test-Path 'student-client\dist') {
  Copy-Item -Path 'student-client\dist\*' -Destination 'dist' -Recurse -Force
}
Copy-Item 'client\public\css\style.css' 'dist\css\style.css' -Force
Copy-Item 'client\public\css\style.css' 'student-client\dist\css\style.css' -Force
Copy-Item 'client\public\js\touchEffects.js' 'dist\js\touchEffects.js' -Force
Copy-Item 'client\public\js\touchEffects.js' 'student-client\dist\js\touchEffects.js' -Force
Copy-Item 'client\public\js\interCollegeAdmin.js' 'dist\js\interCollegeAdmin.js' -Force
Copy-Item 'client\public\js\interCollegeAdmin.js' 'student-client\dist\js\interCollegeAdmin.js' -Force
Copy-Item 'client\public\js\admin.js' 'dist\js\admin.js' -Force
Copy-Item 'client\public\js\admin.js' 'student-client\dist\js\admin.js' -Force
Copy-Item 'client\public\admin-dashboard.html' 'dist\admin-dashboard.html' -Force
Copy-Item 'client\public\admin-dashboard.html' 'student-client\dist\admin-dashboard.html' -Force
Copy-Item 'client\public\admin-login.html' 'dist\admin-login.html' -Force
Copy-Item 'client\public\admin-login.html' 'student-client\dist\admin-login.html' -Force
Write-Host "Workspace dist updated!" -ForegroundColor Green

$appDirs = @(
  'D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64\resources\app',
  'D:\GASC-Sports-Admin-v1.3\GASC Sports Admin-win32-x64\resources\app',
  'D:\GASC-Sports-Admin-Portable\GASC Sports Admin-win32-x64\resources\app',
  'D:\GASC-Sports-Admin-v1.2\GASC Sports Admin-win32-x64\resources\app'
)

foreach ($dir in $appDirs) {
  if (Test-Path $dir) {
    if (Test-Path "$dir\dist") {
      Copy-Item -Path 'dist\*' "$dir\dist" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$dir\student-client\dist") {
      Copy-Item -Path 'dist\*' "$dir\student-client\dist" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\client\public\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\dist\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\student-client\dist\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\client\public\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\dist\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\student-client\dist\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\client\public\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\dist\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\student-client\dist\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\css\style.css' "$dir\client\public\css\style.css" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\css\style.css' "$dir\dist\css\style.css" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\css\style.css' "$dir\student-client\dist\css\style.css" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\touchEffects.js' "$dir\client\public\js\touchEffects.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\touchEffects.js' "$dir\dist\js\touchEffects.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\touchEffects.js' "$dir\student-client\dist\js\touchEffects.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-login.html' "$dir\client\public\admin-login.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-login.html' "$dir\dist\admin-login.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'package.json' "$dir\package.json" -Force -ErrorAction SilentlyContinue
    Copy-Item 'electron\main.js' "$dir\electron\main.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'electron\preload.js' "$dir\electron\preload.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\routes\interCollegeRoutes.js' "$dir\server\routes\interCollegeRoutes.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\controllers\interCollegeController.js' "$dir\server\controllers\interCollegeController.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\controllers\competitionController.js' "$dir\server\controllers\competitionController.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\controllers\teamController.js' "$dir\server\controllers\teamController.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\routes\cmTrophyRoutes.js' "$dir\server\routes\cmTrophyRoutes.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\controllers\cmTrophyController.js' "$dir\server\controllers\cmTrophyController.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\services\notificationService.js' "$dir\server\services\notificationService.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\server.js' "$dir\server\server.js" -Force -ErrorAction SilentlyContinue
    Write-Host "Copied updates to $dir" -ForegroundColor Green
  }
}
