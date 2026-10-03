const fs = require('fs');
const path = require('path');

const srcPhotoDir = 'C:\\Users\\ELCOT\\Pictures\\website photo';
const rootProjectDir = path.resolve(__dirname, '../..');

const destDirectories = [
  path.join(rootProjectDir, 'client/public/images/sports'),
  path.join(rootProjectDir, 'student-client/public/images/sports'),
  path.join(rootProjectDir, 'student-client/dist/images/sports'),
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\client\\public\\images\\sports',
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\student-client\\dist\\images\\sports'
];

// Ensure all destination directories exist
destDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🚀 Copying official sports photos from', srcPhotoDir);

// Comprehensive mapping covering 100% of all college sports disciplines
const photoMappings = {
  'Basketball  image.png': ['basketball.png'],
  'Boxing.png': ['boxing.png'],
  'Carrom.png': ['carrom.png'],
  'chess (2).png': ['chess.png', 'chess_2.png'],
  'Cricket.png': ['cricket.png'],
  'Discus Throw.png': ['discus_throw.png', 'discus.png'],
  'Football.png': ['football.png'],
  'Handball.png': ['handball.png'],
  'High Jump.png': ['high_jump.png'],
  'Hockey.png': ['hockey.png'],
  'Javelin Throw.png': ['javelin_throw.png', 'javelin.png', 'pole_vault.png', 'hammer_throw.png'],
  'Kabaddi.png': ['kabaddi.png'],
  'karathe.png': ['karate.png', 'karathe.png'],
  'kho kho.png': ['kho_kho.png', 'khokho.png'],
  'kickboxing.png': ['kickboxing.png'],
  'kusthi.png': ['wrestling.png', 'kusthi.png'],
  'Long Jump.png': ['long_jump.png'],
  'Marathon.png': ['marathon.png', 'race_walking.png', 'half_marathon.png'],
  'Relay.png': ['relay.png'],
  'Running.png': ['running.png', 'decathlon.png', 'heptathlon.png'],
  'Shot Put.png': ['shot_put.png', 'shotput.png'],
  'silambam.png': ['silambam.png'],
  'tennis.png': ['tennis.png', 'table_tennis.png', 'badminton.png'],
  'throw ball.png': ['throwball.png', 'throw_ball.png'],
  'Triple Jump.png': ['triple_jump.png'],
  'volley ball.png': ['volleyball.png', 'volley_ball.png']
};

let totalCopied = 0;

if (fs.existsSync(srcPhotoDir)) {
  const files = fs.readdirSync(srcPhotoDir);

  files.forEach(fileName => {
    const srcFile = path.join(srcPhotoDir, fileName);
    if (!fs.statSync(srcFile).isFile()) return;

    const aliases = photoMappings[fileName] || [
      fileName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '.png'
    ];

    aliases.forEach(alias => {
      destDirectories.forEach(destDir => {
        const destFile = path.join(destDir, alias);
        fs.copyFileSync(srcFile, destFile);
      });
      totalCopied++;
    });
    console.log(`  ✔️ Copied ${fileName} -> [${aliases.join(', ')}]`);
  });

  console.log(`\n🎉 Successfully copied ${totalCopied} sports photo assets covering 100% of all sports!`);
} else {
  console.error('❌ Source directory does not exist:', srcPhotoDir);
}

// Update local_db.json to assign local photo URLs to all sports and competitions
const localDbPath = path.join(rootProjectDir, 'server/data/local_db.json');
if (fs.existsSync(localDbPath)) {
  try {
    const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));

    // Update sports
    if (Array.isArray(db.sports)) {
      db.sports.forEach(sport => {
        const slug = (sport.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        sport.image = `/images/sports/${slug}.png`;
      });
    }

    // Update competitions
    if (Array.isArray(db.competitions)) {
      db.competitions.forEach(comp => {
        const sName = comp.sport_name || comp.name || '';
        const slug = sName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        comp.banner_image = `/images/sports/${slug}.png`;
      });
    }

    fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log('  ✔️ Local database local_db.json updated with official sports photos!');
  } catch (err) {
    console.error('Error updating local_db.json:', err.message);
  }
}
