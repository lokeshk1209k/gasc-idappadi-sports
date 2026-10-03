const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../client/public');
const destDir = path.join(__dirname, '../student-client/dist');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

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

console.log('[prepare-dist] Copying client/public assets to student-client/dist...');
// Copy css, js, uploads
copyRecursiveSync(path.join(srcDir, 'css'), path.join(destDir, 'css'));
copyRecursiveSync(path.join(srcDir, 'js'), path.join(destDir, 'js'));
copyRecursiveSync(path.join(srcDir, 'uploads'), path.join(destDir, 'uploads'));

// Copy images (merge into destDir/images)
copyRecursiveSync(path.join(srcDir, 'images'), path.join(destDir, 'images'));

// Copy all HTML pages except index.html (so React student app stays as main SPA index.html)
// but also save client/public/index.html as landing.html / portal.html if needed
const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
htmlFiles.forEach(file => {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
});

// Also copy client/public/index.html as public-portal.html so traditional view is accessible
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(destDir, 'public-portal.html'));

console.log('[prepare-dist] ✅ Successfully merged all static pages, images, CSS, and JS into student-client/dist!');
