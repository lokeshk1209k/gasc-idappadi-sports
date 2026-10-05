const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Central local DB file path
const LOCAL_FALLBACK_FILE = path.join(__dirname, 'local_db.json');
const DB_FILE = LOCAL_FALLBACK_FILE;


function getInitialData() {
  const adminHashed = bcrypt.hashSync('admin123', 10);
  const studentHashed = bcrypt.hashSync('student123', 10);

  const sports = [
    // --- 🏠 INDOOR GAMES (Only Chess, Carrom, Table Tennis) ---
    { id: 'sp_chess', name: 'Chess', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-suit-spade', image: '/images/sports/chess.png', description: 'Strategic mind sports club, FIDE rated tournament coaching.', status: 'Active' },
    { id: 'sp_carrom', name: 'Carrom', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-grid-3x3', image: '/images/sports/carrom.png', description: 'Standard board carrom tournament for singles and doubles.', status: 'Active' },
    { id: 'sp_table_tennis', name: 'Table Tennis', category: 'Indoor Games', indoor_outdoor: 'Indoor', icon: 'bi-circle', image: '/images/sports/table_tennis.png', description: 'Fast-paced indoor table tennis coaching and competitions.', status: 'Active' },

    // --- 🌳 OUTDOOR GAMES ---
    { id: 'sp_badminton', name: 'Badminton', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-lightning-charge', image: '/images/sports/badminton.png', description: 'Collegiate badminton court training with tournament shuttle & net standards.', status: 'Active' },
    { id: 'sp_basketball', name: 'Basketball', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-dribbble', image: '/images/sports/basketball.png', description: 'Standard regulation basketball court training and tournaments.', status: 'Active' },
    { id: 'sp_volleyball', name: 'Volleyball', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-circle', image: '/images/sports/volleyball.png', description: 'Outdoor court volleyball matches, spiking drills, and coaching.', status: 'Active' },
    { id: 'sp_boxing', name: 'Boxing', category: 'Outdoor Games', indoor_outdoor: 'Outdoor', icon: 'bi-shield', image: '/images/sports/boxing.png', description: 'Amateur boxing training, ring sparring, and weight-category championships.', status: 'Active' },
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

  const users = [
    {
      id: 'user_admin_01',
      name: 'Dr. R. ANITHA (Sports Incharge)',
      register_number: 'ADMIN-SPORTS',
      email: 'admin@gascidappadi.edu.in',
      password: adminHashed,
      role: 'admin',
      department: 'Physical Education',
      year: 'Faculty',
      section: 'A',
      gender: 'Female',
      mobile: '+91 94432 18765',
      profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'user_student_01',
      name: 'Arun Kumar S',
      register_number: '23UGCS101',
      email: 'arun.cs@gascidappadi.edu.in',
      password: studentHashed,
      role: 'student',
      department: 'Computer Science',
      year: 'II Year',
      section: 'A',
      gender: 'Male',
      mobile: '+91 98421 54321',
      profile_photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'user_student_02',
      name: 'Priya Dharshini R',
      register_number: '23UGCS102',
      email: 'priya.cs@gascidappadi.edu.in',
      password: studentHashed,
      role: 'student',
      department: 'Computer Science',
      year: 'II Year',
      section: 'A',
      gender: 'Female',
      mobile: '+91 97890 12345',
      profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'user_student_03',
      name: 'Karthik Raja M',
      register_number: '24UGCO205',
      email: 'karthik.com@gascidappadi.edu.in',
      password: studentHashed,
      role: 'student',
      department: 'Commerce',
      year: 'I Year',
      section: 'B',
      gender: 'Male',
      mobile: '+91 98943 67890',
      profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'user_student_04',
      name: 'Deepa Lakshmi K',
      register_number: '22UGMA310',
      email: 'deepa.maths@gascidappadi.edu.in',
      password: studentHashed,
      role: 'student',
      department: 'Mathematics',
      year: 'III Year',
      section: 'A',
      gender: 'Female',
      mobile: '+91 96554 32109',
      profile_photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    }
  ];

  const player_profiles = [
    {
      id: 'prof_01',
      user_id: 'user_student_01',
      primary_sport: 'sp_cricket_01',
      position: 'Captain & Top-Order Batsman',
      jersey_number: 7,
      playing_level: 'University Level',
      experience: '3 Years',
      matches_played: 14,
      matches_won: 11,
      matches_lost: 3,
      score_points: 486,
      awards_count: 3,
      competitions_participated: 5,
      bio: 'Passionate collegiate cricketer and top-order batsman representing GASC Idappadi in Periyar University zonal matches.',
      created_at: new Date().toISOString()
    },
    {
      id: 'prof_02',
      user_id: 'user_student_02',
      primary_sport: 'sp_athletics_06',
      position: '100m / 200m Sprinter',
      jersey_number: 12,
      playing_level: 'State Level',
      experience: '2 Years',
      matches_played: 8,
      matches_won: 7,
      matches_lost: 1,
      score_points: 15,
      awards_count: 2,
      competitions_participated: 4,
      bio: 'Gold medalist in Salem District 100m track events.',
      created_at: new Date().toISOString()
    },
    {
      id: 'prof_03',
      user_id: 'user_student_03',
      primary_sport: 'sp_volleyball_02',
      position: 'Attacker / Outside Hitter',
      jersey_number: 9,
      playing_level: 'District Level',
      experience: '1 Year',
      matches_played: 10,
      matches_won: 8,
      matches_lost: 2,
      score_points: 84,
      awards_count: 1,
      competitions_participated: 3,
      bio: 'Lead attacker for GASC Idappadi Volleyball team.',
      created_at: new Date().toISOString()
    }
  ];

  const college_student_roster = [
    { id: 'ros_01', register_number: '23UGCS101', name: 'Arun Kumar S', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', is_registered: true },
    { id: 'ros_02', register_number: '23UGCS102', name: 'Priya Dharshini R', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female', is_registered: true },
    { id: 'ros_03', register_number: '23UGCS103', name: 'Balaji K', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
    { id: 'ros_04', register_number: '23UGCS104', name: 'Divya M', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Female', is_registered: false },
    { id: 'ros_05', register_number: '23UGCS105', name: 'Elango V', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Male', is_registered: false },
    { id: 'ros_06', register_number: '24UGCO201', name: 'Gowtham N', department: 'Commerce', year: 'I Year', section: 'A', gender: 'Male', is_registered: false },
    { id: 'ros_07', register_number: '24UGCO205', name: 'Karthik Raja M', department: 'Commerce', year: 'I Year', section: 'B', gender: 'Male', is_registered: true },
    { id: 'ros_08', register_number: '22UGMA301', name: 'Abirami S', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', is_registered: false },
    { id: 'ros_09', register_number: '22UGMA310', name: 'Deepa Lakshmi K', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', is_registered: true },
    { id: 'ros_10', register_number: '23UGEN101', name: 'Dinesh Kumar P', department: 'English', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
    { id: 'ros_11', register_number: '23UGEN115', name: 'Vigneshwaran T', department: 'English', year: 'II Year', section: 'B', gender: 'Male', is_registered: false },
    { id: 'ros_12', register_number: '23UGTA101', name: 'Mani Maran C', department: 'Tamil', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
    { id: 'ros_13', register_number: '24UGPH101', name: 'Sanjay V', department: 'Physics', year: 'I Year', section: 'A', gender: 'Male', is_registered: false },
    { id: 'ros_14', register_number: '24UGCH101', name: 'Kavitha R', department: 'Chemistry', year: 'I Year', section: 'Female', is_registered: false },
    { id: 'ros_15', register_number: '23UGBA101', name: 'Naveen Prasath S', department: 'Business Administration', year: 'II Year', section: 'A', gender: 'Male', is_registered: false }
  ];

  const equipment = [
    {
      id: 'eq_01',
      name: 'English Willow Cricket Bats (SG / SS)',
      code: 'EQ-CRI-001',
      sport_id: 'sp_cricket_01',
      sport_name: 'Cricket',
      category: 'Bats & Rackets',
      total_quantity: 12,
      available_quantity: 10,
      issued_quantity: 2,
      damaged_quantity: 0,
      minimum_stock: 3,
      storage_location: 'Sports Store Room - Rack A1',
      condition: 'Good',
      status: 'In Stock',
      purchase_price: 3200.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'eq_02',
      name: 'Four-Piece Leather Cricket Balls',
      code: 'EQ-CRI-002',
      sport_id: 'sp_cricket_01',
      sport_name: 'Cricket',
      category: 'Balls & Shuttles',
      total_quantity: 40,
      available_quantity: 34,
      issued_quantity: 6,
      damaged_quantity: 0,
      minimum_stock: 10,
      storage_location: 'Sports Store Room - Box 3',
      condition: 'Excellent',
      status: 'In Stock',
      purchase_price: 650.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'eq_03',
      name: 'Cosco Super Volley Volleyballs',
      code: 'EQ-VOL-001',
      sport_id: 'sp_volleyball_02',
      sport_name: 'Volleyball',
      category: 'Balls & Shuttles',
      total_quantity: 15,
      available_quantity: 12,
      issued_quantity: 3,
      damaged_quantity: 0,
      minimum_stock: 4,
      storage_location: 'Sports Store Room - Rack B2',
      condition: 'Good',
      status: 'In Stock',
      purchase_price: 1100.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'eq_04',
      name: 'Nivia Premier League Footballs (Size 5)',
      code: 'EQ-FTB-001',
      sport_id: 'sp_football_03',
      sport_name: 'Football',
      category: 'Balls & Shuttles',
      total_quantity: 16,
      available_quantity: 14,
      issued_quantity: 2,
      damaged_quantity: 0,
      minimum_stock: 4,
      storage_location: 'Sports Store Room - Rack C1',
      condition: 'Good',
      status: 'In Stock',
      purchase_price: 1250.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'eq_05',
      name: 'Yonex Muscle Power Badminton Rackets',
      code: 'EQ-BDM-001',
      sport_id: 'sp_badminton_05',
      sport_name: 'Badminton',
      category: 'Bats & Rackets',
      total_quantity: 18,
      available_quantity: 14,
      issued_quantity: 4,
      damaged_quantity: 0,
      minimum_stock: 4,
      storage_location: 'Indoor Stadium - Locker 2',
      condition: 'Excellent',
      status: 'In Stock',
      purchase_price: 1800.00,
      created_at: new Date().toISOString()
    }
  ];

  const teams = [
    {
      id: 'team_01',
      captain_name: 'Arun Kumar S',
      sport_id: 'sp_cricket_01',
      sport_name: 'Cricket',
      department: 'Computer Science',
      year: 'II Year',
      phone: '+91 98421 54321',
      name: 'Cricket (Computer Science - II Year)',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'team_02',
      captain_name: 'Karthik Raja M',
      sport_id: 'sp_volleyball_02',
      sport_name: 'Volleyball',
      department: 'Commerce',
      year: 'I Year',
      phone: '+91 98943 67890',
      name: 'Volleyball (Commerce - I Year)',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    {
      id: 'team_03',
      captain_name: 'Vigneshwaran T',
      sport_id: 'sp_kabaddi_04',
      sport_name: 'Kabaddi',
      department: 'English',
      year: 'II Year',
      phone: '+91 95663 88990',
      name: 'Kabaddi (English - II Year)',
      status: 'Active',
      created_at: new Date().toISOString()
    }
  ];

  const competitions = [
    {
      id: 'comp_01',
      name: 'Periyar University Inter-Collegiate Cricket Tournament 2026',
      sport_id: 'sp_cricket_01',
      sport_name: 'Cricket',
      type: 'University',
      level: 'University',
      venue: 'GASC Idappadi Main Sports Ground',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      registration_start: new Date().toISOString(),
      registration_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      organizer: 'GASC Idappadi Physical Education Department',
      eligibility: 'All regular collegiate students with valid ID card',
      max_participants: 60,
      current_registrations: 14,
      status: 'Registration Open',
      description: 'Prestigious university zonal cricket championship tournament hosted at Idappadi campus.',
      created_at: new Date().toISOString()
    },
    {
      id: 'comp_02',
      name: 'Annual Inter-Department Volleyball Rolling Trophy 2026',
      sport_id: 'sp_volleyball_02',
      sport_name: 'Volleyball',
      type: 'Inter-Department',
      level: 'College',
      venue: 'College Volleyball Court',
      date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      registration_start: new Date().toISOString(),
      registration_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      organizer: 'GASC Idappadi Sports Board',
      eligibility: 'Department student teams (UG & PG)',
      max_participants: 48,
      current_registrations: 24,
      status: 'Registration Open',
      description: 'Annual inter-department rivalry for the championship shield.',
      created_at: new Date().toISOString()
    },
    {
      id: 'comp_03',
      name: 'Salem District College Athletics Meet 2026',
      sport_id: 'sp_athletics_06',
      sport_name: 'Athletics & Track',
      type: 'District',
      level: 'District',
      venue: 'Mahatma Gandhi Stadium, Salem',
      date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      registration_start: new Date().toISOString(),
      registration_end: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      organizer: 'Salem District Sports Authority (SDAT)',
      eligibility: 'Top college sprinters and track athletes',
      max_participants: 30,
      current_registrations: 8,
      status: 'Upcoming',
      description: 'District level track and field trials for State Games qualification.',
      created_at: new Date().toISOString()
    }
  ];

  const achievements = [
    {
      id: 'ach_01',
      student_id: 'user_student_01',
      student_name: 'Arun Kumar S',
      register_number: '23UGCS101',
      department: 'Computer Science',
      sport_name: 'Cricket',
      title: 'Man of the Match & Best Batsman',
      position: 'Winner / 1st Place',
      medal: 'Gold',
      year: '2025 - 2026',
      description: 'Scored match-winning 84 runs off 48 balls in Periyar University Zonal Quarter Finals.',
      is_featured: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'ach_02',
      student_id: 'user_student_02',
      student_name: 'Priya Dharshini R',
      register_number: '23UGCS102',
      department: 'Computer Science',
      sport_name: 'Athletics & Track',
      title: '100m Sprint Gold Medalist',
      position: 'Winner / 1st Place',
      medal: 'Gold',
      year: '2025 - 2026',
      description: 'Clocked 12.4s to secure 1st place in Salem District Collegiate Athletics.',
      is_featured: true,
      created_at: new Date().toISOString()
    }
  ];

  const notifications = [
    {
      id: 'notif_01',
      title: '🏏 Periyar University Cricket Team Selection Trials',
      message: 'All interested student players are instructed to report to College Main Ground on Wednesday at 06:30 AM in proper sports kit.',
      category: 'Team Selection',
      priority: 'High',
      target_type: 'All Students',
      sender: 'Dr. R. Anitha (Physical Directress)',
      read_by: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'notif_02',
      title: '📢 Morning Sports Practice Schedule Announcement',
      message: 'Morning conditioning and fitness drills will commence every Monday, Wednesday, and Friday from 06:30 AM to 08:00 AM.',
      category: 'Practice',
      priority: 'Normal',
      target_type: 'All Students',
      sender: 'Sports Department',
      read_by: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'notif_03',
      title: '🏐 Inter-Department Volleyball Tournament Registration Open',
      message: 'Department team captains can register their 6-player squad online via the portal before the 20th of this month.',
      category: 'Competition',
      priority: 'Normal',
      target_type: 'All Students',
      sender: 'Sports Incharge',
      read_by: [],
      created_at: new Date().toISOString()
    }
  ];

  const admin_settings = [
    {
      id: 'sett_01',
      college_name: 'Government Arts and Science College, Idappadi',
      department_name: 'Department of Physical Education & Sports',
      sports_incharge_name: 'Dr. R. ANITHA, M.P.Ed., M.Phil., Ph.D.',
      sports_incharge_role: 'Physical Directress & Sports Incharge',
      email: 'sports@gascidappadi.edu.in',
      phone: '+91 94432 18765',
      address: 'Government Arts and Science College, Idappadi, Salem District - 637101, Tamil Nadu',
      office_hours: '08:30 AM - 05:30 PM (Mon - Sat)',
      auto_notifications: true,
      created_at: new Date().toISOString()
    }
  ];

  const sport_rules = [
    { id: 'rule_cricket', sport_id: 'sp_cricket', sport_name: 'Cricket', competition_type: 'TEAM', required_players: 11, substitutes: 4 },
    { id: 'rule_football', sport_id: 'sp_football', sport_name: 'Football', competition_type: 'TEAM', required_players: 11, substitutes: 5 },
    { id: 'rule_kabaddi', sport_id: 'sp_kabaddi', sport_name: 'Kabaddi', competition_type: 'TEAM', required_players: 7, substitutes: 3 },
    { id: 'rule_volleyball', sport_id: 'sp_volleyball', sport_name: 'Volleyball', competition_type: 'TEAM', required_players: 6, substitutes: 4 },
    { id: 'rule_basketball', sport_id: 'sp_basketball', sport_name: 'Basketball', competition_type: 'TEAM', required_players: 5, substitutes: 5 },
    { id: 'rule_handball', sport_id: 'sp_handball', sport_name: 'Handball', competition_type: 'TEAM', required_players: 7, substitutes: 5 },
    { id: 'rule_kho_kho', sport_id: 'sp_kho_kho', sport_name: 'Kho Kho', competition_type: 'TEAM', required_players: 9, substitutes: 3 },
    { id: 'rule_throwball', sport_id: 'sp_throwball', sport_name: 'Throwball', competition_type: 'TEAM', required_players: 7, substitutes: 5 },
    { id: 'rule_hockey', sport_id: 'sp_hockey', sport_name: 'Hockey', competition_type: 'TEAM', required_players: 11, substitutes: 5 },
    { id: 'rule_badminton', sport_id: 'sp_badminton', sport_name: 'Badminton', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_chess', sport_id: 'sp_chess', sport_name: 'Chess', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_carrom', sport_id: 'sp_carrom', sport_name: 'Carrom', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_table_tennis', sport_id: 'sp_table_tennis', sport_name: 'Table Tennis', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_tennis', sport_id: 'sp_tennis', sport_name: 'Tennis', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_running', sport_id: 'sp_running', sport_name: 'Running', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_relay', sport_id: 'sp_relay', sport_name: 'Relay', competition_type: 'TEAM', required_players: 4, substitutes: 2 },
    { id: 'rule_long_jump', sport_id: 'sp_long_jump', sport_name: 'Long Jump', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_high_jump', sport_id: 'sp_high_jump', sport_name: 'High Jump', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 },
    { id: 'rule_shot_put', sport_id: 'sp_shot_put', sport_name: 'Shot Put', competition_type: 'INDIVIDUAL', required_players: 1, substitutes: 0 }
  ];

  return {
    users,
    sports,
    player_profiles,
    college_student_roster,
    equipment,
    equipment_transactions: [],
    competitions,
    competition_registrations: [],
    teams,
    team_members: [],
    sport_rules,
    achievements,
    notifications,
    admin_settings,
    gallery: [],
    practice_sessions: [],
    sports_news: [],
    external_competitions: []
  };
}

class LocalStore {
  constructor() {
    this.db = null;
    this.lastLoadedMtime = 0;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.db = JSON.parse(raw);
        if (!this.db.tournaments || !Array.isArray(this.db.tournaments)) {
          this.db.tournaments = [];
        }
        // Auto-seed existing tournaments from competitions if empty
        if (this.db.tournaments.length === 0 && Array.isArray(this.db.competitions)) {
          const map = new Map();
          for (const c of this.db.competitions) {
            const tName = (c.tournament_name || c.tournamentName || (c.name && c.name.includes('-') ? c.name.split('-')[0].trim() : c.name) || 'SPARK 2026 Annual Sports Fest').trim();
            if (!map.has(tName)) {
              map.set(tName, {
                id: `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                name: tName,
                tournament_name: tName,
                description: c.description || `Official ${tName} Tournament conducted by GASC Idappadi.`,
                venue: c.venue || 'GASC Idappadi Sports Ground',
                date: c.date || new Date().toISOString(),
                registration_end: c.registration_end || c.date || new Date().toISOString(),
                type: c.type || 'Inter-Department',
                status: c.status || 'Registration Open',
                banner_image: c.banner_image || '/images/sports/tournament.png',
                created_at: c.created_at || new Date().toISOString()
              });
            }
          }
          this.db.tournaments = Array.from(map.values());
          this.save();
        }
        console.log('📦 Local Store loaded from local_db.json successfully.');
      } else {
        this.db = getInitialData();
        this.save();
        console.log('🌱 Local Store initialized with standard GASC Idappadi dataset.');
      }
    } catch (e) {
      console.error('Error loading local db, resetting to initial dataset:', e.message);
      this.db = getInitialData();
      this.save();
    }
  }

  checkReload() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs > (this.lastLoadedMtime || 0)) {
          const raw = fs.readFileSync(DB_FILE, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.db = parsed;
            this.lastLoadedMtime = stat.mtimeMs;
            console.log('🔄 Local Store auto-reloaded from local_db.json (external update detected).');
          }
        }
      }
    } catch (e) {
      // Ignore transient read concurrency
    }
  }

  save() {
    try {
      const payload = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(DB_FILE, payload, 'utf8');
      try {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
      } catch (err) {}

      // On desktop environments, mirror to portable app if available
      if (!process.env.VERCEL && process.platform === 'win32') {
        const portableDir = 'D:' + '/GASC-Sports-Admin-Portable/GASC Sports Admin-win32-x64/resources/app/server/data';
        try {
          if (fs.existsSync(portableDir)) {
            fs.writeFileSync(path.join(portableDir, 'local_db.json'), payload, 'utf8');
          }
        } catch (mErr) {}
      }
    } catch (e) {
      console.error('Error saving local db:', e.message);
    }
  }

  getTable(tableName) {
    this.checkReload();
    if (!this.db[tableName]) {
      this.db[tableName] = [];
    }
    return this.db[tableName];
  }
}

const storeInstance = new LocalStore();

/**
 * High-performance Postgrest-compatible QueryBuilder executing in-memory against local JSON store
 */
class LocalQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.selectedFields = null;
    this.isHeadOnly = false;
    this.isExactCount = false;
    this.orderConfig = null;
    this.rangeConfig = null;
    this.limitCount = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.operation = 'select';
    this.mutationData = null;
    this.mutationOptions = null;
  }

  select(fields = '*', options = {}) {
    if (!this.operation || this.operation === 'select') {
      this.operation = 'select';
    }
    this.selectedFields = fields;
    if (options.head) this.isHeadOnly = true;
    if (options.count) this.isExactCount = true;
    return this;
  }

  insert(data) {
    this.operation = 'insert';
    this.mutationData = Array.isArray(data) ? data : [data];
    return this;
  }

  upsert(data, options = {}) {
    this.operation = 'upsert';
    this.mutationData = Array.isArray(data) ? data : [data];
    this.mutationOptions = options;
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.mutationData = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push(row => String(row[col] ?? '') === String(val ?? ''));
    return this;
  }

  neq(col, val) {
    this.filters.push(row => String(row[col] ?? '') !== String(val ?? ''));
    return this;
  }

  in(col, vals) {
    const set = new Set((vals || []).map(String));
    this.filters.push(row => set.has(String(row[col] ?? '')));
    return this;
  }

  is(col, val) {
    this.filters.push(row => row[col] === val);
    return this;
  }

  gt(col, val) {
    this.filters.push(row => row[col] > val);
    return this;
  }

  gte(col, val) {
    this.filters.push(row => row[col] >= val);
    return this;
  }

  lt(col, val) {
    this.filters.push(row => row[col] < val);
    return this;
  }

  lte(col, val) {
    this.filters.push(row => row[col] <= val);
    return this;
  }

  ilike(col, pattern) {
    const cleanPattern = pattern.replace(/%/g, '.*');
    const regex = new RegExp(`^${cleanPattern}$`, 'i');
    this.filters.push(row => regex.test(String(row[col] || '')));
    return this;
  }

  or(condStr) {
    // Example: "name.ilike.%arun%,email.ilike.user@domain.com"
    const parts = (condStr || '').split(',');
    this.filters.push(row => {
      for (const part of parts) {
        const tokens = part.split('.');
        if (tokens.length >= 3) {
          const field = tokens[0];
          const op = tokens[1];
          const val = tokens.slice(2).join('.');
          const isWildcard = val.includes('%');
          const cleanPattern = val.replace(/%/g, '.*');
          const reg = new RegExp(isWildcard ? cleanPattern : `^${cleanPattern}$`, 'i');
          if (reg.test(String(row[field] || ''))) return true;
        }
      }
      return false;
    });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderConfig = { col, ascending };
    return this;
  }

  range(from, to) {
    this.rangeConfig = { from, to };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute() {
    const list = storeInstance.getTable(this.table);

    // MUTATION: INSERT
    if (this.operation === 'insert') {
      const inserted = [];
      for (const item of this.mutationData) {
        const doc = {
          id: item.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...item,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        list.push(doc);
        inserted.push(doc);
      }
      storeInstance.save();
      const resData = (this.isSingle || this.isMaybeSingle) ? inserted[0] : inserted;
      return { data: resData, error: null, count: inserted.length };
    }

    // MUTATION: UPSERT
    if (this.operation === 'upsert') {
      const conflictCol = this.mutationOptions?.onConflict || 'id';
      const upserted = [];
      for (const item of this.mutationData) {
        const conflictVal = item[conflictCol];
        const existingIdx = list.findIndex(r => String(r[conflictCol] ?? '') === String(conflictVal ?? ''));
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...item, updated_at: new Date().toISOString() };
          upserted.push(list[existingIdx]);
        } else {
          const doc = {
            id: item.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ...item,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          list.push(doc);
          upserted.push(doc);
        }
      }
      storeInstance.save();
      const resData = (this.isSingle || this.isMaybeSingle) ? upserted[0] : upserted;
      return { data: resData, error: null, count: upserted.length };
    }

    // MUTATION: UPDATE
    if (this.operation === 'update') {
      const updated = [];
      for (let i = 0; i < list.length; i++) {
        const match = this.filters.every(f => f(list[i]));
        if (match) {
          list[i] = { ...list[i], ...this.mutationData, updated_at: new Date().toISOString() };
          updated.push(list[i]);
        }
      }
      storeInstance.save();
      const resData = (this.isSingle || this.isMaybeSingle) ? updated[0] : updated;
      return { data: resData, error: null, count: updated.length };
    }

    // MUTATION: DELETE
    if (this.operation === 'delete') {
      const remaining = [];
      const deleted = [];
      for (const item of list) {
        if (this.filters.every(f => f(item))) {
          deleted.push(item);
        } else {
          remaining.push(item);
        }
      }
      storeInstance.db[this.table] = remaining;
      storeInstance.save();
      const resData = (this.isSingle || this.isMaybeSingle) ? (deleted[0] || null) : deleted;
      return { data: resData, error: null, count: deleted.length };
    }

    // QUERY: SELECT
    let result = list.filter(row => {
      return this.filters.every(filterFn => filterFn(row));
    });

    const totalCount = result.length;

    if (this.orderConfig) {
      const { col, ascending } = this.orderConfig;
      result.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (ascending) return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
    }

    if (this.rangeConfig) {
      result = result.slice(this.rangeConfig.from, this.rangeConfig.to + 1);
    } else if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    // Head only (count request without payload)
    if (this.isHeadOnly) {
      return { data: null, count: totalCount, error: null };
    }

    // Resolve relationships if needed (e.g. sports(id, name), users(name))
    // We clone row objects so modifications don't corrupt store
    result = result.map(r => {
      const row = { ...r };
      const sel = this.selectedFields || '';

      if (sel.includes('sports(') || sel.includes('sports.')) {
        const sportId = row.sport_id || row.primary_sport;
        const sportObj = storeInstance.getTable('sports').find(s => s.id === sportId);
        row.sports = sportObj ? { id: sportObj.id, name: sportObj.name, icon: sportObj.icon } : null;
      }

      if (sel.includes('users(') || sel.includes('users.')) {
        const userId = row.user_id || row.student_id;
        let userObj = storeInstance.getTable('users').find(u => 
          String(u.id) === String(userId) ||
          (row.register_number && u.register_number && u.register_number.toUpperCase() === String(row.register_number).toUpperCase())
        );

        if (!userObj && (row.register_number || userId)) {
          const ros = storeInstance.getTable('college_student_roster').find(r => 
            (row.register_number && r.register_number.toUpperCase() === String(row.register_number).toUpperCase()) ||
            String(r.id) === String(userId)
          );
          if (ros) {
            userObj = {
              id: ros.id,
              name: ros.name,
              register_number: ros.register_number,
              department: ros.department,
              year: ros.year,
              gender: ros.gender || 'Male',
              mobile: ros.mobile || '+91 98421 54321',
              email: ros.email || `${ros.register_number.toLowerCase()}@gascidappadi.edu.in`
            };
          }
        }

        if (!userObj && (row.student_name || row.register_number)) {
          userObj = {
            id: userId || `usr_${Date.now()}`,
            name: row.student_name || 'Student Athlete',
            register_number: row.register_number || '23UGCS101',
            department: row.department || 'Computer Science',
            year: row.year || 'II Year',
            gender: row.gender || 'Male',
            mobile: row.mobile || '+91 98421 54321',
            email: row.email || 'student@gascidappadi.edu.in'
          };
        }

        row.users = userObj ? {
          id: userObj.id,
          name: userObj.name,
          register_number: userObj.register_number,
          department: userObj.department,
          year: userObj.year,
          gender: userObj.gender,
          mobile: userObj.mobile,
          email: userObj.email,
          profile_photo: userObj.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80'
        } : null;
      }

      if (sel.includes('equipment(') || sel.includes('equipment.')) {
        const eqId = row.equipment_id;
        const eqObj = storeInstance.getTable('equipment').find(e => e.id === eqId);
        row.equipment = eqObj ? { id: eqObj.id, name: eqObj.name, code: eqObj.code, category: eqObj.category } : null;
      }

      if (sel.includes('competitions(') || sel.includes('competitions.')) {
        const compId = row.competition_id;
        let compObj = storeInstance.getTable('competitions').find(c => 
          String(c.id) === String(compId) ||
          String(c.id) === `comp_${compId}` ||
          String(c.id).replace('comp_', '') === String(compId).replace('comp_', '')
        );

        if (!compObj && typeof compId === 'string') {
          const cleanSlug = compId.replace('spark_', '').replace('comp_', '').toLowerCase();
          compObj = storeInstance.getTable('competitions').find(c => 
            (c.sport_name && c.sport_name.toLowerCase().includes(cleanSlug)) ||
            (c.name && c.name.toLowerCase().includes(cleanSlug))
          );
        }

        row.competitions = compObj ? {
          id: compObj.id,
          name: compObj.name,
          tournament_name: compObj.tournament_name || 'SPARK 2026',
          sport_id: compObj.sport_id,
          sport_name: compObj.sport_name || compObj.name,
          type: compObj.type || 'Inter-College',
          level: compObj.level || 'College',
          date: compObj.date,
          venue: compObj.venue
        } : (row.sport_name ? {
          id: compId,
          name: row.competition_name || `${row.sport_name} Competition`,
          tournament_name: row.tournament_name || 'SPARK 2026',
          sport_name: row.sport_name,
          date: row.registration_date,
          venue: 'GASC Sports Ground'
        } : null);
      }

      if (sel.includes('teams(') || sel.includes('teams.')) {
        const teamId = row.team_id;
        const teamObj = storeInstance.getTable('teams').find(t => t.id === teamId);
        row.teams = teamObj ? { id: teamObj.id, name: teamObj.name } : null;
      }

      if (sel.includes('team_members(') || sel.includes('team_members.')) {
        const teamId = row.id;
        const members = storeInstance.getTable('team_members').filter(tm => tm.team_id === teamId);
        row.team_members = members.map(m => {
          const u = storeInstance.getTable('users').find(usr => usr.id === m.student_id);
          return {
            id: m.id,
            team_id: m.team_id,
            student_id: m.student_id,
            role: m.role || 'Player',
            created_at: m.created_at,
            user: u ? { id: u.id, name: u.name, register_number: u.register_number, department: u.department, gender: u.gender } : null
          };
        });
      }

      return row;
    });

    if (this.isSingle) {
      return { data: result[0] || null, count: totalCount, error: result.length ? null : { message: 'Row not found' } };
    }
    if (this.isMaybeSingle) {
      return { data: result[0] || null, count: totalCount, error: null };
    }

    return { data: result, count: totalCount, error: null };
  }

  // Thenable for `await query`
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

module.exports = {
  storeInstance,
  LocalQueryBuilder,
  from: (table) => new LocalQueryBuilder(table)
};
