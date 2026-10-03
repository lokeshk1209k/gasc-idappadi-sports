const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'local_db.json');

if (fs.existsSync(DB_FILE)) {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (Array.isArray(db.sports)) {
    db.sports = db.sports.map(sport => {
      const name = (sport.name || '').toLowerCase().trim();
      const rawCat = (sport.category || '').toLowerCase().trim();
      
      // Only Chess, Carrom, Table Tennis are Indoor
      if (name === 'chess' || name === 'carrom' || name.includes('table tennis') || name === 'tabletennis') {
        return {
          ...sport,
          category: 'Indoor Games',
          indoor_outdoor: 'Indoor'
        };
      }
      
      // Athletics
      if (
        rawCat.includes('athletics') ||
        rawCat.includes('track') ||
        rawCat.includes('field') ||
        name.includes('running') ||
        name.includes('relay') ||
        name.includes('marathon') ||
        name.includes('jump') ||
        name.includes('shot put') ||
        name.includes('shotput') ||
        name.includes('discus') ||
        name.includes('javelin') ||
        name.includes('hammer') ||
        name.includes('pole vault') ||
        name.includes('decathlon') ||
        name.includes('heptathlon') ||
        name.includes('walking')
      ) {
        return {
          ...sport,
          category: 'Athletics',
          indoor_outdoor: 'Outdoor'
        };
      }
      
      // All other sports are Outdoor
      return {
        ...sport,
        category: 'Outdoor Games',
        indoor_outdoor: 'Outdoor'
      };
    });
    
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ local_db.json updated successfully!');
    console.log('Indoor count:', db.sports.filter(s => s.category === 'Indoor Games').length);
    console.log('Outdoor count:', db.sports.filter(s => s.category === 'Outdoor Games').length);
    console.log('Athletics count:', db.sports.filter(s => s.category === 'Athletics').length);
  }
}
