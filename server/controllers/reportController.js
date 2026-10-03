const { supabase, toCamelCase } = require('../utils/supabaseHelper');

// @desc    Generate Master Sports Department Reports
// @route   GET /api/reports/:type
// @access  Private/Admin
exports.getReportData = async (req, res) => {
  try {
    const { type } = req.params;

    const { data: settingsRaw } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

    const settings = settingsRaw ? toCamelCase(settingsRaw) : {
      collegeName: 'Government Arts and Science College, Idappadi',
      departmentName: 'Department of Physical Education & Sports',
      sportsInchargeName: 'Dr. K. Malathi, M.P.Ed., M.Phil., Ph.D.'
    };

    let reportTitle = '';
    let data = [];

    switch (type) {
      case 'players': {
        reportTitle = 'Official Registered Players Directory';
        const { data: playersRaw } = await supabase
          .from('users')
          .select('name, register_number, department, year, section, gender, mobile, email, status, created_at')
          .eq('role', 'student')
          .order('department', { ascending: true })
          .order('name', { ascending: true });
        data = (playersRaw || []).map(toCamelCase);
        break;
      }

      case 'equipment-stock': {
        reportTitle = 'Sports Equipment Inventory & Stock Reserve Report';
        const { data: eqRaw } = await supabase
          .from('equipment')
          .select('*')
          .order('sport_name', { ascending: true })
          .order('name', { ascending: true });
        data = (eqRaw || []).map(toCamelCase);
        break;
      }

      case 'equipment-transactions': {
        reportTitle = 'Equipment Issue & Return Audit Log';
        const { data: txsRaw } = await supabase
          .from('equipment_transactions')
          .select('*, users(name, register_number, department), equipment(name, code)')
          .order('issue_date', { ascending: false });
        data = (txsRaw || []).map(t => {
          const item = toCamelCase(t);
          if (t.users) item.studentId = toCamelCase(t.users);
          if (t.equipment) item.equipmentId = toCamelCase(t.equipment);
          return item;
        });
        break;
      }

      case 'competitions': {
        reportTitle = 'Collegiate & Zonal Competitions Summary Report';
        const { data: compsRaw } = await supabase
          .from('competitions')
          .select('*')
          .order('date', { ascending: false });
        data = (compsRaw || []).map(toCamelCase);
        break;
      }

      case 'teams': {
        reportTitle = 'College Sports Teams & Captains Directory';
        const { data: teamsRaw } = await supabase
          .from('teams')
          .select('*')
          .order('sport_name', { ascending: true })
          .order('department', { ascending: true });
        data = (teamsRaw || []).map(toCamelCase);
        break;
      }

      case 'achievements': {
        reportTitle = 'Hall of Fame & Medalist Honours Report';
        const { data: achsRaw } = await supabase
          .from('achievements')
          .select('*')
          .order('date', { ascending: false });
        data = (achsRaw || []).map(toCamelCase);
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type requested.' });
    }

    res.json({
      success: true,
      reportType: type,
      reportTitle,
      college: settings.collegeName,
      department: settings.departmentName,
      incharge: settings.sportsInchargeName,
      generatedAt: new Date(),
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Tournament Registration Report
// @route   GET /api/reports/tournament-registrations
// @access  Private/Admin
exports.getTournamentRegistrationReport = async (req, res) => {
  try {
    const { tournamentName, sport, gender, department } = req.query;

    if (!tournamentName || tournamentName === 'All') {
      return res.status(400).json({ success: false, message: 'Please select a tournament.' });
    }

    // ── 1. Load college settings ───────────────────────────────────────────
    const { data: settingsRaw } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

    const settings = settingsRaw ? toCamelCase(settingsRaw) : {
      collegeName: 'Government Arts and Science College, Idappadi',
      departmentName: 'Department of Physical Education & Sports',
      sportsInchargeName: 'Dr. K. Malathi, M.P.Ed., M.Phil., Ph.D.'
    };

    // ── 2. Fetch all sports to determine individual vs team ────────────────
    const { data: sportsRaw } = await supabase.from('sports').select('id, name, category, player_count');
    const sportsMap = {};
    (sportsRaw || []).forEach(s => {
      sportsMap[s.name.toLowerCase()] = s;
      sportsMap[s.id] = s;
    });

    const teamSportNames = new Set([
      'cricket', 'football', 'kabaddi', 'volleyball', 'handball',
      'basketball', 'hockey', 'kho kho', 'throwball', 'relay'
    ]);

    const isTeamSport = (sportName, compType) => {
      if (compType) {
        if (compType.toLowerCase() === 'team') return true;
        if (compType.toLowerCase() === 'individual') return false;
      }
      const s = (sportName || '').trim().toLowerCase();
      if (teamSportNames.has(s)) return true;
      const sportObj = sportsMap[s];
      if (sportObj && sportObj.type) {
        return sportObj.type.toLowerCase() === 'team';
      }
      return false;
    };

    // ── 3. Fetch all registrations, competitions, users ───────────────────
    const { data: allRegsRaw } = await supabase
      .from('competition_registrations')
      .select('*')
      .order('registration_date', { ascending: true });

    const { data: allCompsRaw } = await supabase.from('competitions').select('*');
    const compsMap = {};
    (allCompsRaw || []).forEach(c => {
      if (c.id) compsMap[c.id] = c;
    });

    const { data: allUsersRaw } = await supabase.from('users').select('*');
    const usersMap = {};
    (allUsersRaw || []).forEach(u => {
      if (u.id) usersMap[u.id] = u;
      if (u.register_number) usersMap[u.register_number.trim().toUpperCase()] = u;
    });

    // Filter by tournament (flexible matching)
    const tLower = tournamentName.trim().toLowerCase();
    let filtered = (allRegsRaw || []).filter(r => {
      const c = compsMap[r.competition_id] || compsMap[r.tournament_id] || {};
      const rTourn = (r.tournament_name || c.tournament_name || (c.name || '').split('-')[0].trim() || '').toLowerCase();
      return rTourn === tLower ||
             rTourn.includes(tLower) ||
             tLower.includes(rTourn);
    });

    // Apply sport filter
    if (sport && sport !== 'All') {
      const sLower = sport.trim().toLowerCase();
      filtered = filtered.filter(r => {
        const c = compsMap[r.competition_id] || compsMap[r.tournament_id] || {};
        const sName = (r.sport_name || c.sport_name || '').toLowerCase();
        return sName === sLower;
      });
    }

    // Apply gender filter
    if (gender && gender !== 'All') {
      filtered = filtered.filter(r => {
        const regNumKey = (r.register_number || '').trim().toUpperCase();
        const u = usersMap[r.student_id] || (regNumKey ? usersMap[regNumKey] : null);
        const uGender = ((u && u.gender) ? u.gender : (r.gender || '')).toLowerCase();
        const gLower = gender.toLowerCase();
        if (gLower === 'boys') return uGender === 'male' || uGender === 'boy' || uGender === 'boys';
        if (gLower === 'girls') return uGender === 'female' || uGender === 'girl' || uGender === 'girls';
        return true;
      });
    }

    // Apply department filter
    if (department && department !== 'All') {
      const dLower = department.trim().toLowerCase();
      filtered = filtered.filter(r => {
        const regNumKey = (r.register_number || '').trim().toUpperCase();
        const u = usersMap[r.student_id] || (regNumKey ? usersMap[regNumKey] : null);
        const uDept = ((u && u.department) ? u.department : (r.department || '')).toLowerCase();
        return uDept === dLower || uDept.includes(dLower) || dLower.includes(uDept);
      });
    }

    // ── 4. Fetch all teams & team_members for this tournament ─────────────
    const { data: allTeamsRaw } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: allTeamMembersRaw } = await supabase.from('team_members').select('*');
    const teamMembersByTeamId = {};
    (allTeamMembersRaw || []).forEach(tm => {
      if (!teamMembersByTeamId[tm.team_id]) teamMembersByTeamId[tm.team_id] = [];
      teamMembersByTeamId[tm.team_id].push(tm);
    });

    // Build a map: studentId/regNumber → { teamName, teamId, sportName }
    const teamAssignMap = {};
    (allTeamsRaw || []).forEach(t => {
      const tTourn = (t.tournament_name || '').toLowerCase();
      const matchTourn = tTourn === tLower ||
                         tTourn.includes(tLower) ||
                         tLower.includes(tTourn);
      if (!matchTourn) return;

      const members = (Array.isArray(t.team_members) && t.team_members.length > 0)
        ? t.team_members
        : (teamMembersByTeamId[t.id] || []);

      members.forEach(tm => {
        const assignObj = {
          teamName: t.name || `${t.department || ''} ${t.sport_name || ''} Team`.trim(),
          teamId: t.id,
          sportName: t.sport_name
        };
        if (tm.student_id) teamAssignMap[tm.student_id] = assignObj;
        if (tm.register_number) teamAssignMap[tm.register_number.trim().toUpperCase()] = assignObj;
      });
    });

    // ── 5. Build registration rows ─────────────────────────────────────────
    const individualRows = [];
    const teamRows = [];
    const teamSports = new Set();
    const teamsFound = new Set();

    filtered.forEach((r) => {
      const regNumKey = (r.register_number || '').trim().toUpperCase();
      const u = usersMap[r.student_id] || (regNumKey ? usersMap[regNumKey] : {}) || {};
      const c = compsMap[r.competition_id] || compsMap[r.tournament_id] || {};
      const sportName = r.sport_name || c.sport_name || 'Unknown Sport';
      const studentName = (r.student_name || u.name || 'Unknown').trim();
      const registerNumber = r.register_number || u.register_number || 'N/A';
      const dept = r.department || u.department || 'N/A';
      const yr = r.year || u.year || 'N/A';
      const rawGender = r.gender || u.gender || 'N/A';
      const genderVal = (rawGender.toLowerCase() === 'male' || rawGender.toLowerCase() === 'boys') ? 'Boys' :
                        (rawGender.toLowerCase() === 'female' || rawGender.toLowerCase() === 'girls') ? 'Girls' : rawGender;

      if (isTeamSport(sportName, c.type)) {
        teamSports.add(sportName);
        const assignment = teamAssignMap[r.student_id] || teamAssignMap[u.id] || (regNumKey ? teamAssignMap[regNumKey] : null);
        const teamNameVal = (assignment && assignment.sportName &&
          assignment.sportName.toLowerCase() === sportName.toLowerCase())
          ? assignment.teamName
          : null;
        if (teamNameVal) teamsFound.add(teamNameVal);

        teamRows.push({
          sNo: teamRows.length + 1,
          sportName,
          teamName: teamNameVal || 'Not Assigned',
          registerNumber,
          playerName: studentName,
          year: yr,
          department: dept,
          gender: genderVal,
          teamStatus: teamNameVal ? 'Selected' : 'Not Assigned',
          registrationStatus: r.status || 'Registered'
        });
      } else {
        individualRows.push({
          sNo: individualRows.length + 1,
          sportName,
          registerNumber,
          playerName: studentName,
          year: yr,
          department: dept,
          gender: genderVal,
          registrationStatus: r.status || 'Registered'
        });
      }
    });

    // ── 6. Build all department rows ordered by Department ─────────────
    const allDepartmentRows = [
      ...individualRows.map(r => ({
        ...r,
        sportType: 'Individual',
        teamName: '-',
        teamStatus: 'N/A'
      })),
      ...teamRows.map(r => ({
        ...r,
        sportType: 'Team'
      }))
    ].sort((a, b) => {
      const deptA = (a.department || '').toLowerCase();
      const deptB = (b.department || '').toLowerCase();
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      const yrA = (a.year || '').toLowerCase();
      const yrB = (b.year || '').toLowerCase();
      if (yrA !== yrB) return yrA.localeCompare(yrB);
      return (a.playerName || '').localeCompare(b.playerName || '');
    }).map((r, i) => ({
      ...r,
      overallSNo: i + 1
    }));

    // Group by department
    const groupedByDepartment = {};
    allDepartmentRows.forEach(r => {
      const deptKey = r.department || 'Other / General';
      if (!groupedByDepartment[deptKey]) groupedByDepartment[deptKey] = [];
      groupedByDepartment[deptKey].push({
        ...r,
        deptSNo: groupedByDepartment[deptKey].length + 1
      });
    });

    const departmentSummary = Object.keys(groupedByDepartment).sort().map(dept => ({
      department: dept,
      count: groupedByDepartment[dept].length,
      individualCount: groupedByDepartment[dept].filter(r => r.sportType === 'Individual').length,
      teamCount: groupedByDepartment[dept].filter(r => r.sportType === 'Team').length,
      boysCount: groupedByDepartment[dept].filter(r => r.gender === 'Boys').length,
      girlsCount: groupedByDepartment[dept].filter(r => r.gender === 'Girls').length
    }));

    // ── 7. Counts ──────────────────────────────────────────────────────────
    const summary = {
      totalRegistrations: filtered.length,
      individualRegistrations: individualRows.length,
      teamRegistrations: teamRows.length,
      totalTeams: teamsFound.size,
      totalTeamPlayers: teamRows.filter(r => r.teamStatus !== 'Not Assigned').length,
      totalDepartments: Object.keys(groupedByDepartment).length
    };

    // ── 8. Collect unique sports in filtered data (for UI filter dropdown) ─
    const sportsInReport = [...new Set(filtered.map(r => (r.competitions || {}).sport_name || r.sport_name).filter(Boolean))];

    res.json({
      success: true,
      tournamentName,
      filters: { sport: sport || 'All', gender: gender || 'All', department: department || 'All' },
      college: settings.collegeName,
      department: settings.departmentName,
      incharge: settings.sportsInchargeName,
      generatedAt: new Date(),
      summary,
      individualRows,
      teamRows,
      departmentRows: allDepartmentRows,
      groupedByDepartment,
      departmentSummary,
      sportsInReport
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
