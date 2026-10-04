const { supabase, toCamelCase } = require('../utils/supabaseHelper');
const AIInsightsService = require('../services/aiInsightsService');

// @desc    Get Admin Dashboard Master KPIs
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getAdminDashboardData = async (req, res) => {
  try {
    const [
      { count: totalPlayers },
      { count: activePlayers },
      { count: totalSports },
      { data: equipmentList },
      { count: upcomingCompetitions },
      { count: pendingApplications },
      { count: totalAchievements },
      { count: totalTeams },
      aiInsights
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'Active'),
      supabase.from('sports').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('equipment').select('total_quantity, available_quantity, issued_quantity, damaged_quantity, lost_quantity, minimum_stock'),
      supabase.from('competitions').select('*', { count: 'exact', head: true }).in('status', ['Upcoming', 'Registration Open', 'Ongoing']),
      supabase.from('competition_registrations').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('achievements').select('*', { count: 'exact', head: true }),
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      AIInsightsService.generateInsights()
    ]);

    let eqTotal = 0;
    let eqAvailable = 0;
    let eqIssued = 0;
    let eqDamaged = 0;
    let eqLost = 0;
    let lowStockCount = 0;

    (equipmentList || []).forEach(eq => {
      eqTotal += eq.total_quantity || 0;
      eqAvailable += eq.available_quantity || 0;
      eqIssued += eq.issued_quantity || 0;
      eqDamaged += eq.damaged_quantity || 0;
      eqLost += eq.lost_quantity || 0;
      if ((eq.available_quantity || 0) <= (eq.minimum_stock || 5)) {
        lowStockCount++;
      }
    });

    // Recent activities
    const [
      { data: recentRegsRaw },
      { data: recentTxsRaw },
      { data: recentAchsRaw },
      { data: latestNotifsRaw }
    ] = await Promise.all([
      supabase.from('competition_registrations').select('*').order('registration_date', { ascending: false }).limit(5),
      supabase.from('equipment_transactions').select('*, users(name, register_number), equipment(name, code)').order('issue_date', { ascending: false }).limit(5),
      supabase.from('achievements').select('*').order('created_at', { ascending: false }).limit(4),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    const recentRegistrations = (recentRegsRaw || []).map(r => {
      const item = toCamelCase(r);
      const studentObj = r.users || {
        name: r.student_name || 'Student Athlete',
        registerNumber: r.register_number || 'N/A',
        department: r.department || 'General',
        profilePhoto: r.profile_photo || ''
      };
      item.studentId = toCamelCase(studentObj);

      const compObj = r.competitions || {
        name: r.competition_name || `${r.sport_name || 'Sport'} Competition`,
        sportName: r.sport_name || 'General',
        date: r.registration_date
      };
      item.competitionId = toCamelCase(compObj);
      return item;
    });

    const recentTransactions = (recentTxsRaw || []).map(t => {
      const item = toCamelCase(t);
      if (t.users) item.studentId = toCamelCase(t.users);
      if (t.equipment) item.equipmentId = toCamelCase(t.equipment);
      return item;
    });

    const recentAchievements = (recentAchsRaw || []).map(toCamelCase);
    const latestNotifications = (latestNotifsRaw || []).map(toCamelCase);

    res.json({
      success: true,
      kpis: {
        totalPlayers: totalPlayers || 0,
        activePlayers: activePlayers || 0,
        totalSports: totalSports || 0,
        totalEquipment: eqTotal,
        availableEquipment: eqAvailable,
        issuedEquipment: eqIssued,
        damagedEquipment: eqDamaged,
        lostEquipment: eqLost,
        lowStockCount,
        upcomingCompetitions: upcomingCompetitions || 0,
        pendingApplications: pendingApplications || 0,
        totalAchievements: totalAchievements || 0,
        totalTeams: totalTeams || 0
      },
      aiInsights,
      recentRegistrations,
      recentTransactions,
      recentAchievements,
      latestNotifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chart data for visual analytics
// @route   GET /api/analytics/charts
// @access  Private/Admin
exports.getChartData = async (req, res) => {
  try {
    // 1. Players by Department
    const { data: studentsRaw } = await supabase
      .from('users')
      .select('department')
      .eq('role', 'student');

    const deptMap = {};
    (studentsRaw || []).forEach(s => {
      const d = s.department || 'General';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });

    const deptLabels = Object.keys(deptMap);
    const deptValues = Object.values(deptMap);

    // 2. Equipment Status Breakdown
    const { data: eqList } = await supabase
      .from('equipment')
      .select('available_quantity, issued_quantity, damaged_quantity, lost_quantity');

    let eqStatus = { available: 0, issued: 0, damaged: 0, lost: 0 };
    (eqList || []).forEach(eq => {
      eqStatus.available += eq.available_quantity || 0;
      eqStatus.issued += eq.issued_quantity || 0;
      eqStatus.damaged += eq.damaged_quantity || 0;
      eqStatus.lost += eq.lost_quantity || 0;
    });

    // 3. Players by Primary Sport
    const { data: sportsRaw } = await supabase.from('sports').select('id, name').eq('status', 'Active');
    const { data: profilesRaw } = await supabase.from('player_profiles').select('primary_sport');

    const sportCounts = {};
    (profilesRaw || []).forEach(p => {
      if (p.primary_sport) {
        sportCounts[p.primary_sport] = (sportCounts[p.primary_sport] || 0) + 1;
      }
    });

    const sportsData = (sportsRaw || []).map(s => ({
      sport: s.name,
      count: sportCounts[s.id] || 0
    }));

    // 4. Medals breakdown
    const { data: achRaw } = await supabase.from('achievements').select('medal');
    const medalMap = {};
    (achRaw || []).forEach(a => {
      const m = a.medal || 'Participation / Trophy';
      medalMap[m] = (medalMap[m] || 0) + 1;
    });

    const medals = Object.entries(medalMap).map(([k, v]) => ({ _id: k, count: v }));

    res.json({
      success: true,
      departmentChart: {
        labels: deptLabels.length > 0 ? deptLabels : ['Computer Science', 'Commerce', 'Mathematics'],
        data: deptValues.length > 0 ? deptValues : [1, 1, 1]
      },
      equipmentChart: eqStatus,
      sportsChart: {
        labels: sportsData.map(s => s.sport),
        data: sportsData.map(s => s.count)
      },
      medalsChart: medals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Student Dashboard Overview
// @route   GET /api/analytics/student-dashboard
// @access  Private/Student
exports.getStudentDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [
      { data: profileRaw },
      { data: myAppsRaw },
      { data: myTeamsRaw },
      { data: myEqRaw },
      { data: myAchsRaw },
      { data: upCompsRaw },
      { data: notifsRaw }
    ] = await Promise.all([
      supabase.from('player_profiles').select('*').eq('user_id', studentId).maybeSingle(),
      supabase.from('competition_registrations').select('*').eq('student_id', studentId).order('registration_date', { ascending: false }),
      supabase.from('teams').select('*').or(`department.ilike.%${req.user.department}%,captain_name.ilike.%${req.user.name}%`),
      supabase.from('equipment_transactions').select('*').eq('student_id', studentId).eq('status', 'Issued'),
      supabase.from('achievements').select('*').eq('student_id', studentId),
      supabase.from('competitions').select('*').eq('status', 'Registration Open').order('date', { ascending: true }).limit(4),
      supabase.from('notifications').select('*').or(`target_type.eq.All Students,target_id.eq.${studentId}`).order('created_at', { ascending: false }).limit(5)
    ]);

    const profile = profileRaw ? toCamelCase(profileRaw) : null;
    if (profile && profileRaw.sports) profile.primarySport = toCamelCase(profileRaw.sports);

    const myApplications = (myAppsRaw || []).map(a => {
      const item = toCamelCase(a);
      if (a.competitions) item.competitionId = toCamelCase(a.competitions);
      return item;
    });

    const myTeams = (myTeamsRaw || []).map(toCamelCase);

    const issuedEquipment = (myEqRaw || []).map(e => {
      const item = toCamelCase(e);
      if (e.equipment) item.equipmentId = toCamelCase(e.equipment);
      return item;
    });

    const achievements = (myAchsRaw || []).map(toCamelCase);

    const upcomingCompetitions = (upCompsRaw || []).map(c => {
      const item = toCamelCase(c);
      if (c.sports) item.sportId = toCamelCase(c.sports);
      return item;
    });

    const notifications = (notifsRaw || []).map(toCamelCase);

    const now = new Date();
    const overdueCount = issuedEquipment.filter(e => new Date(e.expectedReturnDate) < now).length;

    res.json({
      success: true,
      stats: {
        primarySport: profile && profile.primarySport ? profile.primarySport.name : 'General Athletics',
        position: profile ? profile.position : 'All Rounder',
        teamCount: myTeams.length,
        primaryTeam: myTeams.length > 0 ? myTeams[0].name : `${req.user.department} Team`,
        achievementsCount: achievements.length,
        upcomingEventsCount: upcomingCompetitions.length,
        issuedEquipmentCount: issuedEquipment.length,
        overdueCount,
        applicationsCount: myApplications.length
      },
      profile,
      myApplications,
      myTeams,
      issuedEquipment,
      achievements,
      upcomingCompetitions,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Detailed Registration Analytics for Sports Incharge / Admin
// @route   GET /api/analytics/registrations
// @access  Private/Admin
exports.getRegistrationAnalytics = async (req, res) => {
  try {
    const {
      tournament,
      sport,
      gender,
      department,
      status,
      startDate,
      endDate
    } = req.query;

    // 1. Fetch raw registrations with relations
    const [
      { data: rawRegs, error: regErr },
      { data: rawRules },
      { data: rawComps }
    ] = await Promise.all([
      supabase
        .from('competition_registrations')
        .select('*, users(id, name, register_number, department, gender, year, mobile, email), competitions(id, name, tournament_name, sport_id, sport_name, type, date, venue)'),
      supabase.from('sport_rules').select('*'),
      supabase.from('competitions').select('id, name, tournament_name, sport_name, type')
    ]);

    if (regErr) {
      return res.status(500).json({ success: false, message: regErr.message });
    }

    // Standardize sport rules mapping
    const rulesMap = {};
    (rawRules || []).forEach(r => {
      if (r.sport_name) rulesMap[r.sport_name.toLowerCase()] = r;
      if (r.sport_id) rulesMap[r.sport_id.toLowerCase()] = r;
    });

    const isTeamSport = (sportName) => {
      const s = (sportName || '').toLowerCase();
      if (rulesMap[s]) {
        return (rulesMap[s].competition_type || rulesMap[s].competitionType || '').toUpperCase() === 'TEAM';
      }
      const defaultTeamSports = ['cricket', 'football', 'kabaddi', 'volleyball', 'basketball', 'handball', 'kho kho', 'throwball', 'hockey', 'relay'];
      return defaultTeamSports.some(ts => s.includes(ts));
    };

    // Department standardizer for consistent analytics display
    const standardizeDept = (dept) => {
      if (!dept) return 'General';
      const d = dept.trim();
      if (d === 'Computer Science' || d === 'B.Sc Computer Science') return 'B.Sc CS';
      if (d === 'Mathematics' || d === 'B.Sc Mathematics' || d === 'Maths') return 'B.Sc Maths';
      if (d === 'Commerce' || d === 'B COM') return 'B.Com';
      if (d === 'Business Administration') return 'BBA';
      if (d === 'Computer Applications' || d === 'B.C.A.') return 'BCA';
      return d;
    };

    // Filter Options gathered across all records
    const allTournamentsSet = new Set();
    const allSportsSet = new Set();
    const allDepartmentsSet = new Set();

    (rawComps || []).forEach(c => {
      const t = c.tournament_name || (c.name ? c.name.split('-')[0].trim() : 'SPARK 2026');
      if (t) allTournamentsSet.add(t);
      if (c.sport_name) allSportsSet.add(c.sport_name);
    });

    // Process & Filter Registrations
    const processedRegs = (rawRegs || []).map(r => {
      const u = r.users || {};
      const c = r.competitions || {};

      const studentName = u.name || r.student_name || 'Student Athlete';
      const registerNumber = u.register_number || r.register_number || 'N/A';
      const rawGender = u.gender || r.gender || 'Male';
      const genderDisplay = (rawGender === 'Female' || rawGender.toLowerCase() === 'girl' || rawGender.toLowerCase() === 'female') ? 'Girls' : 'Boys';
      const deptDisplay = standardizeDept(u.department || r.department);
      allDepartmentsSet.add(deptDisplay);

      const compSport = c.sport_name || r.sport_name || (c.name ? c.name.split(' ')[0] : 'General');
      allSportsSet.add(compSport);

      const compTourn = c.tournament_name || r.tournament_name || (c.name ? c.name.split('-')[0].trim() : 'SPARK 2026 Annual Sports Fest');
      allTournamentsSet.add(compTourn);

      const teamEvent = isTeamSport(compSport);
      const regType = teamEvent ? 'TEAM' : 'INDIVIDUAL';
      const regStatus = r.status || 'Registered';
      const regDate = r.registration_date || r.created_at || new Date().toISOString();

      return {
        id: r.id || r._id,
        studentId: u.id || r.student_id,
        studentName,
        registerNumber,
        gender: genderDisplay,
        rawGender,
        department: deptDisplay,
        sportName: compSport,
        sportId: c.sport_id,
        tournamentName: compTourn,
        competitionId: c.id || r.competition_id,
        registrationType: regType,
        isTeam: teamEvent,
        status: regStatus,
        registrationCode: r.registration_code || 'GASC-REG',
        registrationDate: regDate
      };
    });

    // Apply Active Filters
    const filtered = processedRegs.filter(item => {
      // Tournament filter
      if (tournament && tournament !== 'All') {
        if (item.tournamentName !== tournament && item.competitionId !== tournament) return false;
      }
      // Sport filter
      if (sport && sport !== 'All') {
        if (item.sportName.toLowerCase() !== sport.toLowerCase() && item.sportId !== sport) return false;
      }
      // Gender filter (Boys / Girls)
      if (gender && gender !== 'All') {
        if (item.gender.toLowerCase() !== gender.toLowerCase()) return false;
      }
      // Department filter
      if (department && department !== 'All') {
        if (item.department !== department && standardizeDept(item.department) !== standardizeDept(department)) return false;
      }
      // Registration Status filter
      if (status && status !== 'All') {
        if (item.status.toLowerCase() !== status.toLowerCase()) return false;
      }
      // Date Range filter
      if (startDate) {
        if (new Date(item.registrationDate) < new Date(startDate)) return false;
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (new Date(item.registrationDate) > endDateTime) return false;
      }

      return true;
    });

    // 2. Compute Summary Cards
    const totalRegistered = filtered.length;
    let boysCount = 0;
    let girlsCount = 0;
    let teamSportsCount = 0;
    let individualSportsCount = 0;
    const activeSportsSet = new Set();
    const activeDeptsSet = new Set();

    filtered.forEach(r => {
      if (r.gender === 'Boys') boysCount++;
      else if (r.gender === 'Girls') girlsCount++;

      if (r.isTeam) teamSportsCount++;
      else individualSportsCount++;

      if (r.sportName) activeSportsSet.add(r.sportName);
      if (r.department) activeDeptsSet.add(r.department);
    });

    const summaryCards = {
      totalRegistered,
      boys: boysCount,
      girls: girlsCount,
      totalSports: activeSportsSet.size,
      totalDepartments: activeDeptsSet.size,
      teamSportsRegistrations: teamSportsCount,
      individualSportsRegistrations: individualSportsCount
    };

    // 3. Department-wise Analytics Table
    const deptMap = {};
    filtered.forEach(r => {
      const d = r.department;
      if (!deptMap[d]) deptMap[d] = { department: d, boys: 0, girls: 0, total: 0 };
      if (r.gender === 'Boys') deptMap[d].boys++;
      else if (r.gender === 'Girls') deptMap[d].girls++;
      deptMap[d].total++;
    });
    const departmentWise = Object.values(deptMap).sort((a, b) => b.total - a.total);

    // 4. Sport-wise Analytics Table
    const sportMap = {};
    filtered.forEach(r => {
      const s = r.sportName;
      if (!sportMap[s]) sportMap[s] = { sport: s, competitionType: r.registrationType, boys: 0, girls: 0, total: 0 };
      if (r.gender === 'Boys') sportMap[s].boys++;
      else if (r.gender === 'Girls') sportMap[s].girls++;
      sportMap[s].total++;
    });
    const sportWise = Object.values(sportMap).sort((a, b) => b.total - a.total);

    // 5. Department × Sport Matrix
    // Collect distinct departments and sports from filtered set (or all configured)
    const matrixDepts = Array.from(activeDeptsSet).length > 0 
      ? Array.from(activeDeptsSet).sort() 
      : ['B.Sc CS', 'B.Sc Maths', 'BCA', 'B.Com'];
    const matrixSports = Array.from(activeSportsSet).length > 0
      ? Array.from(activeSportsSet).sort()
      : ['Cricket', 'Football', 'Kabaddi', 'Badminton'];

    const matrix = {};
    matrixDepts.forEach(d => {
      matrix[d] = {};
      matrixSports.forEach(s => {
        matrix[d][s] = 0;
      });
    });

    filtered.forEach(r => {
      if (matrix[r.department] && matrix[r.department][r.sportName] !== undefined) {
        matrix[r.department][r.sportName]++;
      }
    });

    const matrixRows = matrixDepts.map(d => {
      let deptTotal = 0;
      const counts = {};
      matrixSports.forEach(s => {
        const val = (matrix[d] && matrix[d][s]) || 0;
        counts[s] = val;
        deptTotal += val;
      });
      return {
        department: d,
        counts,
        total: deptTotal
      };
    }).sort((a, b) => b.total - a.total);

    // Matrix Column Totals
    const matrixColTotals = {};
    matrixSports.forEach(s => {
      matrixColTotals[s] = matrixRows.reduce((acc, row) => acc + (row.counts[s] || 0), 0);
    });

    // 6. Boys / Girls Analytics
    const boyPercentage = totalRegistered > 0 ? Math.round((boysCount / totalRegistered) * 100) : 0;
    const girlPercentage = totalRegistered > 0 ? Math.round((girlsCount / totalRegistered) * 100) : 0;
    const sportGenderBreakdown = sportWise.map(s => ({
      sport: s.sport,
      boys: s.boys,
      girls: s.girls,
      total: s.total
    }));

    // 7. Filter Options
    const filterOptions = {
      tournaments: Array.from(allTournamentsSet).sort(),
      sports: Array.from(allSportsSet).sort(),
      departments: Array.from(allDepartmentsSet).sort(),
      statuses: ['Registered', 'Pending', 'Cancelled']
    };

    res.json({
      success: true,
      analytics: {
        summaryCards,
        departmentWise,
        sportWise,
        matrix: {
          columns: matrixSports,
          rows: matrixRows,
          totals: matrixColTotals
        },
        genderAnalytics: {
          boys: boysCount,
          girls: girlsCount,
          boyPercentage,
          girlPercentage,
          sportBreakdown: sportGenderBreakdown
        },
        students: filtered,
        filterOptions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

