const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'local_db.json');

const newSports = [
  // --- 🏠 INDOOR GAMES ---
  { id: 'sp_chess', name: 'Chess', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-suit-spade', image: '/images/sports/chess.png', description: 'Strategic mind sports club, FIDE rated tournament coaching.', status: 'Active' },
  { id: 'sp_carrom', name: 'Carrom', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-grid-3x3', image: '/images/sports/carrom.png', description: 'Standard board carrom tournament for singles and doubles.', status: 'Active' },
  { id: 'sp_table_tennis', name: 'Table Tennis', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-circle', image: '/images/sports/table_tennis.png', description: 'Fast-paced indoor table tennis coaching and competitions.', status: 'Active' },
  { id: 'sp_badminton', name: 'Badminton', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-lightning-charge', image: '/images/sports/badminton.png', description: 'Indoor wooden court badminton training for singles and doubles.', status: 'Active' },
  { id: 'sp_basketball', name: 'Basketball', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-dribbble', image: '/images/sports/basketball.png', description: 'Standard indoor/outdoor basketball court training and tournaments.', status: 'Active' },
  { id: 'sp_volleyball_indoor', name: 'Volleyball', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-circle', image: '/images/sports/volleyball.png', description: 'Indoor court volleyball matches and coaching.', status: 'Active' },
  { id: 'sp_boxing', name: 'Boxing', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-shield', image: '/images/sports/boxing.png', description: 'Amateur boxing training, ring sparring, and weight-category championships.', status: 'Active' },

  // --- 🌳 OUTDOOR GAMES ---
  { id: 'sp_cricket', name: 'Cricket', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-trophy', image: '/images/sports/cricket.png', description: 'Men & Women collegiate cricket with standard turf and matting wickets.', status: 'Active' },
  { id: 'sp_football', name: 'Football', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-dribbble', image: '/images/sports/football.png', description: 'Standard 11-a-side football field, tactical drills, and inter-collegiate tournaments.', status: 'Active' },
  { id: 'sp_kabaddi', name: 'Kabaddi', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-shield-shaded', image: '/images/sports/kabaddi.png', description: 'Traditional mat and mud Kabaddi team, state zonal champions.', status: 'Active' },
  { id: 'sp_hockey', name: 'Hockey', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-trophy', image: '/images/sports/hockey.png', description: 'Field hockey training, team strategy, and zonal collegiate meets.', status: 'Active' },
  { id: 'sp_kho_kho', name: 'Kho Kho', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-people', image: '/images/sports/kho_kho.png', description: 'Traditional Indian tag sport requiring high agility and speed.', status: 'Active' },
  { id: 'sp_tennis', name: 'Tennis', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/tennis.png', description: 'Lawn Tennis court training for singles and doubles.', status: 'Active' },
  { id: 'sp_handball', name: 'Handball', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-dribbble', image: '/images/sports/handball.png', description: 'High-speed team handball matches on regulation outdoor courts.', status: 'Active' },
  { id: 'sp_throwball', name: 'Throwball', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/throwball.png', description: 'Popular women and men non-contact net throwball sport.', status: 'Active' },

  // --- 🏃 ATHLETICS ---
  // Track Events
  { id: 'sp_running', name: 'Running', category: 'Athletics', subcategory: 'Track Events', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/running.png', description: 'Sprint and distance track running (100m, 200m, 400m, 800m, 1500m).', status: 'Active' },
  { id: 'sp_relay', name: 'Relay', category: 'Athletics', subcategory: 'Track Events', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/relay.png', description: 'Team relay track races (4x100m, 4x400m) with baton passes.', status: 'Active' },
  // Field Events — Jumps
  { id: 'sp_long_jump', name: 'Long Jump', category: 'Athletics', subcategory: 'Field Events — Jumps', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/long_jump.png', description: 'Horizontal jump event combining speed and explosive power.', status: 'Active' },
  { id: 'sp_high_jump', name: 'High Jump', category: 'Athletics', subcategory: 'Field Events — Jumps', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/high_jump.png', description: 'Vertical jump event over an adjustable horizontal bar.', status: 'Active' },
  { id: 'sp_triple_jump', name: 'Triple Jump', category: 'Athletics', subcategory: 'Field Events — Jumps', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/triple_jump.png', description: 'Hop, step, and jump track and field event.', status: 'Active' },
  // Field Events — Throws
  { id: 'sp_shot_put', name: 'Shot Put', category: 'Athletics', subcategory: 'Field Events — Throws', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/shot_put.png', description: 'Heavy spherical metal ball throwing event.', status: 'Active' },
  { id: 'sp_discus_throw', name: 'Discus Throw', category: 'Athletics', subcategory: 'Field Events — Throws', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/discus_throw.png', description: 'Heavy disc throwing event for maximum distance.', status: 'Active' },
  { id: 'sp_javelin_throw', name: 'Javelin Throw', category: 'Athletics', subcategory: 'Field Events — Throws', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/javelin_throw.png', description: 'Spear-like javelin throwing event.', status: 'Active' },
  // Road / Distance Events
  { id: 'sp_marathon', name: 'Marathon', category: 'Athletics', subcategory: 'Road / Distance Events', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/marathon.png', description: '42.195 km long-distance endurance road running race.', status: 'Active' },
  { id: 'sp_half_marathon', name: 'Half Marathon', category: 'Athletics', subcategory: 'Road / Distance Events', indoor_outdoor: 'Outdoor', icon: 'bi-stopwatch', image: '/images/sports/half_marathon.png', description: '21.097 km road running endurance race.', status: 'Active' }
];

if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  db.sports = newSports;
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ Successfully updated local_db.json with 25 categorized sports disciplines!');
} else {
  console.log('DB file not found');
}

