const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\ELCOT\\Pictures\\website photo';
const destDir1 = path.join(__dirname, '../client/public/images/sports');
const destDir2 = path.join(__dirname, '../student-client/public/images/sports');

if (!fs.existsSync(destDir1)) fs.mkdirSync(destDir1, { recursive: true });
if (!fs.existsSync(destDir2)) fs.mkdirSync(destDir2, { recursive: true });

const nameMap = {
  'Basketball  image.png': 'basketball.png',
  'Boxing.png': 'boxing.png',
  'Carrom.png': 'carrom.png',
  'chess (2).png': 'chess.png',
  'Cricket.png': 'cricket.png',
  'Discus Throw.png': 'discus_throw.png',
  'Football.png': 'football.png',
  'Handball.png': 'handball.png',
  'High Jump.png': 'high_jump.png',
  'Hockey.png': 'hockey.png',
  'Javelin Throw.png': 'javelin_throw.png',
  'Kabaddi.png': 'kabaddi.png',
  'karathe.png': 'karate.png',
  'kho kho.png': 'kho_kho.png',
  'kickboxing.png': 'kickboxing.png',
  'kusthi.png': 'wrestling.png',
  'Long Jump.png': 'long_jump.png',
  'Marathon.png': 'marathon.png',
  'Relay.png': 'relay.png',
  'Running.png': 'running.png',
  'Shot Put.png': 'shot_put.png',
  'silambam.png': 'silambam.png',
  'tennis.png': 'tennis.png',
  'throw ball.png': 'throwball.png',
  'Triple Jump.png': 'triple_jump.png',
  'volley ball.png': 'volleyball.png'
};

const files = fs.readdirSync(srcDir);

console.log(`Found ${files.length} files in source directory.`);

files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const targetName = nameMap[file] || file.toLowerCase().replace(/\s+/g, '_');
  
  const target1 = path.join(destDir1, targetName);
  const target2 = path.join(destDir2, targetName);

  fs.copyFileSync(srcFile, target1);
  fs.copyFileSync(srcFile, target2);

  console.log(`Copied: ${file} -> ${targetName}`);
});

console.log('✅ All photos successfully copied and mapped to public sports directory!');
