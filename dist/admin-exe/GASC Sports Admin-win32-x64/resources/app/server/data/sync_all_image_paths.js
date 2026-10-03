const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'client/public/images/sports');

const targetDirs = [
  path.join(rootDir, 'student-client/public/images/sports'),
  path.join(rootDir, 'student-client/dist/images/sports'),
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\client\\public\\images\\sports',
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\student-client\\dist\\images\\sports'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🔄 Syncing all uploaded sport images across public directories...');

const files = fs.readdirSync(srcDir);
let count = 0;

files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  if (fs.statSync(srcFile).isFile()) {
    targetDirs.forEach(dir => {
      fs.copyFileSync(srcFile, path.join(dir, file));
    });
    count++;
  }
});

console.log(`✅ Successfully synced ${count} image files across all client, student, and electron target directories!`);

// Update local_db.json
const dbPath = path.join(__dirname, 'local_db.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  if (Array.isArray(db.sports)) {
    db.sports.forEach(sport => {
      const s = (sport.name || '').toLowerCase().trim();
      const slug = s.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      sport.image = `/images/sports/${slug}.png`;
    });
  }

  if (Array.isArray(db.competitions)) {
    db.competitions.forEach(comp => {
      comp.banner_image = '/images/sports/tournament.png';
    });
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ Updated local_db.json sports image URLs and tournament banner URLs!');
}
