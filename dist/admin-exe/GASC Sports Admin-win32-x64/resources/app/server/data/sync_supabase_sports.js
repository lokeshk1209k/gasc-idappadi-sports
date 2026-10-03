const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { supabase } = require('../utils/supabaseHelper');
const fs = require('fs');

const localDbPath = path.join(__dirname, 'local_db.json');

async function syncSports() {
  console.log('🔄 Syncing 25 sports to Supabase Cloud & Local DB...');

  if (!fs.existsSync(localDbPath)) {
    console.error('local_db.json not found');
    return;
  }

  const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  const sports = localDb.sports;

  const excludedSlugs = ['decathlon', 'hammer_throw', 'heptathlon', 'pole_vault', 'race_walking'];

  // Delete excluded sports from Supabase Cloud table if present
  for (const slug of excludedSlugs) {
    await supabase.from('sports').delete().ilike('id', `%${slug}%`);
    await supabase.from('sports').delete().ilike('name', `%${slug.replace(/_/g, ' ')}%`);
  }

  // Upsert all 25 clean sports into Supabase
  for (const s of sports) {
    const slug = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const imgUrl = `/images/sports/${slug}.png`;

    const row = {
      id: s.id,
      name: s.name,
      category: s.category,
      indoor_outdoor: s.indoor_outdoor || 'Outdoor',
      icon: s.icon || 'bi-trophy',
      image: imgUrl,
      description: s.description || '',
      status: s.status || 'Active'
    };

    await supabase.from('sports').upsert(row);
  }

  console.log('✅ Supabase Cloud table "sports" synced successfully with 25 clean sports!');
}

syncSports().catch(err => console.error('Sync Error:', err.message));
