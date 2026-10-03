const fs = require('fs');
const path = require('path');

const userDir = 'C:\\Users\\ELCOT\\.gemini\\antigravity-ide\\brain\\3c75f128-f237-441e-a405-973e8ee3b68a\\.user_uploaded';
const rootProjectDir = path.resolve(__dirname, '../..');
const picturesDir = 'C:\\Users\\ELCOT\\Pictures\\website photo';

const destDirs = [
  picturesDir,
  path.join(rootProjectDir, 'client/public/images/sports'),
  path.join(rootProjectDir, 'student-client/public/images/sports'),
  path.join(rootProjectDir, 'student-client/dist/images/sports'),
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\client\\public\\images\\sports',
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\student-client\\dist\\images\\sports'
];

destDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const newPhotos = [
  { file: 'media_1790428576157.jpg', sport: 'cricket', aliases: ['cricket.png', 'Cricket.png'] },
  { file: 'media_1790428584777.jpg', sport: 'boxing', aliases: ['boxing.png', 'Boxing.png'] },
  { file: 'media_1790428605087.jpg', sport: 'kabaddi', aliases: ['kabaddi.png', 'Kabaddi.png'] },
  { file: 'media_1790428677059.jpg', sport: 'chess', aliases: ['chess.png', 'chess_2.png', 'chess (2).png'] },
  { file: 'media_1790429231335.jpg', sport: 'badminton', aliases: ['badminton.png', 'Badminton.png'] }
];

console.log('📸 Importing new user photos for Cricket, Boxing, Kabaddi, and Chess...');

newPhotos.forEach(item => {
  const srcPath = path.join(userDir, item.file);
  if (fs.existsSync(srcPath)) {
    item.aliases.forEach(alias => {
      destDirs.forEach(destDir => {
        const destPath = path.join(destDir, alias);
        fs.copyFileSync(srcPath, destPath);
      });
    });
    console.log(`  ✔️ Successfully updated ${item.sport} photo with new image: [${item.aliases.join(', ')}]`);
  } else {
    console.error(`  ❌ Source photo missing for ${item.sport}: ${srcPath}`);
  }
});

console.log('🎉 All 4 sports photos updated successfully!');
