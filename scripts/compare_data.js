const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: comps, error } = await sb.from('competitions').select('id, name, tournament_name, sport_name');
  console.log('Supabase Competitions count:', (comps || []).length);
  if (error) console.log('Supabase Error:', error);
  if (comps && comps.length > 0) {
    console.log('Sample Supabase comps:', comps.slice(0, 3));
  }

  const { data: tours } = await sb.from('tournaments').select('id, name');
  console.log('Supabase Tournaments count:', (tours || []).length);
  if (tours && tours.length > 0) {
    console.log('Sample Supabase tours:', tours.slice(0, 3));
  }

  const localDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/local_db.json'), 'utf8'));
  console.log('\nlocal_db.json competitions count:', (localDb.competitions || []).length);
  console.log('local_db.json tournaments count:', (localDb.tournaments || []).length);

  // Check tournament names in local_db
  const localTourNames = [...new Set((localDb.competitions || []).map(c => c.tournament_name || c.tournamentName))];
  console.log('Tournaments in local_db.json:', localTourNames);

  const sbTourNames = [...new Set((comps || []).map(c => c.tournament_name || c.tournamentName))];
  console.log('Tournaments in Supabase:', sbTourNames);
})();
