const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'client/public');
const studentDistDir = path.join(rootDir, 'student-client/dist');
const rootDistDir = path.join(rootDir, 'dist');

[studentDistDir, rootDistDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function copyRecursiveSync(src, dest, skipFiles = []) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child), skipFiles);
    });
  } else {
    const filename = path.basename(src);
    if (!skipFiles.includes(filename)) {
      fs.copyFileSync(src, dest);
    }
  }
}

console.log('[prepare-dist] 1. Copying Vite build artifacts to root dist...');
copyRecursiveSync(studentDistDir, rootDistDir);

console.log('[prepare-dist] 2. Merging client/public assets to root dist and student-client/dist...');
[rootDistDir, studentDistDir].forEach(targetDir => {
  copyRecursiveSync(path.join(srcDir, 'css'), path.join(targetDir, 'css'));
  copyRecursiveSync(path.join(srcDir, 'js'), path.join(targetDir, 'js'));
  copyRecursiveSync(path.join(srcDir, 'uploads'), path.join(targetDir, 'uploads'));
  copyRecursiveSync(path.join(srcDir, 'images'), path.join(targetDir, 'images'));

  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
  htmlFiles.forEach(file => {
    fs.copyFileSync(path.join(srcDir, file), path.join(targetDir, file));
  });

  fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(targetDir, 'public-portal.html'));
});

console.log('[prepare-dist] ✅ Both dist and student-client/dist are ready for Vercel deployment!');
