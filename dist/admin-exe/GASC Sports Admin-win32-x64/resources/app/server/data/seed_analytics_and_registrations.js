const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'local_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const hashedPassword = bcrypt.hashSync('student123', 10);

// 1. Ensure Competitions exist for SPARK 2026
const tournamentName = 'SPARK 2026 Annual Sports Fest';

const sparkCompetitions = [
  {
    id: 'comp_spark_cricket',
    name: 'SPARK Men\'s Cricket Championship',
    tournament_name: tournamentName,
    sport_id: 'sp_cricket',
    sport_name: 'Cricket',
    type: 'Team',
    level: 'College',
    venue: 'GASC Idappadi Main Ground',
    date: '2026-10-12T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 80,
    current_registrations: 39,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_football',
    name: 'SPARK Inter-Department Football Trophy',
    tournament_name: tournamentName,
    sport_id: 'sp_football',
    sport_name: 'Football',
    type: 'Team',
    level: 'College',
    venue: 'GASC Idappadi Football Ground',
    date: '2026-10-13T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 60,
    current_registrations: 31,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_kabaddi',
    name: 'SPARK Zonal Kabaddi Championship',
    tournament_name: tournamentName,
    sport_id: 'sp_kabaddi',
    sport_name: 'Kabaddi',
    type: 'Team',
    level: 'College',
    venue: 'Kabaddi Mud Court',
    date: '2026-10-14T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 60,
    current_registrations: 30,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_volleyball',
    name: 'SPARK Volleyball Rolling Trophy',
    tournament_name: tournamentName,
    sport_id: 'sp_volleyball',
    sport_name: 'Volleyball',
    type: 'Team',
    level: 'College',
    venue: 'Outdoor Volleyball Court',
    date: '2026-10-15T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 48,
    current_registrations: 20,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_badminton',
    name: 'SPARK Badminton Singles & Doubles Meet',
    tournament_name: tournamentName,
    sport_id: 'sp_badminton',
    sport_name: 'Badminton',
    type: 'Individual',
    level: 'College',
    venue: 'Indoor Badminton Court',
    date: '2026-10-11T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 40,
    current_registrations: 26,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_chess',
    name: 'SPARK Open Chess Championship',
    tournament_name: tournamentName,
    sport_id: 'sp_chess',
    sport_name: 'Chess',
    type: 'Individual',
    level: 'College',
    venue: 'Seminar Hall A',
    date: '2026-10-11T09:00:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-10T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 30,
    current_registrations: 15,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  },
  {
    id: 'comp_spark_athletics',
    name: 'SPARK 100m Track & Sprint Trials',
    tournament_name: tournamentName,
    sport_id: 'sp_running',
    sport_name: 'Running',
    type: 'Individual',
    level: 'College',
    venue: 'College Main Track',
    date: '2026-10-10T07:30:00.000Z',
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-10-09T23:59:59.000Z',
    organizer: 'GASC Idappadi Physical Education Department',
    eligibility: 'All enrolled UG and PG students',
    max_participants: 30,
    current_registrations: 18,
    status: 'Registration Open',
    banner_image: '/images/sports/tournament.png',
    created_at: new Date().toISOString()
  }
];

sparkCompetitions.forEach(sc => {
  const existingIdx = db.competitions.findIndex(c => c.id === sc.id);
  if (existingIdx >= 0) {
    db.competitions[existingIdx] = { ...db.competitions[existingIdx], ...sc };
  } else {
    db.competitions.push(sc);
  }
});

// 2. Define Departments and realistic student rosters
const departmentSpecs = [
  {
    dept: 'B.Sc CS',
    fullDept: 'Computer Science',
    boys: [
      'Lokesh', 'Arun', 'Kumar', 'Suresh', 'Vijay',
      'Prakash', 'Ravi', 'Karthik', 'Manoj', 'Dinesh',
      'Sanjay', 'Ajay', 'Bala', 'Hari', 'Vimal',
      'Saran', 'Praveen', 'Naveen', 'Vignesh', 'Surya'
    ],
    girls: [
      'Priya', 'Deepa', 'Kaviya', 'Anitha', 'Soundarya',
      'Sandhiya', 'Divya', 'Keerthana', 'Meena', 'Nithya',
      'Pavithra', 'Ramya', 'Sneha', 'Sowmiya', 'Swetha'
    ],
    // Matrix distribution: Cricket: 15, Football: 10, Kabaddi: 8, Badminton: 6
    cricketBoys: 15,
    cricketGirls: 0,
    footballBoys: 10,
    footballGirls: 0,
    kabaddiBoys: 5,
    kabaddiGirls: 3,
    badmintonBoys: 2,
    badmintonGirls: 4,
    chessBoys: 2,
    chessGirls: 3
  },
  {
    dept: 'B.Sc Maths',
    fullDept: 'Mathematics',
    boys: [
      'Saravanan', 'Gokul', 'Manikandan', 'Vasanth', 'Prabhu',
      'Yuvaraj', 'Ramesh', 'Moorthy', 'Sathish', 'Kishore',
      'Balamurugan', 'Rajesh', 'Sridhar', 'Gopinath', 'Subash',
      'Chandran', 'Dhilip', 'Ganesh'
    ],
    girls: [
      'Abirami', 'Kavitha', 'Bhavani', 'Revathi', 'Sindhu',
      'Gayathri', 'Karpagam', 'Kalaivani', 'Sharmila', 'Monisha',
      'Radha', 'Kavya'
    ],
    // Matrix: Cricket: 8, Football: 7, Kabaddi: 6, Badminton: 5
    cricketBoys: 8,
    cricketGirls: 0,
    footballBoys: 7,
    footballGirls: 0,
    kabaddiBoys: 4,
    kabaddiGirls: 2,
    badmintonBoys: 2,
    badmintonGirls: 3,
    chessBoys: 2,
    chessGirls: 2
  },
  {
    dept: 'BCA',
    fullDept: 'Computer Applications (BCA)',
    boys: [
      'Ashok', 'Barath', 'Chandru', 'Deva', 'Eashwar',
      'Francis', 'Giridhar', 'Harish', 'Imran', 'Jeeva',
      'Kamalesh', 'Logeshwaran', 'Madhavan', 'Naveenkumar', 'Omprasanth'
    ],
    girls: [
      'Anandhi', 'Bhuvaneshwari', 'Charulatha', 'Dharani', 'Ezhil',
      'Farzana', 'Gomathi', 'Hema', 'Indhu', 'Janani'
    ],
    // Matrix: Cricket: 10, Football: 9, Kabaddi: 7, Badminton: 8
    cricketBoys: 10,
    cricketGirls: 0,
    footballBoys: 9,
    footballGirls: 0,
    kabaddiBoys: 5,
    kabaddiGirls: 2,
    badmintonBoys: 3,
    badmintonGirls: 5,
    chessBoys: 2,
    chessGirls: 2
  },
  {
    dept: 'B.Com',
    fullDept: 'Commerce',
    boys: [
      'Aakash', 'Boopathi', 'Chidambaram', 'Dhanush', 'Elumalai',
      'Gowthaman', 'Hemachandran', 'Illayaraja', 'Jagadeesh', 'Kannan',
      'Lakshmanan', 'Muthukumar'
    ],
    girls: [
      'Akshaya', 'Banu', 'Chitra', 'Devaki', 'Elakkiya',
      'Fathima', 'Geetha', 'Haripriya'
    ],
    // Matrix: Cricket: 6, Football: 5, Kabaddi: 9, Badminton: 7
    cricketBoys: 6,
    cricketGirls: 0,
    footballBoys: 5,
    footballGirls: 0,
    kabaddiBoys: 5,
    kabaddiGirls: 4,
    badmintonBoys: 2,
    badmintonGirls: 5,
    chessBoys: 1,
    chessGirls: 1
  }
];

const createdUsers = [];
const createdRegs = [];

let studentCounter = 100;

departmentSpecs.forEach((spec, deptIdx) => {
  let deptCode = 'GEN';
  if (spec.dept === 'B.Sc CS') deptCode = 'CS';
  else if (spec.dept === 'B.Sc Maths') deptCode = 'MA';
  else if (spec.dept === 'BCA') deptCode = 'BCA';
  else if (spec.dept === 'B.Com') deptCode = 'COM';

  // Create boys
  const boyUserObjs = spec.boys.map((bName, idx) => {
    studentCounter++;
    const regNo = `23${deptCode}${String(idx + 1).padStart(3, '0')}`;
    const userId = `usr_${deptCode.toLowerCase()}_b_${idx + 1}`;
    
    // Check if user already exists
    let existing = db.users.find(u => u.register_number === regNo || u.id === userId);
    if (!existing) {
      existing = {
        id: userId,
        name: bName,
        register_number: regNo,
        email: `${bName.toLowerCase()}.${deptCode.toLowerCase()}@gascidappadi.edu.in`,
        password: hashedPassword,
        role: 'student',
        department: spec.dept,
        year: 'II Year',
        section: 'A',
        gender: 'Male',
        mobile: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
        profile_photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
        status: 'Active',
        created_at: new Date(Date.now() - (30 - idx) * 86400000).toISOString()
      };
      db.users.push(existing);
    } else {
      existing.name = bName;
      existing.department = spec.dept;
      existing.gender = 'Male';
    }
    return existing;
  });

  // Create girls
  const girlUserObjs = spec.girls.map((gName, idx) => {
    studentCounter++;
    const regNo = `23${deptCode}${String(idx + 51).padStart(3, '0')}`;
    const userId = `usr_${deptCode.toLowerCase()}_g_${idx + 1}`;
    
    let existing = db.users.find(u => u.register_number === regNo || u.id === userId);
    if (!existing) {
      existing = {
        id: userId,
        name: gName,
        register_number: regNo,
        email: `${gName.toLowerCase()}.${deptCode.toLowerCase()}@gascidappadi.edu.in`,
        password: hashedPassword,
        role: 'student',
        department: spec.dept,
        year: 'II Year',
        section: 'A',
        gender: 'Female',
        mobile: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
        profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
        status: 'Active',
        created_at: new Date(Date.now() - (30 - idx) * 86400000).toISOString()
      };
      db.users.push(existing);
    } else {
      existing.name = gName;
      existing.department = spec.dept;
      existing.gender = 'Female';
    }
    return existing;
  });

  // Create Registrations according to distribution
  const addReg = (user, compId, sportSlug, dayOffset) => {
    const existing = db.competition_registrations.find(r => r.student_id === user.id && r.competition_id === compId);
    if (!existing) {
      const regCode = `SPARK26-${sportSlug.slice(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const reg = {
        id: `reg_${user.id}_${compId}`,
        competition_id: compId,
        tournament_id: compId,
        student_id: user.id,
        registration_code: regCode,
        status: 'Registered',
        remarks: 'Individual Student Registration',
        registration_date: new Date(Date.now() - (dayOffset || 5) * 86400000).toISOString(),
        created_at: new Date(Date.now() - (dayOffset || 5) * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      };
      db.competition_registrations.push(reg);
    }
  };

  // Cricket Boys
  boyUserObjs.slice(0, spec.cricketBoys).forEach((u, i) => addReg(u, 'comp_spark_cricket', 'CRI', 10 - (i % 7)));
  // Cricket Girls
  girlUserObjs.slice(0, spec.cricketGirls).forEach((u, i) => addReg(u, 'comp_spark_cricket', 'CRI', 10 - (i % 7)));

  // Football Boys
  boyUserObjs.slice(0, spec.footballBoys).forEach((u, i) => addReg(u, 'comp_spark_football', 'FTB', 9 - (i % 6)));
  // Football Girls
  girlUserObjs.slice(0, spec.footballGirls).forEach((u, i) => addReg(u, 'comp_spark_football', 'FTB', 9 - (i % 6)));

  // Kabaddi Boys
  boyUserObjs.slice(0, spec.kabaddiBoys).forEach((u, i) => addReg(u, 'comp_spark_kabaddi', 'KBD', 8 - (i % 5)));
  // Kabaddi Girls
  girlUserObjs.slice(0, spec.kabaddiGirls).forEach((u, i) => addReg(u, 'comp_spark_kabaddi', 'KBD', 8 - (i % 5)));

  // Badminton Boys
  boyUserObjs.slice(0, spec.badmintonBoys).forEach((u, i) => addReg(u, 'comp_spark_badminton', 'BDM', 7 - (i % 4)));
  // Badminton Girls
  girlUserObjs.slice(0, spec.badmintonGirls).forEach((u, i) => addReg(u, 'comp_spark_badminton', 'BDM', 7 - (i % 4)));

  // Chess
  boyUserObjs.slice(0, spec.chessBoys).forEach((u, i) => addReg(u, 'comp_spark_chess', 'CHS', 6 - (i % 3)));
  girlUserObjs.slice(0, spec.chessGirls).forEach((u, i) => addReg(u, 'comp_spark_chess', 'CHS', 6 - (i % 3)));
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log('Seeding complete!');
console.log('Total Users:', db.users.length);
console.log('Total Competitions:', db.competitions.length);
console.log('Total Registrations:', db.competition_registrations.length);
