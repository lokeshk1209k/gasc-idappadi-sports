const fs = require('fs');

const html = fs.readFileSync('client/public/admin-dashboard.html', 'utf8');
const lines = html.split(/\r?\n/);

console.log('=== MODALS IN ADMIN DASHBOARD ===');
lines.forEach((line, i) => {
  if (line.includes('class="modal') || line.includes('class=\'modal\'')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('<form onsubmit="') || line.includes('<form id="')) {
    console.log(`  Form Line ${i + 1}: ${line.trim()}`);
  }
});
