const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Sport = require('../models/Sport');
const PlayerProfile = require('../models/PlayerProfile');
const CollegeStudentRoster = require('../models/CollegeStudentRoster');
const Equipment = require('../models/Equipment');
const EquipmentTransaction = require('../models/EquipmentTransaction');
const Competition = require('../models/Competition');
const CompetitionRegistration = require('../models/CompetitionRegistration');
const Team = require('../models/Team');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');
const Gallery = require('../models/Gallery');
const AdminSettings = require('../models/AdminSettings');

const seedAll = async () => {
  try {
    console.log('--- Seeding GASC Idappadi Smart Sports Database ---');

    // 1. Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Sport.deleteMany({}),
      PlayerProfile.deleteMany({}),
      CollegeStudentRoster.deleteMany({}),
      Equipment.deleteMany({}),
      EquipmentTransaction.deleteMany({}),
      Competition.deleteMany({}),
      CompetitionRegistration.deleteMany({}),
      Team.deleteMany({}),
      Achievement.deleteMany({}),
      Notification.deleteMany({}),
      Gallery.deleteMany({}),
      AdminSettings.deleteMany({})
    ]);

    console.log('Cleaned old database records.');

    // 2. Admin Settings
    await AdminSettings.create({
      collegeName: 'Government Arts and Science College, Idappadi',
      departmentName: 'Department of Physical Education & Sports',
      sportsInchargeName: 'Dr. K. Malathi, M.P.Ed., M.Phil., Ph.D.',
      sportsInchargeRole: 'Physical Directress & Sports Incharge',
      email: 'sports@gascidappadi.edu.in',
      phone: '+91 94432 18765',
      address: 'Government Arts and Science College, Idappadi, Salem District - 637101, Tamil Nadu',
      officeHours: '08:30 AM - 05:30 PM (Mon - Sat)',
      autoNotifications: true
    });

    // 3. Admin Account
    const adminUser = await User.create({
      name: 'Dr. K. Malathi (Sports Incharge)',
      registerNumber: 'ADMIN-SPORTS',
      email: 'admin@gascidappadi.edu.in',
      password: 'admin123', // Will be hashed by pre-save
      role: 'admin',
      department: 'Physical Education',
      year: 'Faculty',
      gender: 'Female',
      mobile: '+91 94432 18765',
      profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
      status: 'Active'
    });

    // 4. Sports Disciplines
    const sportsData = [
      {
        name: 'Cricket',
        description: 'Men & Women collegiate cricket with standard turf and matting wickets.',
        category: 'Team Sport',
        indoorOutdoor: 'Outdoor',
        playerCount: 11,
        equipmentRequired: ['Cricket Bats', 'Leather Balls', 'Wickets & Bails', 'Batting Pads', 'Helmets'],
        coach: 'Dr. K. Malathi / Coach R. Selvan',
        icon: 'bi-trophy',
        image: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Volleyball',
        description: 'Standard clay and synthetic court volleyball coaching and university competitions.',
        category: 'Team Sport',
        indoorOutdoor: 'Outdoor',
        playerCount: 6,
        equipmentRequired: ['Volleyballs', 'Heavy-Duty Net', 'Antennae', 'Knee Guards'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-circle',
        image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Football',
        description: 'Standard 11-a-side football field, tactical drills, and inter-collegiate tournaments.',
        category: 'Team Sport',
        indoorOutdoor: 'Outdoor',
        playerCount: 11,
        equipmentRequired: ['Footballs', 'Goal Nets', 'Agility Cones', 'Shin Guards', 'Corner Flags'],
        coach: 'Coach S. Murugan',
        icon: 'bi-dribbble',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Kabaddi',
        description: 'Traditional mat Kabaddi team, state zonal champions and university finalists.',
        category: 'Team Sport',
        indoorOutdoor: 'Both',
        playerCount: 7,
        equipmentRequired: ['Kabaddi Mat', 'Knee & Ankle Supports', 'Grip Powders'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-shield-shaded',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Badminton',
        description: 'Indoor wooden court badminton training for singles and doubles.',
        category: 'Individual Sport',
        indoorOutdoor: 'Indoor',
        playerCount: 2,
        equipmentRequired: ['Carbon Graphite Rackets', 'Feather Shuttles', 'Nets', 'Court Shoes'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-lightning-charge',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Athletics & Track',
        description: '400m track running, sprints, relays, long jump, shot put, and javelin.',
        category: 'Athletics & Track',
        indoorOutdoor: 'Outdoor',
        playerCount: 1,
        equipmentRequired: ['Starting Blocks', 'Relay Batons', 'Shot Put (7.26kg / 4kg)', 'Javelin (800g / 600g)', 'Measuring Tapes'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-stopwatch',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Chess',
        description: 'Strategic mind sports club, FIDE rated tournament coaching.',
        category: 'Indoor Games',
        indoorOutdoor: 'Indoor',
        playerCount: 1,
        equipmentRequired: ['Tournament Chess Boards', 'DGT Digital Clocks', 'Notation Sheets'],
        coach: 'Prof. T. Ramanathan',
        icon: 'bi-suit-spade',
        image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80',
        status: 'Active'
      },
      {
        name: 'Basketball',
        description: 'Full court basketball with fiberglass backboards.',
        category: 'Team Sport',
        indoorOutdoor: 'Outdoor',
        playerCount: 5,
        equipmentRequired: ['Size 7 & Size 6 Basketballs', 'Ring Nets', 'Tactics Board'],
        coach: 'Dr. K. Malathi',
        icon: 'bi-record-circle',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
        status: 'Active'
      }
    ];

    const sports = await Sport.insertMany(sportsData);
    const sportMap = {};
    sports.forEach(s => { sportMap[s.name] = s; });

    // 5. Sample Students
    const studentsData = [
      {
        name: 'Arun Kumar S',
        registerNumber: '23UGCS101',
        email: 'arun.cs@gascidappadi.edu.in',
        password: 'student123',
        department: 'Computer Science',
        year: 'II Year',
        section: 'A',
        gender: 'Male',
        mobile: '+91 98421 54321',
        profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
        sport: 'Cricket',
        position: 'Captain & Top-Order Batsman',
        jersey: 7,
        matches: 14,
        won: 11,
        score: 486
      },
      {
        name: 'Priya Dharshini R',
        registerNumber: '23UGCS102',
        email: 'priya.cs@gascidappadi.edu.in',
        password: 'student123',
        department: 'Computer Science',
        year: 'II Year',
        section: 'A',
        gender: 'Female',
        mobile: '+91 97890 12345',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
        sport: 'Athletics & Track',
        position: '100m / 200m Sprinter',
        jersey: 12,
        matches: 8,
        won: 7,
        score: 15
      },
      {
        name: 'Karthik Raja M',
        registerNumber: '24UGCO205',
        email: 'karthik.com@gascidappadi.edu.in',
        password: 'student123',
        department: 'Commerce',
        year: 'I Year',
        section: 'B',
        gender: 'Male',
        mobile: '+91 98943 67890',
        profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        sport: 'Volleyball',
        position: 'Attacker / Outside Hitter',
        jersey: 9,
        matches: 10,
        won: 8,
        score: 84
      },
      {
        name: 'Deepa Lakshmi K',
        registerNumber: '22UGMA310',
        email: 'deepa.maths@gascidappadi.edu.in',
        password: 'student123',
        department: 'Mathematics',
        year: 'III Year',
        section: 'A',
        gender: 'Female',
        mobile: '+91 96554 32109',
        profilePhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
        sport: 'Badminton',
        position: 'Singles Specialist',
        jersey: 4,
        matches: 12,
        won: 9,
        score: 180
      },
      {
        name: 'Vigneshwaran T',
        registerNumber: '23UGEN115',
        email: 'vignesh.eng@gascidappadi.edu.in',
        password: 'student123',
        department: 'English',
        year: 'II Year',
        section: 'A',
        gender: 'Male',
        mobile: '+91 94881 23456',
        profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
        sport: 'Kabaddi',
        position: 'Main Raider',
        jersey: 3,
        matches: 9,
        won: 7,
        score: 54
      },
      {
        name: 'Anitha S',
        registerNumber: '24UGPH108',
        email: 'anitha.phy@gascidappadi.edu.in',
        password: 'student123',
        department: 'Physics',
        year: 'I Year',
        section: 'A',
        gender: 'Female',
        mobile: '+91 97901 98765',
        profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
        sport: 'Chess',
        position: 'Board 1 Player',
        jersey: 1,
        matches: 15,
        won: 12,
        score: 12
      }
    ];

    const studentUsers = [];
    for (const s of studentsData) {
      const user = await User.create({
        name: s.name,
        registerNumber: s.registerNumber,
        email: s.email,
        password: s.password, // Pre-save hashes this
        role: 'student',
        department: s.department,
        year: s.year,
        section: s.section,
        gender: s.gender,
        mobile: s.mobile,
        profilePhoto: s.profilePhoto,
        status: 'Active'
      });

      const primarySport = sportMap[s.sport] ? sportMap[s.sport]._id : null;
      await PlayerProfile.create({
        userId: user._id,
        primarySport,
        position: s.position,
        jerseyNumber: s.jersey,
        playingLevel: 'District Level',
        experience: '2 Years',
        statistics: {
          matchesPlayed: s.matches,
          matchesWon: s.won,
          matchesLost: s.matches - s.won,
          scorePoints: s.score,
          awardsCount: 2,
          competitionsParticipated: 4
        }
      });

      studentUsers.push(user);
    }

    // 5b. Official GASC Idappadi College Student Roster
    // Only students listed here are permitted to register and access GASC Sports
    const rosterData = [
      // Registered Active Athlete Students
      { registerNumber: '23UGCS101', name: 'Arun Kumar S', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', isRegistered: true, registeredUserId: studentUsers[0]._id },
      { registerNumber: '23UGCS102', name: 'Priya Dharshini R', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female', isRegistered: true, registeredUserId: studentUsers[1]._id },
      { registerNumber: '24UGCO205', name: 'Karthik Raja M', department: 'Commerce', year: 'I Year', section: 'B', gender: 'Male', isRegistered: true, registeredUserId: studentUsers[2]._id },
      { registerNumber: '22UGMA310', name: 'Deepa Lakshmi K', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', isRegistered: true, registeredUserId: studentUsers[3]._id },
      { registerNumber: '23UGEN115', name: 'Vigneshwaran T', department: 'English', year: 'II Year', section: 'A', gender: 'Male', isRegistered: true, registeredUserId: studentUsers[4]._id },
      { registerNumber: '24UGPH108', name: 'Anitha S', department: 'Physics', year: 'I Year', section: 'A', gender: 'Female', isRegistered: true, registeredUserId: studentUsers[5]._id },

      // Bonafide GASC Idappadi Students Available to Register
      { registerNumber: '23UGCS103', name: 'Suresh P', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '23UGCS104', name: 'Divya Bharathi M', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Female', isRegistered: false },
      { registerNumber: '24UGCS101', name: 'Manikandan R', department: 'Computer Science', year: 'I Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '24UGCS102', name: 'Meena K', department: 'Computer Science', year: 'I Year', section: 'A', gender: 'Female', isRegistered: false },
      { registerNumber: '22UGCS101', name: 'Praveen Kumar S', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '23UGCO201', name: 'Vijay Anand K', department: 'Commerce', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '23UGCO202', name: 'Swetha N', department: 'Commerce', year: 'II Year', section: 'B', gender: 'Female', isRegistered: false },
      { registerNumber: '24UGCO201', name: 'Gokul Nath S', department: 'Commerce', year: 'I Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '22UGMA301', name: 'Ramya Devi P', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female', isRegistered: false },
      { registerNumber: '23UGMA305', name: 'Naveen Kumar T', department: 'Mathematics', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '24UGTA101', name: 'Selvaraj M', department: 'Tamil', year: 'I Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '23UGTA105', name: 'Kanimozhi R', department: 'Tamil', year: 'II Year', section: 'A', gender: 'Female', isRegistered: false },
      { registerNumber: '23UGEN101', name: 'Harish B', department: 'English', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '24UGPH101', name: 'Soundarya V', department: 'Physics', year: 'I Year', section: 'A', gender: 'Female', isRegistered: false },
      { registerNumber: '23UGCH101', name: 'Dinesh Kumar M', department: 'Chemistry', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '24UGBA101', name: 'Vignesh R', department: 'BBA', year: 'I Year', section: 'A', gender: 'Male', isRegistered: false },
      { registerNumber: '23UGEC101', name: 'Jayakumar S', department: 'Economics', year: 'II Year', section: 'A', gender: 'Male', isRegistered: false }
    ];

    await CollegeStudentRoster.insertMany(rosterData);
    console.log(`Seeded ${rosterData.length} bonafide GASC Idappadi student records into CollegeStudentRoster.`);

    const arunStudent = studentUsers[0];
    const priyaStudent = studentUsers[1];
    const karthikStudent = studentUsers[2];

    // 6. Realistic Equipment with LOW-STOCK DEMO
    // Master prompt specifically mentions:
    // Cricket Ball: Total = 50, Available = 8, Minimum = 10 -> LOW STOCK!
    const equipmentData = [
      {
        name: 'English Willow Cricket Bat',
        code: 'EQ-CKT-001',
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        category: 'Bats & Rackets',
        totalQuantity: 20,
        availableQuantity: 16,
        issuedQuantity: 3,
        damagedQuantity: 1,
        lostQuantity: 0,
        minimumStock: 5,
        purchasePrice: 2800,
        supplier: 'Salem Sports Goods Co.',
        storageLocation: 'Main Sports Room, Rack A1',
        condition: 'Good',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=400&q=80'
      },
      {
        name: 'SG Tournament Leather Cricket Ball',
        code: 'EQ-CKT-002',
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        category: 'Balls & Shuttles',
        totalQuantity: 50,
        availableQuantity: 8, // <= minimumStock (10) -> LOW STOCK ALERT!
        issuedQuantity: 38,
        damagedQuantity: 4,
        lostQuantity: 0,
        minimumStock: 10,
        purchasePrice: 450,
        supplier: 'Salem Sports Goods Co.',
        storageLocation: 'Sports Room, Box 3',
        condition: 'Good',
        status: 'Low Stock',
        image: 'https://images.unsplash.com/photo-1593766788306-2856e0525b78?w=400&q=80'
      },
      {
        name: 'Nivia Premier Match Football (Size 5)',
        code: 'EQ-FTB-001',
        sportId: sportMap['Football']._id,
        sportName: 'Football',
        category: 'Balls & Shuttles',
        totalQuantity: 15,
        availableQuantity: 10,
        issuedQuantity: 5,
        damagedQuantity: 0,
        lostQuantity: 0,
        minimumStock: 4,
        purchasePrice: 1200,
        supplier: 'Olympic Sports Erode',
        storageLocation: 'Sports Room, Shelf B2',
        condition: 'Excellent',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80'
      },
      {
        name: 'Cosco Super Volleyball',
        code: 'EQ-VLB-001',
        sportId: sportMap['Volleyball']._id,
        sportName: 'Volleyball',
        category: 'Balls & Shuttles',
        totalQuantity: 20,
        availableQuantity: 15,
        issuedQuantity: 5,
        damagedQuantity: 0,
        lostQuantity: 0,
        minimumStock: 5,
        purchasePrice: 850,
        supplier: 'Salem Sports Goods Co.',
        storageLocation: 'Sports Room, Shelf C1',
        condition: 'Good',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&q=80'
      },
      {
        name: 'Yonex Carbonex Badminton Racket',
        code: 'EQ-BDM-001',
        sportId: sportMap['Badminton']._id,
        sportName: 'Badminton',
        category: 'Bats & Rackets',
        totalQuantity: 25,
        availableQuantity: 18,
        issuedQuantity: 5,
        damagedQuantity: 2,
        lostQuantity: 0,
        minimumStock: 6,
        purchasePrice: 1650,
        supplier: 'Eagle Sports Coimbatore',
        storageLocation: 'Indoor Badminton Hall Cupboard',
        condition: 'Good',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80'
      },
      {
        name: 'Yonex Mavis 350 Nylon Shuttlecock (Barrel)',
        code: 'EQ-BDM-002',
        sportId: sportMap['Badminton']._id,
        sportName: 'Badminton',
        category: 'Balls & Shuttles',
        totalQuantity: 100,
        availableQuantity: 65,
        issuedQuantity: 30,
        damagedQuantity: 5,
        lostQuantity: 0,
        minimumStock: 20,
        purchasePrice: 720,
        supplier: 'Eagle Sports Coimbatore',
        storageLocation: 'Indoor Badminton Hall Box A',
        condition: 'Good',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=400&q=80'
      },
      {
        name: 'Aluminium Track Relay Batons (Set of 8)',
        code: 'EQ-ATH-001',
        sportId: sportMap['Athletics & Track']._id,
        sportName: 'Athletics & Track',
        category: 'Track & Field Gear',
        totalQuantity: 8,
        availableQuantity: 6,
        issuedQuantity: 2,
        damagedQuantity: 0,
        lostQuantity: 0,
        minimumStock: 2,
        purchasePrice: 1100,
        supplier: 'Olympic Sports Erode',
        storageLocation: 'Track Storage Locker',
        condition: 'Excellent',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80'
      },
      {
        name: 'Official Kabaddi Pro Floor Mat (Set)',
        code: 'EQ-KBD-001',
        sportId: sportMap['Kabaddi']._id,
        sportName: 'Kabaddi',
        category: 'Board & Accessories',
        totalQuantity: 4,
        availableQuantity: 3,
        issuedQuantity: 1,
        damagedQuantity: 0,
        lostQuantity: 0,
        minimumStock: 2,
        purchasePrice: 35000,
        supplier: 'National Sports Mats Delhi',
        storageLocation: 'Gymnasium Storage Area',
        condition: 'Excellent',
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&q=80'
      }
    ];

    const equipmentItems = await Equipment.insertMany(equipmentData);

    // 7. Equipment Transactions (Issued gear for demo students)
    const expectedReturnFuture = new Date();
    expectedReturnFuture.setDate(expectedReturnFuture.getDate() + 5);

    const pastReturn = new Date();
    pastReturn.setDate(pastReturn.getDate() - 2);

    await EquipmentTransaction.create([
      {
        studentId: arunStudent._id,
        studentName: arunStudent.name,
        registerNumber: arunStudent.registerNumber,
        equipmentId: equipmentItems[0]._id, // Bat
        equipmentName: equipmentItems[0].name,
        quantity: 1,
        issueDate: new Date(),
        expectedReturnDate: expectedReturnFuture,
        status: 'Issued',
        purpose: 'Inter-Collegiate Tournament Preparation',
        issuedBy: 'Dr. K. Malathi'
      },
      {
        studentId: arunStudent._id,
        studentName: arunStudent.name,
        registerNumber: arunStudent.registerNumber,
        equipmentId: equipmentItems[1]._id, // Cricket ball
        equipmentName: equipmentItems[1].name,
        quantity: 2,
        issueDate: new Date(),
        expectedReturnDate: expectedReturnFuture,
        status: 'Issued',
        purpose: 'Net practice drills',
        issuedBy: 'Dr. K. Malathi'
      },
      {
        studentId: karthikStudent._id,
        studentName: karthikStudent.name,
        registerNumber: karthikStudent.registerNumber,
        equipmentId: equipmentItems[3]._id, // Volleyball
        equipmentName: equipmentItems[3].name,
        quantity: 1,
        issueDate: new Date(Date.now() - 7 * 86400000),
        expectedReturnDate: pastReturn,
        returnDate: pastReturn,
        status: 'Returned',
        returnCondition: 'Good',
        purpose: 'Evening match practice',
        issuedBy: 'Dr. K. Malathi'
      }
    ]);

    // 8. Competitions
    const compDates = [
      new Date(Date.now() + 14 * 86400000),
      new Date(Date.now() + 25 * 86400000),
      new Date(Date.now() + 40 * 86400000),
      new Date(Date.now() - 15 * 86400000)
    ];

    const competitionsData = [
      {
        name: 'GASC Annual Inter-Department Cricket Trophy 2026',
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        type: 'Inter-Department',
        level: 'College',
        venue: 'GASC Idappadi Main Oval Ground',
        date: compDates[0],
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 10 * 86400000),
        organizer: 'Department of Physical Education, GASC Idappadi',
        eligibility: 'All regular UG & PG students of GASC Idappadi',
        maxParticipants: 60,
        currentRegistrations: 14,
        description: 'Prestigious 15-over inter-departmental knockout cricket championship trophy.',
        bannerImage: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=600&q=80',
        status: 'Registration Open'
      },
      {
        name: 'Periyar University Zonal Volleyball Championship 2026',
        sportId: sportMap['Volleyball']._id,
        sportName: 'Volleyball',
        type: 'University',
        level: 'Zonal',
        venue: 'Salem Sports Complex & District Stadium',
        date: compDates[1],
        startTime: '08:30 AM',
        endTime: '06:00 PM',
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 18 * 86400000),
        organizer: 'Periyar University Physical Education Department',
        eligibility: 'Enrolled collegiate players with valid university ID',
        maxParticipants: 18,
        currentRegistrations: 8,
        description: 'University level selections for inter-zone tournaments and national trials.',
        bannerImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80',
        status: 'Registration Open'
      },
      {
        name: 'Salem District Collegiate Athletics Meet 2026',
        sportId: sportMap['Athletics & Track']._id,
        sportName: 'Athletics & Track',
        type: 'District',
        level: 'District',
        venue: 'Mahatma Gandhi Stadium, Salem',
        date: compDates[2],
        startTime: '07:30 AM',
        endTime: '05:30 PM',
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 30 * 86400000),
        organizer: 'Salem District Athletics Association (SDAA)',
        eligibility: 'Under-25 collegiate student athletes',
        maxParticipants: 80,
        currentRegistrations: 22,
        description: 'Track and field competition covering 100m, 200m, 400m, 4x100m relay, long jump and shot put.',
        bannerImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
        status: 'Registration Open'
      },
      {
        name: 'Inter-College Kabaddi Tournament 2026',
        sportId: sportMap['Kabaddi']._id,
        sportName: 'Kabaddi',
        type: 'Inter-College',
        level: 'District',
        venue: 'GASC Idappadi Indoor Sports Pavilion',
        date: compDates[3],
        startTime: '09:30 AM',
        endTime: '04:30 PM',
        registrationStart: new Date(Date.now() - 30 * 86400000),
        registrationEnd: new Date(Date.now() - 18 * 86400000),
        organizer: 'GASC Idappadi Sports Committee',
        eligibility: 'Government & Aided College teams across Salem & Namakkal',
        maxParticipants: 32,
        currentRegistrations: 16,
        description: 'Annual invitation tournament with 16 participating collegiate teams.',
        bannerImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80',
        status: 'Completed',
        resultSummary: 'Champions: GASC Idappadi Kabaddi Team (Gold Medal). Runners-up: Govt Arts College Salem.'
      }
    ];

    const competitions = await Competition.insertMany(competitionsData);

    // 9. Competition Registrations for Arun and Priya
    await CompetitionRegistration.create([
      {
        competitionId: competitions[0]._id, // Cricket
        studentId: arunStudent._id,
        registrationDate: new Date(),
        status: 'Approved',
        preferredPosition: 'Opening Batsman & Captain',
        adminRemarks: 'Approved as team captain by Sports Incharge Dr. K. Malathi',
        reviewedAt: new Date()
      },
      {
        competitionId: competitions[2]._id, // Athletics
        studentId: priyaStudent._id,
        registrationDate: new Date(),
        status: 'Approved',
        preferredPosition: '100m Sprint & 4x100m Relay Anchor',
        adminRemarks: 'Approved based on trials timing of 12.4s',
        reviewedAt: new Date()
      },
      {
        competitionId: competitions[1]._id, // Volleyball
        studentId: karthikStudent._id,
        registrationDate: new Date(),
        status: 'Pending',
        preferredPosition: 'Setter',
        remarks: 'Attended all morning practice sessions'
      }
    ]);

    // 10. Teams
    await Team.create([
      {
        name: 'Cricket (Computer Science - III Year)',
        captainName: 'Arun Kumar S',
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        department: 'Computer Science',
        year: 'III Year',
        phone: '9876543210',
        status: 'Active'
      },
      {
        name: 'Kabaddi (Mathematics - II Year)',
        captainName: 'M. Suresh',
        sportId: sportMap['Kabaddi']._id,
        sportName: 'Kabaddi',
        department: 'Mathematics',
        year: 'II Year',
        phone: '9842154321',
        status: 'Active'
      },
      {
        name: 'Volleyball (Physics - I Year)',
        captainName: 'P. Vignesh',
        sportId: sportMap['Volleyball']._id,
        sportName: 'Volleyball',
        department: 'Physics',
        year: 'I Year',
        phone: '9789012345',
        status: 'Active'
      }
    ]);

    // 13. Achievements / Wall of Fame Medals
    await Achievement.insertMany([
      {
        studentId: priyaStudent._id,
        studentName: priyaStudent.name,
        registerNumber: priyaStudent.registerNumber,
        department: priyaStudent.department,
        sportId: sportMap['Athletics & Track']._id,
        sportName: 'Athletics & Track',
        competitionName: 'Salem District Collegiate Athletics Meet',
        title: '🥇 Gold Medal – 100m Women Sprint Championship',
        position: '1st Place / Winner',
        medal: 'Gold',
        year: '2025 - 2026',
        date: new Date(Date.now() - 25 * 86400000),
        description: 'Set a new district collegiate timing of 12.18 seconds in the 100m finals.',
        photo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&q=80',
        isFeatured: true
      },
      {
        studentId: studentUsers[4]._id, // Vigneshwaran
        studentName: studentUsers[4].name,
        registerNumber: studentUsers[4].registerNumber,
        department: studentUsers[4].department,
        sportId: sportMap['Kabaddi']._id,
        sportName: 'Kabaddi',
        competitionName: 'Inter-College Kabaddi Tournament 2026',
        title: '🥇 Championship Winners Trophy & Gold Medal – Kabaddi',
        position: 'Champions / 1st Place',
        medal: 'Gold',
        year: '2025 - 2026',
        date: new Date(Date.now() - 14 * 86400000),
        description: 'Captained GASC Idappadi team to victory scoring 18 raid points in the grand finale.',
        photo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&q=80',
        isFeatured: true
      },
      {
        studentId: arunStudent._id,
        studentName: arunStudent.name,
        registerNumber: arunStudent.registerNumber,
        department: arunStudent.department,
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        competitionName: 'Periyar University Inter-Collegiate Cricket Cup',
        title: '🥈 Silver Medal – Runners Up & Best Batsman of Tournament',
        position: '2nd Place / Runner-up',
        medal: 'Silver',
        year: '2024 - 2025',
        date: new Date(Date.now() - 90 * 86400000),
        description: 'Scored 342 runs in 5 innings with two centuries for GASC Idappadi.',
        photo: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=500&q=80',
        isFeatured: true
      },
      {
        studentId: studentUsers[3]._id, // Deepa Lakshmi
        studentName: studentUsers[3].name,
        registerNumber: studentUsers[3].registerNumber,
        department: studentUsers[3].department,
        sportId: sportMap['Badminton']._id,
        sportName: 'Badminton',
        competitionName: 'Salem Zonal Collegiate Badminton Championship',
        title: '🥉 Bronze Medal – Women Singles Badminton',
        position: '3rd Place',
        medal: 'Bronze',
        year: '2025 - 2026',
        date: new Date(Date.now() - 45 * 86400000),
        description: 'Secured podium finish competing against 32 collegiate players from Salem district.',
        photo: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&q=80',
        isFeatured: true
      }
    ]);

    // 14. Notifications
    await Notification.insertMany([
      {
        title: '🏆 Annual Inter-Department Cricket Tournament Registrations Open!',
        message: 'All students are invited to register for the upcoming Inter-Department Cricket Trophy 2026. Register through your student dashboard before the closing deadline.',
        category: 'Competition',
        targetType: 'All Students',
        priority: 'High',
        sender: 'Dr. K. Malathi (Sports Incharge)'
      },
      {
        title: '⚠️ LOW STOCK ALERT: SG Tournament Leather Cricket Ball',
        message: 'SG Tournament Leather Cricket Ball inventory is low! Available stock is now 8, which is at or below the minimum reserve level of 10. Please initiate purchase/replenishment.',
        category: 'Equipment',
        targetType: 'All Students',
        priority: 'Urgent',
        sender: 'Inventory Monitor System'
      },
      {
        title: '🏏 Morning Cricket Net Practice Scheduled for Tomorrow',
        message: 'Mandatory morning training session for all registered cricket squad players tomorrow at 06:30 AM at the College Cricket Nets. Wear white college sports jersey.',
        category: 'Practice',
        targetType: 'All Students',
        priority: 'Normal',
        sender: 'Dr. K. Malathi'
      },
      {
        title: '🥇 Hearty Congratulations to Priya Dharshini R!',
        message: 'Department of Physical Education proudly congratulates Priya Dharshini R (II B.Sc CS) for winning Gold Medal in the 100m Sprint at Salem District Athletics!',
        category: 'General',
        targetType: 'All Students',
        priority: 'High',
        sender: 'Dr. K. Malathi'
      }
    ]);

    // 15. Sports Gallery Moments
    await Gallery.insertMany([
      {
        title: 'Annual Sports Day 2025 - Grand March Past',
        description: 'Collegiate athletes representing 8 academic departments participating in the ceremonial march past.',
        category: 'Annual Sports Day',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
        date: new Date(Date.now() - 120 * 86400000)
      },
      {
        title: 'Zonal Kabaddi Championship Victory Celebration',
        description: 'GASC Idappadi Kabaddi team lifting the Champions Trophy with Principal and Sports Incharge.',
        category: 'Tournaments',
        sportId: sportMap['Kabaddi']._id,
        sportName: 'Kabaddi',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80',
        date: new Date(Date.now() - 14 * 86400000)
      },
      {
        title: 'Inter-Department Cricket Tournament Finals',
        description: 'Exciting final over moments between Computer Science and Commerce departments.',
        category: 'Tournaments',
        sportId: sportMap['Cricket']._id,
        sportName: 'Cricket',
        image: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=600&q=80',
        date: new Date(Date.now() - 60 * 86400000)
      },
      {
        title: 'State Level Medal Distribution Ceremony',
        description: 'Student athletes receiving gold and silver medals along with merit scholarships.',
        category: 'Prize Distribution',
        image: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=600&q=80',
        date: new Date(Date.now() - 45 * 86400000)
      }
    ]);

    console.log('--- Seeding Completed Successfully! ---');
    console.log('Default Admin: admin@gascidappadi.edu.in / admin123 (or username: admin)');
    console.log('Sample Student: Register No: 23UGCS101 / student123');
    return true;
  } catch (error) {
    console.error('Seeding Error:', error);
    throw error;
  }
};

// If run directly via `node seedData.js`
if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    await seedAll();
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seedAll;
