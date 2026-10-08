const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('[copy-routes] dist/index.html not found!');
  process.exit(0);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Also create 404.html as universal static host fallback
fs.writeFileSync(path.join(distDir, '404.html'), indexHtml, 'utf8');
console.log('[copy-routes] ✅ Generated dist/404.html fallback');

const routes = [
  'student/register',
  'student/login',
  'student/dashboard',
  'student/competitions',
  'student/tournaments',
  'student/sports',
  'student/profile',
  'student/equipment',
  'student/gallery',
  'student/notifications',
  'student/settings',
  'inter-college',
  'inter-college/register',
  'inter-college/success'
];

routes.forEach(route => {
  const dir = path.join(distDir, route);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'index.html'), indexHtml, 'utf8');
});

console.log(`[copy-routes] ✅ Generated ${routes.length} static route fallbacks in dist!`);
