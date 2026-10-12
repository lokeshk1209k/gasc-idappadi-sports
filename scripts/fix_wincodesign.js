const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
const targetDir = path.join(cacheDir, 'winCodeSign-2.6.0');
const sevenZip = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.7z'));
if (files.length > 0) {
  const archive = path.join(cacheDir, files[0]);
  console.log('Using archive:', archive);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const cmd = `"${sevenZip}" x -y -xr!darwin "${archive}" "-o${targetDir}"`;
  console.log('Running:', cmd);
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log('Extraction success!');
}
