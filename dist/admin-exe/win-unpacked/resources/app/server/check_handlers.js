const fs = require('fs');

const adminJs = fs.readFileSync('client/public/js/admin.js', 'utf8');

const handlers = [
  'submitCreateSport',
  'submitCreateEquipment',
  'submitIssueEquipment',
  'submitReturnEquipment',
  'submitCreateCompetition',
  'submitCreateTeam',
  'submitCreateAchievement',
  'submitCreateNotification',
  'submitCreateGallery',
  'submitManualStudentAdd',
  'submitEditRosterStudent',
  'submitAddExternalComp',
  'submitAddSportsNews'
];

console.log('=== CHECKING HANDLERS IN admin.js ===');
handlers.forEach(h => {
  const exists = adminJs.includes(`function ${h}`) || adminJs.includes(`${h} =`);
  console.log(`${h}: ${exists ? 'EXISTS' : '❌ MISSING'}`);
});
