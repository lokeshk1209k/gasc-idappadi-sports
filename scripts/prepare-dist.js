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
      try {
        fs.copyFileSync(src, dest);
      } catch (err) {}
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

  // Copy only admin portal HTML files
  ['admin-dashboard.html', 'admin-login.html'].forEach(file => {
    const srcFile = path.join(srcDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(targetDir, file));
    }
  });

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

      // Export sports list for offline and static host availability
      const sportsList = [
        { id: 'sp_cricket', name: 'Cricket', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-trophy', image: '/images/sports/cricket.png' },
        { id: 'sp_football', name: 'Football', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-dribbble', image: '/images/sports/football.png' },
        { id: 'sp_volleyball', name: 'Volleyball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/volleyball.png' },
        { id: 'sp_kabaddi', name: 'Kabaddi', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-shield-shaded', image: '/images/sports/kabaddi.png' },
        { id: 'sp_badminton', name: 'Badminton', category: 'Indoor Games', indoorOutdoor: 'Indoor', icon: 'bi-circle', image: '/images/sports/badminton.png' },
        { id: 'sp_athletics', name: 'Athletics (Track & Field)', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/running.png' },
        { id: 'sp_chess', name: 'Chess', category: 'Indoor Games', indoorOutdoor: 'Indoor', icon: 'bi-suit-spade', image: '/images/sports/chess.png' },
        { id: 'sp_kho_kho', name: 'Kho Kho', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-people', image: '/images/sports/kho_kho.png' },
        { id: 'sp_table_tennis', name: 'Table Tennis', category: 'Indoor Games', indoorOutdoor: 'Indoor', icon: 'bi-circle', image: '/images/sports/table_tennis.png' },
        { id: 'sp_basketball', name: 'Basketball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/basketball.png' },
        { id: 'sp_carrom', name: 'Carrom', category: 'Indoor Games', indoorOutdoor: 'Indoor', icon: 'bi-grid-3x3', image: '/images/sports/carrom.png' },
        { id: 'sp_handball', name: 'Handball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-dribbble', image: '/images/sports/handball.png' },
        { id: 'sp_throwball', name: 'Throwball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/throwball.png' },
        { id: 'sp_tennis', name: 'Tennis', category: 'Outdoor Games', indoorOutdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/tennis.png' },
        { id: 'sp_running', name: 'Running', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/running.png' },
        { id: 'sp_shot_put', name: 'Shot Put', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/shot_put.png' },
        { id: 'sp_javelin_throw', name: 'Javelin Throw', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/javelin_throw.png' },
        { id: 'sp_long_jump', name: 'Long Jump', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/long_jump.png' },
        { id: 'sp_high_jump', name: 'High Jump', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/high_jump.png' },
        { id: 'sp_relay', name: 'Relay', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/relay.png' },
        { id: 'sp_marathon', name: 'Marathon', category: 'Athletics', indoorOutdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/marathon.png' }
      ];

      const sportsPayload = JSON.stringify({
        success: true,
        count: sportsList.length,
        sports: sportsList
      }, null, 2);

      fs.writeFileSync(path.join(targetDir, 'sports.json'), sportsPayload, 'utf8');

      // Export college student roster for instant client-side verification
      const rosterList = db.college_student_roster || [];
      const rosterPayload = JSON.stringify({
        success: true,
        count: rosterList.length,
        roster: rosterList
      }, null, 2);

      fs.writeFileSync(path.join(targetDir, 'roster.json'), rosterPayload, 'utf8');

      console.log(`[prepare-dist] 🏆 Exported ${(db.competitions || []).length} tournaments to competitions.json`);
      console.log(`[prepare-dist] 📋 Exported ${rosterList.length} students to roster.json`);
    } catch (e) {
      console.warn('[prepare-dist] Could not export data payload:', e.message);
    }
  }
});

console.log('[prepare-dist] ✅ Both dist and student-client/dist are ready for deployment!');
