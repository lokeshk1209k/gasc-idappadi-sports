const { isSupabaseConfigured, supabase } = require('../config/supabase');

async function updateSupabaseCategories() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping cloud sync.');
    return;
  }
  
  console.log('Syncing categories to Supabase...');
  try {
    const { data: sports, error } = await supabase.from('sports').select('*');
    if (error) {
      console.error('Supabase fetch error:', error);
      return;
    }
    
    for (const sport of sports) {
      const name = (sport.name || '').toLowerCase().trim();
      const rawCat = (sport.category || '').toLowerCase().trim();
      
      let newCat = 'Outdoor Games';
      let indoorOutdoor = 'Outdoor';
      
      if (name === 'chess' || name === 'carrom' || name.includes('table tennis') || name === 'tabletennis') {
        newCat = 'Indoor Games';
        indoorOutdoor = 'Indoor';
      } else if (
        rawCat.includes('athletics') ||
        rawCat.includes('track') ||
        rawCat.includes('field') ||
        name.includes('running') ||
        name.includes('relay') ||
        name.includes('marathon') ||
        name.includes('jump') ||
        name.includes('shot put') ||
        name.includes('discus') ||
        name.includes('javelin') ||
        name.includes('hammer') ||
        name.includes('pole vault') ||
        name.includes('decathlon') ||
        name.includes('heptathlon') ||
        name.includes('walking')
      ) {
        newCat = 'Athletics';
        indoorOutdoor = 'Outdoor';
      }
      
      await supabase
        .from('sports')
        .update({ category: newCat, indoor_outdoor: indoorOutdoor })
        .eq('id', sport.id);
    }
    
    console.log('✅ Supabase sports updated successfully!');
  } catch (err) {
    console.error('Error syncing Supabase:', err);
  }
}

updateSupabaseCategories();
