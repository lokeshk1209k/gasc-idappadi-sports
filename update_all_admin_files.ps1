Copy-Item 'client\public\js\interCollegeAdmin.js' 'dist\js\interCollegeAdmin.js' -Force
Copy-Item 'client\public\js\interCollegeAdmin.js' 'student-client\dist\js\interCollegeAdmin.js' -Force
Copy-Item 'client\public\js\admin.js' 'dist\js\admin.js' -Force
Copy-Item 'client\public\js\admin.js' 'student-client\dist\js\admin.js' -Force
Copy-Item 'client\public\admin-dashboard.html' 'dist\admin-dashboard.html' -Force
Copy-Item 'client\public\admin-dashboard.html' 'student-client\dist\admin-dashboard.html' -Force
Write-Host "Workspace dist updated!" -ForegroundColor Green

$appDirs = @(
  'D:\GASC-Sports-Admin-v1.3\GASC Sports Admin-win32-x64\resources\app',
  'D:\GASC-Sports-Admin-Portable\GASC Sports Admin-win32-x64\resources\app',
  'D:\GASC-Sports-Admin-v1.2\GASC Sports Admin-win32-x64\resources\app'
)

foreach ($dir in $appDirs) {
  if (Test-Path $dir) {
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\client\public\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\dist\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\interCollegeAdmin.js' "$dir\student-client\dist\js\interCollegeAdmin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\client\public\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\dist\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\js\admin.js' "$dir\student-client\dist\js\admin.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\client\public\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\dist\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'client\public\admin-dashboard.html' "$dir\student-client\dist\admin-dashboard.html" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\routes\interCollegeRoutes.js' "$dir\server\routes\interCollegeRoutes.js" -Force -ErrorAction SilentlyContinue
    Copy-Item 'server\controllers\interCollegeController.js' "$dir\server\controllers\interCollegeController.js" -Force -ErrorAction SilentlyContinue
    Write-Host "Copied updates to $dir" -ForegroundColor Green
  }
}
