const fs = require('fs');
const path = require('path');

const srcDist = path.resolve(__dirname, '../dist/admin-exe/GASC Sports Admin-win32-x64');

// Target destinations
const targets = [
  'C:/Users/ELCOT/Desktop/GASC Sports Admin',
  'C:/Users/ELCOT/Downloads/GASC Sports Admin Portal'
];

targets.forEach(dest => {
  console.log(`\nDeploying fresh build to: ${dest}`);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Copy all files from srcDist to dest
  fs.cpSync(srcDist, dest, { recursive: true });

  // Create a 1-click launcher batch file
  const batContent = `@echo off
title Starting GASC Sports Admin Portal...
cd /d "%~dp0"
echo ======================================================================
echo    GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI
echo    SMART SPORTS MANAGEMENT SYSTEM - SPORTS INCHARGE PORTAL
echo ======================================================================
echo.
echo Launching GASC Sports Admin Desktop Application...
taskkill /F /IM "GASC Sports Admin.exe" >nul 2>&1
start "" "%~dp0GASC Sports Admin.exe"
echo Done.
`;
  fs.writeFileSync(path.join(dest, 'Start GASC Sports Admin.bat'), batContent);

  // Also create a native Edge App Mode launcher as an alternate instant launcher
  const edgeAppBat = `@echo off
title Launching GASC Sports Admin (Desktop Mode)...
cd /d "%~dp0"
taskkill /F /IM "GASC Sports Admin.exe" >nul 2>&1
start "" msedge.exe --app=http://localhost:5000/admin/login
`;
  fs.writeFileSync(path.join(dest, 'Launch in Desktop App Window.bat'), edgeAppBat);

  console.log(`✅ Successfully deployed to ${dest}`);
});
