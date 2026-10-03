const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

const targetDirs = [
  path.join(rootDir, 'client/public/images/sports'),
  path.join(rootDir, 'student-client/public/images/sports'),
  path.join(rootDir, 'student-client/dist/images/sports'),
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\\app\\client\\public\\images\\sports',
  'C:\\Users\\ELCOT\\Downloads\\GASC Sports Admin Portal\\resources\app\\student-client\\dist\\images\\sports'
];

// List of redundant duplicate files to delete
const duplicateFiles = [
  'chess (2).png',
  'chess_2.png',
  'discus.png',
  'javelin.png',
  'karathe.png',
  'khokho.png',
  'kusthi.png',
  'shotput.png',
  'throw_ball.png',
  'volley_ball.png',
  'basketball.jpg',
  'boxing.jpg',
  'chess.jpg',
  'cricket.jpg',
  'football.jpg',
  'kabaddi.jpg',
  'running.jpg',
  'tournament.jpg',
  'volleyball.jpg',
  'badminton.jpg'
];

let totalDeleted = 0;

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    duplicateFiles.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        totalDeleted++;
      }
    });
  }
});

console.log(`🧹 Successfully cleaned up ${totalDeleted} duplicate image files across all directories!`);
