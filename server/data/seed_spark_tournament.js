const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'local_db.json');

if (!fs.existsSync(dbPath)) {
  console.error('db not found');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// SPARK 2026 Tournament Competitions for various sports
const sparkCompetitions = [
  {
    id: 'comp_spark_cricket',
    name: 'SPARK 2026 - Cricket Championship',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_cricket',
    sport_name: 'Cricket',
    type: 'Inter-College',
    level: 'College Level',
    venue: 'GASC Idappadi Main Sports Ground',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '08:30 AM',
    end_time: '05:00 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Idappadi Sports Board & Physical Education Dept',
    eligibility: 'All regular UG & PG students with valid college ID',
    max_participants: 64,
    current_registrations: 12,
    description: '11-a-side knockout cricket tournament for SPARK 2026 rolling trophy.',
    banner_image: '/images/sports/cricket.png',
    status: 'Registration Open'
  },
  {
    id: 'comp_spark_volleyball',
    name: 'SPARK 2026 - Volleyball Tournament',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_volleyball_indoor',
    sport_name: 'Volleyball',
    type: 'Inter-Department',
    level: 'College Level',
    venue: 'GASC Idappadi Outdoor Volleyball Court',
    date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '09:00 AM',
    end_time: '04:30 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Idappadi Sports Board',
    eligibility: 'Department teams (UG & PG)',
    max_participants: 48,
    current_registrations: 18,
    description: '6-player standard court volleyball matches for SPARK 2026 championship.',
    banner_image: '/images/sports/volleyball.png',
    status: 'Registration Open'
  },
  {
    id: 'comp_spark_carrom',
    name: 'SPARK 2026 - Carrom Championship',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_carrom',
    sport_name: 'Carrom',
    type: 'Inter-Department',
    level: 'College Level',
    venue: 'GASC Indoor Auditorium',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '09:30 AM',
    end_time: '04:00 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Idappadi Indoor Games Club',
    eligibility: 'All enrolled UG and PG students (Singles & Doubles)',
    max_participants: 32,
    current_registrations: 8,
    description: 'Board carrom tournament with standard Synco boards.',
    banner_image: '/images/sports/carrom.png',
    status: 'Registration Open'
  },
  {
    id: 'comp_spark_chess',
    name: 'SPARK 2026 - Chess Masters',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_chess',
    sport_name: 'Chess',
    type: 'Individual',
    level: 'College Level',
    venue: 'GASC College Library Seminar Hall',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '10:00 AM',
    end_time: '03:30 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Mind Sports Club',
    eligibility: 'All students',
    max_participants: 40,
    current_registrations: 14,
    description: 'Swiss-system 5-round classical chess tournament with DGT digital clocks.',
    banner_image: '/images/sports/chess.png',
    status: 'Registration Open'
  },
  {
    id: 'comp_spark_kabaddi',
    name: 'SPARK 2026 - Kabaddi Challenge',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_kabaddi',
    sport_name: 'Kabaddi',
    type: 'Inter-Department',
    level: 'College Level',
    venue: 'GASC Idappadi Kabaddi Mat Ground',
    date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '08:30 AM',
    end_time: '05:00 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Physical Education Department',
    eligibility: '7-player squad per department',
    max_participants: 56,
    current_registrations: 21,
    description: 'High-energy pro-style mat Kabaddi competition.',
    banner_image: '/images/sports/kabaddi.png',
    status: 'Registration Open'
  },
  {
    id: 'comp_spark_running',
    name: 'SPARK 2026 - 100m & 400m Sprint Track Event',
    tournament_name: 'SPARK 2026 Annual Sports Fest',
    sport_id: 'sp_running',
    sport_name: 'Running',
    type: 'Athletics',
    level: 'College Level',
    venue: 'GASC Idappadi 400m Track',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: '07:30 AM',
    end_time: '12:00 PM',
    registration_start: new Date().toISOString(),
    registration_end: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: 'GASC Athletics Club',
    eligibility: 'Men & Women sprinters',
    max_participants: 50,
    current_registrations: 16,
    description: 'Fastest runner of GASC Idappadi title match.',
    banner_image: '/images/sports/running.png',
    status: 'Registration Open'
  }
];

// Add/Merge with existing competitions
const existingIds = new Set((db.competitions || []).map(c => c.id));
const filteredSpark = sparkCompetitions.filter(c => !existingIds.has(c.id));

db.competitions = [...filteredSpark, ...(db.competitions || [])];

// Also update tournament_name for existing competitions if missing
db.competitions.forEach(c => {
  if (!c.tournament_name) {
    c.tournament_name = c.name.includes('SPARK') ? 'SPARK 2026 Annual Sports Fest' : 'College Sports Meet 2026';
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`✅ Successfully added ${filteredSpark.length} sports competitions under SPARK 2026 Tournament!`);
