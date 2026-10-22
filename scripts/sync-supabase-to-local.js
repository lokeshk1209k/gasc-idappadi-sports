const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const localDbPath = path.join(__dirname, '../server/data/local_db.json');
const publicCompsPath = path.join(__dirname, '../client/public/competitions.json');
const distCompsPath = path.join(__dirname, '../dist/competitions.json');

async function syncAll() {
  console.log('🔄 Fetching latest competitions and tournaments from Supabase...');
  
  const { data: supaComps, error: compErr } = await supabase.from('competitions').select('*');
  if (compErr) console.warn('Supabase comps error:', compErr);

  const { data: supaTournaments, error: tourErr } = await supabase.from('tournaments').select('*');
  if (tourErr) console.warn('Supabase tournaments error:', tourErr);

  let localDb = {};
  if (fs.existsSync(localDbPath)) {
    try {
      localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    } catch (e) {
      localDb = {};
    }
  }

  localDb.competitions = localDb.competitions || [];
  localDb.tournaments = localDb.tournaments || [];

  // Merge tournaments
  if (Array.isArray(supaTournaments)) {
    supaTournaments.forEach(st => {
      const existingIdx = localDb.tournaments.findIndex(t => t.id === st.id || (t.name && t.name.toLowerCase() === (st.name || '').toLowerCase()));
      if (existingIdx >= 0) {
        localDb.tournaments[existingIdx] = { ...localDb.tournaments[existingIdx], ...st };
      } else {
        localDb.tournaments.unshift(st);
      }
    });
  }

  // Merge competitions
  if (Array.isArray(supaComps)) {
    supaComps.forEach(sc => {
      const existingIdx = localDb.competitions.findIndex(c => c.id === sc.id);
      if (existingIdx >= 0) {
        localDb.competitions[existingIdx] = { ...localDb.competitions[existingIdx], ...sc };
      } else {
        localDb.competitions.unshift(sc);
      }
    });
  }

  // Save updated local_db.json
  fs.writeFileSync(localDbPath, JSON.stringify(localDb, null, 2));
  console.log(`✅ local_db.json updated! (Tournaments: ${localDb.tournaments.length}, Competitions: ${localDb.competitions.length})`);

  // Export to competitions.json
  const competitionsPayload = JSON.stringify({
    success: true,
    count: localDb.competitions.length,
    competitions: localDb.competitions
  }, null, 2);

  fs.writeFileSync(publicCompsPath, competitionsPayload);
  if (fs.existsSync(path.dirname(distCompsPath))) {
    fs.writeFileSync(distCompsPath, competitionsPayload);
  }
  console.log(`✅ competitions.json updated in client/public and dist!`);
}

syncAll().then(() => {
  console.log('🎉 Full Sync Completed Successfully!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
