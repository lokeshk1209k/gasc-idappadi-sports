$wsh = New-Object -ComObject WScript.Shell

$shortcutPath1 = "C:\Users\ELCOT\Desktop\GASC Sports Admin v1.4.lnk"
$sc1 = $wsh.CreateShortcut($shortcutPath1)
$sc1.TargetPath = "D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64\GASC Sports Admin.exe"
$sc1.WorkingDirectory = "D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64"
$sc1.Save()

$shortcutPath2 = "C:\Users\ELCOT\Desktop\GASC Sports Admin.lnk"
$sc2 = $wsh.CreateShortcut($shortcutPath2)
$sc2.TargetPath = "D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64\GASC Sports Admin.exe"
$sc2.WorkingDirectory = "D:\GASC-Sports-Admin-v1.4\GASC Sports Admin-win32-x64"
$sc2.Save()

Write-Host "Created Desktop Shortcut: GASC Sports Admin v1.4.lnk" -ForegroundColor Green
Write-Host "Updated Desktop Shortcut: GASC Sports Admin.lnk -> v1.4" -ForegroundColor Green
