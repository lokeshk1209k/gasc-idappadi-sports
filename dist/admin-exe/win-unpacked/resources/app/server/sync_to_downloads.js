const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..');
const dest = 'C:/Users/ELCOT/Downloads/GASC Sports Admin/resources/app';

if (fs.existsSync(dest)) {
  console.log('Syncing updated files to:', dest);
  fs.cpSync(path.join(src, 'electron'), path.join(dest, 'electron'), { recursive: true });
  fs.cpSync(path.join(src, 'client'), path.join(dest, 'client'), { recursive: true });
  fs.cpSync(path.join(src, 'server'), path.join(dest, 'server'), { recursive: true });
  fs.copyFileSync(path.join(src, 'package.json'), path.join(dest, 'package.json'));
  if (fs.existsSync(path.join(src, '.env'))) {
    fs.copyFileSync(path.join(src, '.env'), path.join(dest, '.env'));
  }
  console.log('✅ Successfully synced all files to Downloads folder!');
} else {
  console.log('Downloads app folder does not exist at:', dest);
}
