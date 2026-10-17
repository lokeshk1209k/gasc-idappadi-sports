const fs = require('fs');
const html = fs.readFileSync('client/public/admin-dashboard.html', 'utf8');
const lines = html.split('\n');
const found = [];
lines.forEach((l, i) => {
  if (l.includes('background:#fff') || l.includes('background: #fff') || l.includes('background:white') || l.includes('background: white')) {
    found.push(`Line ${i+1}: ${l.trim().substring(0, 100)}`);
  }
});
console.log('Matches found:', found.length);
found.forEach(f => console.log(f));
