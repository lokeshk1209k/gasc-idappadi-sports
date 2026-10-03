const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'client/public');
const studentDistDir = path.join(rootDir, 'student-client/dist');
const rootDistDir = path.join(rootDir, 'dist');
const localDbFile = path.join(rootDir, 'server/data/local_db.json');

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

  // Export current tournaments from local_db.json so student portal on static hosts (like Vercel)
  // displays all tournaments created by the admin (like FLASH, SPARK, etc.)
  if (fs.existsSync(localDbFile)) {
    try {
      const db = JSON.parse(fs.readFileSync(localDbFile, 'utf8'));
      const competitionsPayload = JSON.stringify({
        success: true,
        count: (db.competitions || []).length,
        competitions: db.competitions || []
      }, null, 2);

      fs.writeFileSync(path.join(targetDir, 'competitions.json'), competitionsPayload, 'utf8');

      // Also create an api/competitions static route if static fallback is queried
      const apiDir = path.join(targetDir, 'api');
      if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });
      fs.writeFileSync(path.join(apiDir, 'competitions'), competitionsPayload, 'utf8');
      fs.writeFileSync(path.join(apiDir, 'competitions.json'), competitionsPayload, 'utf8');

      console.log(`[prepare-dist] 🏆 Exported ${(db.competitions || []).length} tournaments to competitions.json`);
    } catch (e) {
      console.warn('[prepare-dist] Could not export competitions payload:', e.message);
    }
  }
});

console.log('[prepare-dist] ✅ Both dist and student-client/dist are ready for deployment!');
