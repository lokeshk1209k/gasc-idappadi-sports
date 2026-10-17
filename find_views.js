const fs = require('fs');
const content = fs.readFileSync('client/public/admin-dashboard.html', 'utf8');
content.split('\n').forEach((l, i) => {
  if (l.includes('id="view-')) {
    console.log(i + 1, l.trim());
  }
});
