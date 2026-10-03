const bcrypt = require('bcryptjs');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const seedSupabase = async (force = false) => {
  if (!isSupabaseConfigured()) {
    console.error('⚠️ Supabase is not configured in .env. Skipping seed.');
    return;
  }

  try {
    console.log('⚡ Checking Supabase database contents...');

    // Check if users already exist
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userCountError) {
      console.error('⚠️ Error checking users table in Supabase:', userCountError.message);
      return;
    }

    if (userCount > 0 && !force) {
      console.log(`✅ Supabase already initialized with ${userCount} users. Ready!`);
      return;
    }

    console.log('🌱 Seeding GASC Idappadi data into Supabase Cloud Database...');

    // 1. Admin Settings
    const { data: existingSettings } = await supabase.from('admin_settings').select('id').limit(1);
    if (!existingSettings || existingSettings.length === 0) {
      await supabase.from('admin_settings').insert({
        college_name: 'Government Arts and Science College, Idappadi',
        department_name: 'Department of Physical Education & Sports',
        sports_incharge_name: 'Dr. K. Malathi, M.P.Ed., M.Phil., Ph.D.',
        sports_incharge_role: 'Physical Directress & Sports Incharge',
        email: 'sports@gascidappadi.edu.in',
        phone: '+91 94432 18765',
        address: 'Government Arts and Science College, Idappadi, Salem District - 637101, Tamil Nadu',
        office_hours: '08:30 AM - 05:30 PM (Mon - Sat)',
        auto_notifications: true
      });
      console.log('  ✔️ Admin Settings created');
    }

    // 2. Hash passwords
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    const studentHashedPassword = await bcrypt.hash('student123', 10);

    // 3. Insert Admin and Students
    const usersToInsert = [
      {
        name: 'Dr. K. Malathi (Sports Incharge)',
        register_number: 'ADMIN-SPORTS',
        email: 'admin@gascidappadi.edu.in',
        password: adminHashedPassword,
        role: 'admin',
        department: 'Physical Education',
        year: 'Faculty',
        section: 'A',
        gender: 'Female',
        mobile: '+91 94432 18765',
        profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
        status: 'Active'
      },
      {
        name: 'Arun Kumar S',
        register_number: '23UGCS101',
        email: 'arun.cs@gascidappadi.edu.in',
        password: studentHashedPassword,
        role: 'student',
        department: 'Computer Science',
        year: 'II Year',
        section: 'A',
        gender: 'Male',
        mobile: '+91 98421 54321',
        profile_photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
        status: 'Active'
      },
      {
        name: 'Priya Dharshini R',
        register_number: '23UGCS102',
        email: 'priya.cs@gascidappadi.edu.in',
        password: studentHashedPassword,
        role: 'student',
        department: 'Computer Science',
        year: 'II Year',
        section: 'A',
        gender: 'Female',
        mobile: '+91 97890 12345',
        profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
        status: 'Active'
      },
      {
        name: 'Karthik Raja M',
        register_number: '24UGCO205',
        email: 'karthik.com@gascidappadi.edu.in',
        password: studentHashedPassword,
        role: 'student',
        department: 'Commerce',
        year: 'I Year',
        section: 'B',
        gender: 'Male',
        mobile: '+91 98943 67890',
        profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        status: 'Active'
      },
      {
        name: 'Deepa Lakshmi K',
        register_number: '22UGMA310',
        email: 'deepa.maths@gascidappadi.edu.in',
        password: studentHashedPassword,
        role: 'student',
        department: 'Mathematics',
        year: 'III Year',
        section: 'A',
        gender: 'Female',
        mobile: '+91 96554 32109',
        profile_photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
        status: 'Active'
      }
    ];

    const { data: createdUsers, error: userInsertError } = await supabase
      .from('users')
      .upsert(usersToInsert, { onConflict: 'email' })
      .select();

    if (userInsertError) {
      console.error('⚠️ User insertion error:', userInsertError.message);
    } else {
      console.log(`  ✔️ ${createdUsers.length} Users seeded`);
    }

    const userMap = {};
    if (createdUsers) {
      createdUsers.forEach(u => { userMap[u.register_number] = u; });
    }

    // 4. Sports Disciplines
    const sportsData = [
      {
        name: 'Cricket',
        description: 'Men & Women collegiate cricket with standard turf and matting wickets.',
        category: 'Team Sport',
        indoor_outdoor: 'Outdoor',
        player_count: 11,
        equipment_required: ['Cricket Bats', 'Leather Balls', 'Wickets & Bails', 'Batting Pads', 'Helmets'],
        coach: 'Dr. K. Malathi / Coach R. Selvan',
        icon: 'bi-trophy',
        image: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Volleyball',
        description: 'Standard clay and synthetic court volleyball coaching and university competitions.',
        category: 'Team Sport',
        indoor_outdoor: 'Outdoor',
        player_count: 6,
        equipment_required: ['Volleyballs', 'Heavy-Duty Net', 'Antennae', 'Knee Guards'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-circle',
        image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Football',
        description: 'Standard 11-a-side football field, tactical drills, and inter-collegiate tournaments.',
        category: 'Team Sport',
        indoor_outdoor: 'Outdoor',
        player_count: 11,
        equipment_required: ['Footballs', 'Goal Nets', 'Agility Cones', 'Shin Guards', 'Corner Flags'],
        coach: 'Coach S. Murugan',
        icon: 'bi-dribbble',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Kabaddi',
        description: 'Traditional mat Kabaddi team, state zonal champions and university finalists.',
        category: 'Team Sport',
        indoor_outdoor: 'Both',
        player_count: 7,
        equipment_required: ['Kabaddi Mat', 'Knee & Ankle Supports', 'Grip Powders'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-shield-shaded',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Badminton',
        description: 'Indoor wooden court badminton training for singles and doubles.',
        category: 'Individual Sport',
        indoor_outdoor: 'Indoor',
        player_count: 2,
        equipment_required: ['Carbon Graphite Rackets', 'Feather Shuttles', 'Nets', 'Court Shoes'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-lightning-charge',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Athletics & Track',
        description: '400m track running, sprints, relays, long jump, shot put, and javelin.',
        category: 'Athletics & Track',
        indoor_outdoor: 'Outdoor',
        player_count: 1,
        equipment_required: ['Starting Blocks', 'Relay Batons', 'Shot Put (7.26kg / 4kg)', 'Javelin (800g / 600g)', 'Measuring Tapes'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-stopwatch',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Chess',
        description: 'Strategic mind sports club, FIDE rated tournament coaching.',
        category: 'Indoor Games',
        indoor_outdoor: 'Indoor',
        player_count: 1,
        equipment_required: ['Tournament Chess Boards', 'DGT Digital Clocks', 'Notation Sheets'],
        coach: 'Prof. T. Ramanathan',
        icon: 'bi-suit-spade',
        image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80',
        status: 'Active'
      }
    ];

    const { data: createdSports } = await supabase
      .from('sports')
      .upsert(sportsData, { onConflict: 'name' })
      .select();

    const sportMap = {};
    if (createdSports) {
      createdSports.forEach(s => { sportMap[s.name] = s; });
      console.log(`  ✔️ ${createdSports.length} Sports seeded`);
    }

    // 5. Player Profiles
    const arunUser = userMap['23UGCS101'];
    const priyaUser = userMap['23UGCS102'];
    const karthikUser = userMap['24UGCO205'];

    if (arunUser && sportMap['Cricket']) {
      await supabase.from('player_profiles').upsert({
        user_id: arunUser.id,
        primary_sport: sportMap['Cricket'].id,
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
        bio: 'Passionate collegiate cricketer and top-order batsman representing GASC Idappadi in Periyar University zonal matches.'
      }, { onConflict: 'user_id' });
    }

    if (priyaUser && sportMap['Athletics & Track']) {
      await supabase.from('player_profiles').upsert({
        user_id: priyaUser.id,
        primary_sport: sportMap['Athletics & Track'].id,
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
        bio: 'Gold medalist in Salem District 100m track events.'
      }, { onConflict: 'user_id' });
    }

    if (karthikUser && sportMap['Volleyball']) {
      await supabase.from('player_profiles').upsert({
        user_id: karthikUser.id,
        primary_sport: sportMap['Volleyball'].id,
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
        bio: 'Lead attacker for GASC Idappadi Volleyball team.'
      }, { onConflict: 'user_id' });
    }
    console.log('  ✔️ Player Profiles seeded');

    // 6. College Student Roster (Pre-approved students)
    const rosterData = [
      { register_number: '23UGCS101', name: 'Arun Kumar S', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', is_registered: true },
      { register_number: '23UGCS102', name: 'Priya Dharshini R', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female', is_registered: true },
      { register_number: '23UGCS103', name: 'Balaji K', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
      { register_number: '23UGCS104', name: 'Divya M', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Female', is_registered: false },
      { register_number: '23UGCS105', name: 'Elango V', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Male', is_registered: false },
      { register_number: '24UGCO201', name: 'Gowtham N', department: 'Commerce', year: 'I Year', section: 'A', gender: 'Male', is_registered: false },
      { register_number: '24UGCO205', name: 'Karthik Raja M', department: 'Commerce', year: 'I Year', section: 'B', gender: 'Male', is_registered: true },
      { register_number: '22UGMA301', name: 'Abirami S', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', is_registered: false },
      { register_number: '22UGMA310', name: 'Deepa Lakshmi K', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', is_registered: true },
      { register_number: '23UGEN101', name: 'Dinesh Kumar P', department: 'English', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
      { register_number: '23UGEN115', name: 'Vigneshwaran T', department: 'English', year: 'II Year', section: 'B', gender: 'Male', is_registered: false },
      { register_number: '23UGTA101', name: 'Mani Maran C', department: 'Tamil', year: 'II Year', section: 'A', gender: 'Male', is_registered: false },
      { register_number: '24UGPH101', name: 'Sanjay V', department: 'Physics', year: 'I Year', section: 'A', gender: 'Male', is_registered: false },
      { register_number: '24UGCH101', name: 'Kavitha R', department: 'Chemistry', year: 'I Year', section: 'A', gender: 'Female', is_registered: false },
      { register_number: '23UGBA101', name: 'Naveen Prasath S', department: 'Business Administration', year: 'II Year', section: 'A', gender: 'Male', is_registered: false }
    ];

    await supabase.from('college_student_roster').upsert(rosterData, { onConflict: 'register_number' });
    console.log('  ✔️ College Student Roster seeded');

    // 7. Equipment
    const cricketSport = sportMap['Cricket'];
    const volleyballSport = sportMap['Volleyball'];
    const footballSport = sportMap['Football'];
    const badmintonSport = sportMap['Badminton'];

    const equipmentData = [
      {
        name: 'English Willow Cricket Bats (SG / SS)',
        code: 'EQ-CRI-001',
        sport_id: cricketSport?.id,
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
        purchase_price: 3200.00
      },
      {
        name: 'Four-Piece Leather Cricket Balls (Red / White)',
        code: 'EQ-CRI-002',
        sport_id: cricketSport?.id,
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
        purchase_price: 650.00
      },
      {
        name: 'Cosco Super Volley Volleyballs',
        code: 'EQ-VOL-001',
        sport_id: volleyballSport?.id,
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
        purchase_price: 1100.00
      },
      {
        name: 'Nivia Premier League Footballs (Size 5)',
        code: 'EQ-FTB-001',
        sport_id: footballSport?.id,
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
        purchase_price: 1250.00
      },
      {
        name: 'Yonex Muscle Power Badminton Rackets',
        code: 'EQ-BDM-001',
        sport_id: badmintonSport?.id,
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
        purchase_price: 1800.00
      }
    ];

    const { data: createdEquipment } = await supabase
      .from('equipment')
      .upsert(equipmentData, { onConflict: 'code' })
      .select();
    console.log(`  ✔️ ${createdEquipment?.length || 0} Equipment records seeded`);

    // 8. Competitions
    const competitionData = [
      {
        name: 'Periyar University Inter-Collegiate Cricket Tournament 2026',
        sport_id: cricketSport?.id,
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
        description: 'Prestigious university zonal cricket championship tournament hosted at Idappadi campus.'
      },
      {
        name: 'Annual Inter-Department Volleyball Rolling Trophy 2026',
        sport_id: volleyballSport?.id,
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
        description: 'Annual inter-department rivalry for the championship shield.'
      },
      {
        name: 'Salem District College Athletics Meet 2026',
        sport_id: sportMap['Athletics & Track']?.id,
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
        description: 'District level track and field trials for State Games qualification.'
      }
    ];

    const { data: createdCompetitions } = await supabase
      .from('competitions')
      .upsert(competitionData, { onConflict: 'name' })
      .select();
    console.log(`  ✔️ ${createdCompetitions?.length || 0} Competitions seeded`);

    // 9. Teams
    const teamData = [
      {
        captain_name: 'Arun Kumar S',
        sport_id: cricketSport?.id,
        sport_name: 'Cricket',
        department: 'Computer Science',
        year: 'II Year',
        phone: '+91 98421 54321',
        name: 'Cricket (Computer Science - II Year)',
        status: 'Active'
      },
      {
        captain_name: 'Karthik Raja M',
        sport_id: volleyballSport?.id,
        sport_name: 'Volleyball',
        department: 'Commerce',
        year: 'I Year',
        phone: '+91 98943 67890',
        name: 'Volleyball (Commerce - I Year)',
        status: 'Active'
      },
      {
        captain_name: 'Vigneshwaran T',
        sport_id: sportMap['Kabaddi']?.id,
        sport_name: 'Kabaddi',
        department: 'English',
        year: 'II Year',
        phone: '+91 95663 88990',
        name: 'Kabaddi (English - II Year)',
        status: 'Active'
      }
    ];

    await supabase.from('teams').insert(teamData);
    console.log('  ✔️ Teams seeded');

    // 10. Achievements
    if (arunUser) {
      await supabase.from('achievements').insert([
        {
          student_id: arunUser.id,
          student_name: arunUser.name,
          register_number: arunUser.register_number,
          department: arunUser.department,
          sport_name: 'Cricket',
          title: 'Man of the Match & Best Batsman',
          position: 'Winner / 1st Place',
          medal: 'Gold',
          year: '2025 - 2026',
          description: 'Scored match-winning 84 runs off 48 balls in Periyar University Zonal Quarter Finals.',
          is_featured: true
        }
      ]);
    }
    if (priyaUser) {
      await supabase.from('achievements').insert([
        {
          student_id: priyaUser.id,
          student_name: priyaUser.name,
          register_number: priyaUser.register_number,
          department: priyaUser.department,
          sport_name: 'Athletics & Track',
          title: '100m Sprint Gold Medalist',
          position: 'Winner / 1st Place',
          medal: 'Gold',
          year: '2025 - 2026',
          description: 'Clocked 12.4s to secure 1st place in Salem District Collegiate Athletics.',
          is_featured: true
        }
      ]);
    }
    console.log('  ✔️ Achievements seeded');

    // 11. Notifications
    await supabase.from('notifications').insert([
      {
        title: '🏏 Periyar University Cricket Team Selection Trials',
        message: 'All interested student players are instructed to report to College Main Ground on Wednesday at 06:30 AM in proper sports kit.',
        category: 'Team Selection',
        priority: 'High',
        target_type: 'All Students',
        sender: 'Dr. K. Malathi (Physical Directress)'
      },
      {
        title: '📢 Morning Sports Practice Schedule Announcement',
        message: 'Morning conditioning and fitness drills will commence every Monday, Wednesday, and Friday from 06:30 AM to 08:00 AM.',
        category: 'Practice',
        priority: 'Normal',
        target_type: 'All Students',
        sender: 'Sports Department'
      },
      {
        title: '🏐 Inter-Department Volleyball Tournament Registration Open',
        message: 'Department team captains can register their 6-player squad online via the portal before the 20th of this month.',
        category: 'Competition',
        priority: 'Normal',
        target_type: 'All Students',
        sender: 'Sports Incharge'
      }
    ]);
    console.log('  ✔️ Notifications seeded');

    // 12. Gallery
    await supabase.from('gallery').insert([
      {
        title: 'Periyar University Zonal Cricket Trophy Victory',
        description: 'GASC Idappadi team lifting the Runners-up Trophy with Physical Directress Dr. K. Malathi.',
        sport_name: 'Cricket',
        category: 'Tournaments',
        image: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=800&q=80'
      },
      {
        title: 'Annual Sports Day 2025 - Track & Field Finals',
        description: 'Students competing in the 100m sprint finals at college campus ground.',
        sport_name: 'Athletics & Track',
        category: 'Annual Sports Day',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80'
      },
      {
        title: 'Inter-College Volleyball Championship',
        description: 'Spirited action from the semifinal clash at the synthetic volleyball court.',
        sport_name: 'Volleyball',
        category: 'Tournaments',
        image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80'
      }
    ]);
    console.log('  ✔️ Gallery photos seeded');

    console.log('🎉 Supabase Database Seeded Successfully with complete GASC Idappadi Sports Data!\n');
  } catch (err) {
    console.error('❌ Error seeding Supabase:', err.message, err.stack);
  }
};

module.exports = seedSupabase;

if (require.main === module) {
  seedSupabase(true).then(() => {
    console.log('Done running seed script.');
    process.exit(0);
  });
}
