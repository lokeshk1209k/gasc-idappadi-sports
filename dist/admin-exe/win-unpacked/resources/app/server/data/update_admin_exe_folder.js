const fs = require('fs');
const path = require('path');

const srcProjectDir = path.resolve(__dirname, '../..');
const destExeAppDir = 'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app';

console.log(`Copying updated files from ${srcProjectDir} to ${destExeAppDir}...`);

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Exclude node_modules, .git, and scratch
      if (childItemName === 'node_modules' || childItemName === '.git' || childItemName === 'scratch') return;
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  // 1. Copy client folder
  copyRecursiveSync(path.join(srcProjectDir, 'client'), path.join(destExeAppDir, 'client'));
  console.log('  ✔️ client/ updated');

  // 2. Copy server folder
  copyRecursiveSync(path.join(srcProjectDir, 'server'), path.join(destExeAppDir, 'server'));
  console.log('  ✔️ server/ updated');

  // 3. Copy student-client folder
  copyRecursiveSync(path.join(srcProjectDir, 'student-client'), path.join(destExeAppDir, 'student-client'));
  console.log('  ✔️ student-client/ updated');

  // 4. Copy electron folder
  copyRecursiveSync(path.join(srcProjectDir, 'electron'), path.join(destExeAppDir, 'electron'));
  console.log('  ✔️ electron/ updated');

  // 5. Read root package.json, set "main": "electron/main.js" for Electron EXE entrypoint, and save
  const pkgPath = path.join(srcProjectDir, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkgData.main = 'electron/main.js'; // FIX: Ensures Electron opens the GUI window!

  fs.writeFileSync(path.join(destExeAppDir, 'package.json'), JSON.stringify(pkgData, null, 2), 'utf8');

  if (fs.existsSync(path.join(srcProjectDir, '.env'))) {
    fs.copyFileSync(path.join(srcProjectDir, '.env'), path.join(destExeAppDir, '.env'));
  }
  console.log('  ✔️ Root config & package.json updated with "main": "electron/main.js"');

  console.log('\n🎉 Successfully updated Admin Portal EXE package at C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal!');
} catch (err) {
  console.error('Error updating Admin EXE folder:', err);
}
