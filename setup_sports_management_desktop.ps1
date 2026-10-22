$desktop = [System.Environment]::GetFolderPath('Desktop')
$sourceDir = 'C:\Users\ELCOT\.gemini\antigravity-ide\scratch\gasc-idappadi-sports\dist\admin-exe\Sports Management-win32-x64'
$targetDir = Join-Path $desktop 'Sports Management'

Write-Host "Copying fresh build to $targetDir ..."
if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item -Path $sourceDir -Destination $targetDir -Recurse -Force

# Create Desktop Shortcut 'Sports Management.lnk'
$targetExe = Join-Path $targetDir 'Sports Management.exe'
$wsh = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop 'Sports Management.lnk'
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $targetDir
$shortcut.Description = 'GASC Sports Management Admin Portal (Latest Build)'
$shortcut.IconLocation = "$targetExe,0"
$shortcut.Save()

Write-Host "✅ Created Desktop Shortcut: $shortcutPath"
Get-Item $targetExe | Select-Object FullName, Length, LastWriteTime
