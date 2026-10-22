const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Get Supabase columns
  const { data: sample, error: sErr } = await sb.from('competitions').select('*').limit(1);
  if (sErr) {
    console.error('Error fetching sample:', sErr);
    return;
  }
  const validColumns = new Set(Object.keys(sample[0] || {}));
  console.log('Valid Supabase columns count:', validColumns.size);
  console.log('Columns:', Array.from(validColumns));

  // 2. Read local competitions & tournaments
  const localDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/local_db.json'), 'utf8'));
  const comps = localDb.competitions || [];
  const tours = localDb.tournaments || [];

  console.log(`\nLocal competitions to sync: ${comps.length}`);
  console.log(`Local tournaments to sync: ${tours.length}`);

  // 3. Sync tournaments first
  let tourSuccess = 0;
  for (const t of tours) {
    try {
      const payload = {
        id: t.id,
        name: t.name || t.tournament_name,
        tournament_name: t.tournament_name || t.name,
        description: t.description || '',
        start_date: t.date || t.start_date || new Date().toISOString(),
        end_date: t.registration_end || t.end_date || new Date().toISOString(),
        venue: t.venue || 'GASC Idappadi Sports Ground',
        status: t.status || 'Registration Open',
        banner_image: t.banner_image || '/images/sports/tournament.png',
        created_at: t.created_at || new Date().toISOString()
      };
      const { error } = await sb.from('tournaments').upsert(payload, { onConflict: 'id' });
      if (!error) tourSuccess++;
      else console.warn(`Tour ${t.id} error:`, error.message);
    } catch (e) {
      console.warn(`Tour ${t.id} exception:`, e.message);
    }
  }
  console.log(`✅ Synced ${tourSuccess}/${tours.length} tournaments to Supabase`);

  // 4. Sync competitions
  let compSuccess = 0;
  for (const c of comps) {
    try {
      // Filter only columns that exist in Supabase
      const payload = {};
      for (const [k, v] of Object.entries(c)) {
        if (validColumns.has(k)) {
          payload[k] = v;
        }
      }
      // Ensure required fields
      if (!payload.id) payload.id = c.id;
      if (!payload.name) payload.name = c.name;
      if (!payload.sport_id) payload.sport_id = c.sport_id || 'sp_general';
      if (!payload.sport_name) payload.sport_name = c.sport_name || 'General';
      if (!payload.date) payload.date = new Date().toISOString();
      if (!payload.registration_end) payload.registration_end = new Date().toISOString();

      const { error } = await sb.from('competitions').upsert(payload, { onConflict: 'id' });
      if (!error) compSuccess++;
      else console.warn(`Comp ${c.id} (${c.name}) error:`, error.message);
    } catch (e) {
      console.warn(`Comp ${c.id} exception:`, e.message);
    }
  }
  console.log(`✅ Synced ${compSuccess}/${comps.length} competitions to Supabase!`);
})();
