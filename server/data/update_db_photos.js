const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'local_db.json');

if (!fs.existsSync(dbPath)) {
  console.error('db not found');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Helper to get image path for sport name
function getSportImagePath(sportName = '') {
  const name = sportName.toLowerCase();
  if (name.includes('carrom')) return '/images/sports/carrom.png';
  if (name.includes('chess')) return '/images/sports/chess.png';
  if (name.includes('table tennis')) return '/images/sports/table_tennis.png';
  if (name.includes('badminton')) return '/images/sports/badminton.png';
  if (name.includes('basketball')) return '/images/sports/basketball.png';
  if (name.includes('volleyball')) return '/images/sports/volleyball.png';
  if (name.includes('boxing')) return '/images/sports/boxing.png';
  if (name.includes('cricket')) return '/images/sports/cricket.png';
  if (name.includes('football')) return '/images/sports/football.png';
  if (name.includes('kabaddi')) return '/images/sports/kabaddi.png';
  if (name.includes('hockey')) return '/images/sports/hockey.png';
  if (name.includes('kho kho')) return '/images/sports/kho_kho.png';
  if (name.includes('tennis')) return '/images/sports/tennis.png';
  if (name.includes('handball')) return '/images/sports/handball.png';
  if (name.includes('throwball')) return '/images/sports/throwball.png';
  if (name.includes('discus')) return '/images/sports/discus_throw.png';
  if (name.includes('javelin')) return '/images/sports/javelin_throw.png';
  if (name.includes('shot put')) return '/images/sports/shot_put.png';
  if (name.includes('high jump')) return '/images/sports/high_jump.png';
  if (name.includes('long jump')) return '/images/sports/long_jump.png';
  if (name.includes('triple jump')) return '/images/sports/triple_jump.png';
  if (name.includes('marathon')) return '/images/sports/marathon.png';
  if (name.includes('relay')) return '/images/sports/relay.png';
  if (name.includes('running')) return '/images/sports/running.png';
  if (name.includes('karate')) return '/images/sports/karate.png';
  if (name.includes('kickboxing')) return '/images/sports/kickboxing.png';
  if (name.includes('silambam')) return '/images/sports/silambam.png';

  const slug = name.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `/images/sports/${slug}.png`;
}

// 1. Update sports array images
if (Array.isArray(db.sports)) {
  db.sports.forEach(sport => {
    sport.image = getSportImagePath(sport.name);
  });
}

// 2. Update competitions array images
if (Array.isArray(db.competitions)) {
  db.competitions.forEach(comp => {
    const sName = comp.sport_name || (typeof comp.sport_id === 'object' ? comp.sport_id.name : comp.name) || '';
    comp.banner_image = getSportImagePath(sName);
  });
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Successfully updated local_db.json with official sports photos!');
