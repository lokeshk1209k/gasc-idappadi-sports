const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const localDbFile = path.join(rootDir, 'server/data/local_db.json');

if (fs.existsSync(localDbFile)) {
  const db = JSON.parse(fs.readFileSync(localDbFile, 'utf8'));
  const roster = db.college_student_roster || [];

  const payload = JSON.stringify({
    success: true,
    count: roster.length,
    roster: roster
  }, null, 2);

  const targets = [
    path.join(rootDir, 'student-client/public/roster.json'),
    path.join(rootDir, 'student-client/dist/roster.json'),
    path.join(rootDir, 'public/roster.json'),
    path.join(rootDir, 'dist/roster.json'),
    path.join(rootDir, 'client/public/roster.json')
  ];

  targets.forEach(t => {
    try {
      const dir = path.dirname(t);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(t, payload, 'utf8');
      console.log('✅ Updated', t);
    } catch (e) {
      console.warn('Failed to write', t, e.message);
    }
  });

  console.log(`\n🎉 Synchronized ${roster.length} students into all roster.json files!`);
}
