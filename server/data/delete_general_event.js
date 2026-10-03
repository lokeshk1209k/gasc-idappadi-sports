const { supabase } = require('../utils/supabaseHelper');
const { storeInstance } = require('./localStore');

async function removeGeneralEvents() {
  console.log('Deleting General Event from Supabase...');
  try {
    const { data, error } = await supabase.from('competitions').delete().ilike('name', '%General Event%');
    console.log('Supabase delete result:', { data, error });
  } catch (e) {
    console.log('Supabase error:', e.message);
  }

  console.log('Deleting General Event from LocalStore...');
  const table = storeInstance.getTable('competitions');
  const initialCount = table.length;
  const filtered = table.filter(c => !((c.name || '').toLowerCase().includes('general event')));
  table.length = 0;
  table.push(...filtered);
  storeInstance.save();
  console.log('LocalStore competitions: was ' + initialCount + ', now ' + table.length);

  console.log('Current competitions:');
  table.forEach(c => console.log(' ->', c.id, '|', c.tournament_name || c.tournamentName, '|', c.name, '|', c.sport_name));
}

removeGeneralEvents();
