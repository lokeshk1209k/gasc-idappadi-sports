const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public / Private
exports.getAllTeams = async (req, res) => {
  try {
    const { sportId, department, year, search } = req.query;

    let query = supabase.from('teams').select('*');

    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);
    if (department && department !== 'All') {
      if (department === 'Maths' || department === 'Mathematics') {
        query = query.in('department', ['Maths', 'Mathematics']);
      } else if (department === 'B.Com' || department === 'Commerce' || department === 'B COM') {
        query = query.in('department', ['B.Com', 'Commerce', 'B COM']);
      } else if (department === 'BBA' || department === 'Business Administration') {
        query = query.in('department', ['BBA', 'Business Administration']);
      } else if (department === 'BMA' || department === 'MBA') {
        query = query.in('department', ['BMA', 'MBA']);
      } else if (department === 'M.Com' || department === 'MCOM') {
        query = query.in('department', ['M.Com', 'MCOM']);
      } else if (department === 'MA Tamil' || department === 'M.A. Tamil') {
        query = query.in('department', ['MA Tamil', 'M.A. Tamil']);
      } else if (department === 'MA English' || department === 'M.A. English') {
        query = query.in('department', ['MA English', 'M.A. English']);
      } else if (department === 'MA Maths' || department === 'M.Sc. Mathematics') {
        query = query.in('department', ['MA Maths', 'M.Sc. Mathematics']);
      } else {
        query = query.eq('department', department);
      }
    }
    if (year && year !== 'All') query = query.eq('year', year);

    if (search) {
      query = query.or(`captain_name.ilike.%${search.trim()}%,sport_name.ilike.%${search.trim()}%,department.ilike.%${search.trim()}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: teamsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const teams = (teamsRaw || []).map(toCamelCase);

    res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Public / Private
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teamRaw, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !teamRaw) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({
      success: true,
      team: toCamelCase(teamRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new team
// @route   POST /api/teams
// @access  Private/Admin
exports.createTeam = async (req, res) => {
  try {
    const { captainName, sportId, department, year, phone } = req.body;

    if (!captainName || !sportId || !department || !year) {
      return res.status(400).json({
        success: false,
        message: 'Captain Name, Sport, Department, and Year are required.'
      });
    }

    let sportName = 'Sports';
    let validSportId = null;

    // Check if sportId is valid UUID or name
    if (sportId.includes('-')) {
      const { data: sport } = await supabase.from('sports').select('*').eq('id', sportId).single();
      if (sport) {
        sportName = sport.name;
        validSportId = sport.id;
      }
    } else {
      const { data: sport } = await supabase.from('sports').select('*').ilike('name', sportId).single();
      if (sport) {
        sportName = sport.name;
        validSportId = sport.id;
      } else {
        sportName = sportId;
      }
    }

    const newTeam = {
      captain_name: captainName.trim(),
      sport_id: validSportId,
      sport_name: sportName,
      department: department.trim(),
      year: year.trim(),
      phone: phone ? phone.trim() : '',
      name: `${sportName} (${department} - ${year})`,
      status: 'Active'
    };

    const { data: createdRaw, error } = await supabase
      .from('teams')
      .insert(newTeam)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(201).json({
      success: true,
      message: `Team for ${sportName} with Captain "${captainName}" created successfully!`,
      team: toCamelCase(createdRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teamRaw, error: fetchErr } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !teamRaw) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    const { captainName, sportId, department, year, phone, status } = req.body;

    const updates = {};
    if (captainName) updates.captain_name = captainName.trim();
    if (department) updates.department = department.trim();
    if (year) updates.year = year.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : '';
    if (status) updates.status = status;

    let sportName = teamRaw.sport_name;
    if (sportId) {
      if (sportId.includes('-')) {
        const { data: sport } = await supabase.from('sports').select('*').eq('id', sportId).single();
        if (sport) {
          updates.sport_name = sport.name;
          updates.sport_id = sport.id;
          sportName = sport.name;
        }
      } else {
        updates.sport_name = sportId;
        sportName = sportId;
      }
    }

    const finalDept = updates.department || teamRaw.department;
    const finalYear = updates.year || teamRaw.year;
    updates.name = `${sportName} (${finalDept} - ${finalYear})`;

    const { data: updatedRaw, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Team updated successfully!',
      team: toCamelCase(updatedRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teamRaw, error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !teamRaw) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, message: `Team "${teamRaw.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's teams
// @route   GET /api/teams/my-teams
// @access  Private/Student
exports.getMyTeams = async (req, res) => {
  try {
    const user = req.user;

    const { data: teamsRaw, error } = await supabase
      .from('teams')
      .select('*')
      .or(`department.ilike.%${user.department}%,captain_name.ilike.%${user.name}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const teams = (teamsRaw || []).map(toCamelCase);

    res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Sport Rules
// @route   GET /api/teams/rules
// @access  Public / Private
exports.getSportRules = async (req, res) => {
  try {
    const { data: rulesRaw } = await supabase.from('sport_rules').select('*');
    res.json({
      success: true,
      rules: (rulesRaw || []).map(toCamelCase)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Eligible Registered Players for Team Formation
// @route   GET /api/teams/eligible-players
// @access  Private/Admin
exports.getEligiblePlayers = async (req, res) => {
  try {
    const { tournamentName, tournamentId, sportName, sportId, gender, department } = req.query;

    if (!tournamentName && !tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament filter is required.' });
    }
    if (!sportName && !sportId) {
      return res.status(400).json({ success: false, message: 'Sport filter is required.' });
    }
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department filter is required.' });
    }

    // Standardize filters
    const targetGender = gender || 'Boys';
    const targetSport = (sportName || '').trim();
    const targetDept = (department || '').trim();
    const targetTourn = (tournamentName || '').trim();

    // 1. Fetch sport rules to determine required players and substitutes
    const { data: rulesRaw } = await supabase.from('sport_rules').select('*');
    let sportRule = (rulesRaw || []).find(r => 
      (r.sport_name && r.sport_name.toLowerCase() === targetSport.toLowerCase()) ||
      (r.sport_id && r.sport_id.toLowerCase() === (sportId || '').toLowerCase())
    );

    if (!sportRule) {
      // Default rule inference
      const sLower = targetSport.toLowerCase();
      let reqP = 11;
      let subs = 4;
      let cType = 'TEAM';
      if (sLower.includes('kabaddi')) { reqP = 7; subs = 3; }
      else if (sLower.includes('volleyball')) { reqP = 6; subs = 4; }
      else if (sLower.includes('basketball')) { reqP = 5; subs = 5; }
      else if (sLower.includes('handball')) { reqP = 7; subs = 5; }
      else if (sLower.includes('kho kho')) { reqP = 9; subs = 3; }
      else if (sLower.includes('throwball')) { reqP = 7; subs = 5; }
      else if (sLower.includes('badminton') || sLower.includes('chess') || sLower.includes('carrom') || sLower.includes('table tennis') || sLower.includes('tennis') || sLower.includes('athletics') || sLower.includes('running')) {
        reqP = 1; subs = 0; cType = 'INDIVIDUAL';
      }
      sportRule = {
        sport_name: targetSport,
        competition_type: cType,
        required_players: reqP,
        substitutes: subs
      };
    }

    // 2. Check if a team already exists for this Tournament + Sport + Department + Gender
    const { data: allTeams } = await supabase.from('teams').select('*, team_members(*)');
    const existingTeam = (allTeams || []).find(t => {
      const matchTourn = !t.tournament_name || !targetTourn || targetTourn === 'All' ||
        t.tournament_name.toLowerCase() === targetTourn.toLowerCase() ||
        t.tournament_name.toLowerCase().includes(targetTourn.toLowerCase()) ||
        targetTourn.toLowerCase().includes(t.tournament_name.toLowerCase());
      const matchSport = (t.sport_name || '').toLowerCase() === targetSport.toLowerCase();
      const matchDept = (t.department || '').toLowerCase() === targetDept.toLowerCase();
      const matchGender = (t.gender || 'Boys').toLowerCase() === targetGender.toLowerCase();
      return matchTourn && matchSport && matchDept && matchGender;
    });

    // 3. Find registered students
    const { data: regsRaw } = await supabase
      .from('competition_registrations')
      .select('*, users(id, name, register_number, department, gender, year, mobile, email, profile_photo), competitions(id, name, tournament_name, sport_name)');

    // Set of students already assigned to a team in this tournament & sport
    const assignedMap = {};
    (allTeams || []).forEach(t => {
      const matchTourn = !t.tournament_name || !targetTourn || targetTourn === 'All' ||
        t.tournament_name.toLowerCase() === targetTourn.toLowerCase() ||
        t.tournament_name.toLowerCase().includes(targetTourn.toLowerCase()) ||
        targetTourn.toLowerCase().includes(t.tournament_name.toLowerCase());
      const matchSport = (t.sport_name || '').toLowerCase() === targetSport.toLowerCase();
      if (matchTourn && matchSport && Array.isArray(t.team_members)) {
        t.team_members.forEach(tm => {
          assignedMap[tm.student_id] = t.name;
        });
      }
    });

    const eligiblePlayers = [];

    (regsRaw || []).forEach(r => {
      const u = r.users;
      const c = r.competitions;
      if (!u || !c) return;

      // Check tournament match (flexible matching for SPARK / SPARK 2026 / Annual Sports Fest)
      const cTourn = c.tournament_name || (c.name ? c.name.split('-')[0].trim() : '');
      const tournMatch = !targetTourn || targetTourn === 'All' ||
        cTourn.toLowerCase() === targetTourn.toLowerCase() ||
        cTourn.toLowerCase().includes(targetTourn.toLowerCase()) ||
        targetTourn.toLowerCase().includes(cTourn.toLowerCase()) ||
        c.id === tournamentId;
      if (!tournMatch) return;

      // Check sport match
      const cSport = c.sport_name || '';
      const sportMatch = cSport.toLowerCase() === targetSport.toLowerCase() || c.sport_id === sportId;
      if (!sportMatch) return;

      // Check department match (handling aliases)
      const uDept = u.department || '';
      const isDeptMatch = uDept.toLowerCase() === targetDept.toLowerCase() ||
        (targetDept === 'B.Sc CS' && (uDept === 'Computer Science' || uDept === 'B.Sc Computer Science')) ||
        (targetDept === 'B.Sc Maths' && (uDept === 'Mathematics' || uDept === 'B.Sc Mathematics' || uDept === 'Maths')) ||
        (targetDept === 'B.Com' && (uDept === 'Commerce' || uDept === 'B COM')) ||
        (targetDept === 'BCA' && (uDept === 'Computer Applications'));
      if (!isDeptMatch) return;

      // Check gender match
      const uGender = u.gender || 'Male';
      const isGenderMatch = targetGender === 'Boys' 
        ? (uGender === 'Male' || uGender.toLowerCase() === 'boy' || uGender.toLowerCase() === 'male')
        : (uGender === 'Female' || uGender.toLowerCase() === 'girl' || uGender.toLowerCase() === 'female');
      if (!isGenderMatch) return;

      // Check if already in this or other team
      const assignedTeam = assignedMap[u.id] || null;

      eligiblePlayers.push({
        id: u.id,
        name: u.name,
        registerNumber: u.register_number || 'N/A',
        department: targetDept,
        gender: targetGender,
        year: u.year || 'II Year',
        registrationDate: r.registration_date,
        registrationCode: r.registration_code,
        alreadyInTeam: !!assignedTeam,
        assignedTeamName: assignedTeam
      });
    });

    res.json({
      success: true,
      registeredCount: eligiblePlayers.length,
      requiredPlayers: sportRule.required_players || 11,
      substitutes: sportRule.substitutes || 0,
      competitionType: sportRule.competition_type || 'TEAM',
      sportRule: toCamelCase(sportRule),
      teamAlreadyExists: !!existingTeam,
      existingTeam: existingTeam ? toCamelCase(existingTeam) : null,
      players: eligiblePlayers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Form a Department & Gender specific Sports Team
// @route   POST /api/teams/form-team
// @access  Private/Admin
exports.formTeam = async (req, res) => {
  try {
    const {
      tournamentName,
      tournamentId,
      sportName,
      sportId,
      department,
      gender,
      teamName,
      selectedStudentIds
    } = req.body;

    if (!tournamentName || !sportName || !department || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Tournament, Sport, Department, and Gender are required.'
      });
    }

    if (!Array.isArray(selectedStudentIds) || selectedStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select players from the registered student list.'
      });
    }

    // 1. Get configured Sport Rule
    const { data: rulesRaw } = await supabase.from('sport_rules').select('*');
    let sportRule = (rulesRaw || []).find(r => 
      (r.sport_name && r.sport_name.toLowerCase() === sportName.toLowerCase()) ||
      (r.sport_id && r.sport_id.toLowerCase() === (sportId || '').toLowerCase())
    );

    const requiredPlayers = sportRule ? (sportRule.required_players || 11) : (
      sportName.toLowerCase().includes('kabaddi') ? 7 :
      sportName.toLowerCase().includes('volleyball') ? 6 :
      sportName.toLowerCase().includes('basketball') ? 5 : 11
    );

    // 2. Validate selected player count
    if (selectedStudentIds.length !== requiredPlayers) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Please select exactly ${requiredPlayers} players for ${sportName} (currently selected: ${selectedStudentIds.length}).`
      });
    }

    // 3. Duplicate Prevention (flexible tournament matching)
    const { data: existingTeams } = await supabase.from('teams').select('*');
    const duplicate = (existingTeams || []).find(t => {
      const matchTourn = !t.tournament_name || !tournamentName || tournamentName === 'All' ||
        t.tournament_name.toLowerCase() === tournamentName.toLowerCase() ||
        t.tournament_name.toLowerCase().includes(tournamentName.toLowerCase()) ||
        tournamentName.toLowerCase().includes(t.tournament_name.toLowerCase());
      const matchSport = (t.sport_name || '').toLowerCase() === sportName.toLowerCase();
      const matchDept = (t.department || '').toLowerCase() === department.toLowerCase();
      const matchGender = (t.gender || 'Boys').toLowerCase() === gender.toLowerCase();
      return matchTourn && matchSport && matchDept && matchGender;
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_TEAM',
        message: `Team already created for ${department} ${gender} ${sportName}.`,
        existingTeam: toCamelCase(duplicate)
      });
    }

    // 4. Resolve selected student details
    const { data: allUsers } = await supabase.from('users').select('*');
    const selectedUsers = selectedStudentIds.map(id => (allUsers || []).find(u => u.id === id)).filter(Boolean);

    const captainUser = selectedUsers[0] || { name: 'Team Captain', register_number: 'N/A' };
    const generatedTeamName = teamName ? teamName.trim() : `${department} - ${gender} - ${sportName} Team`;

    // 5. Create Team Record
    const teamDoc = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: generatedTeamName,
      tournament_id: tournamentId || null,
      tournament_name: tournamentName.trim(),
      sport_id: sportId || null,
      sport_name: sportName.trim(),
      department: department.trim(),
      gender: gender.trim(),
      required_players: requiredPlayers,
      substitutes: sportRule ? (sportRule.substitutes || 0) : 0,
      captain_name: captainUser.name,
      phone: captainUser.mobile || '+91 94432 18765',
      year: captainUser.year || 'College Squad',
      status: 'Active',
      created_by: 'Dr. R. ANITHA (Sports Mam)',
      created_at: new Date().toISOString()
    };

    const { data: createdTeamRaw, error: teamErr } = await supabase
      .from('teams')
      .insert(teamDoc)
      .select()
      .single();

    if (teamErr) {
      return res.status(500).json({ success: false, message: teamErr.message });
    }

    // 6. Create team_members records for each selected student
    const memberDocs = selectedUsers.map((u, idx) => ({
      id: `tm_${Date.now()}_${idx}`,
      team_id: teamDoc.id,
      student_id: u.id,
      role: idx === 0 ? 'Captain' : 'Player',
      created_at: new Date().toISOString()
    }));

    await supabase.from('team_members').insert(memberDocs);

    // Return response with full team details
    res.status(201).json({
      success: true,
      message: `Team "${generatedTeamName}" created successfully with ${selectedUsers.length} members!`,
      team: toCamelCase(teamDoc),
      members: selectedUsers.map((u, i) => ({
        sNo: i + 1,
        id: u.id,
        name: u.name,
        registerNumber: u.register_number,
        department: u.department,
        gender: u.gender,
        role: i === 0 ? 'Captain' : 'Player'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Formed Teams with Member Counts & Rosters
// @route   GET /api/teams/formed
// @access  Public / Private
exports.getFormedTeams = async (req, res) => {
  try {
    const [
      { data: teamsRaw },
      { data: membersRaw },
      { data: usersRaw }
    ] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*'),
      supabase.from('users').select('id, name, register_number, department, gender, year, mobile, profile_photo')
    ]);

    const usersMap = {};
    (usersRaw || []).forEach(u => { usersMap[u.id] = u; });

    const formedTeams = (teamsRaw || []).map(t => {
      const item = toCamelCase(t);
      const teamMems = (membersRaw || []).filter(m => m.team_id === t.id);
      item.members = teamMems.map((m, i) => {
        const u = usersMap[m.student_id] || {};
        return {
          sNo: i + 1,
          id: m.id,
          studentId: m.student_id,
          studentName: u.name || t.captain_name || 'Player',
          registerNumber: u.register_number || 'N/A',
          department: u.department || t.department,
          gender: u.gender || t.gender,
          role: m.role || 'Player'
        };
      });
      item.totalMembers = item.members.length;
      return item;
    });

    res.json({
      success: true,
      count: formedTeams.length,
      teams: formedTeams
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Team Official PDF Data Payload
// @route   GET /api/teams/:id/pdf-data
// @access  Public / Private
exports.getTeamPdfData = async (req, res) => {
  try {
    const { id } = req.params;

    const [
      { data: teamRaw, error: teamErr },
      { data: membersRaw },
      { data: usersRaw },
      { data: settingsRaw }
    ] = await Promise.all([
      supabase.from('teams').select('*').eq('id', id).single(),
      supabase.from('team_members').select('*').eq('team_id', id),
      supabase.from('users').select('id, name, register_number, department, gender'),
      supabase.from('admin_settings').select('*').single()
    ]);

    if (teamErr || !teamRaw) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    const team = toCamelCase(teamRaw);
    const usersMap = {};
    (usersRaw || []).forEach(u => { usersMap[u.id] = u; });

    const members = (membersRaw || []).map((m, idx) => {
      const u = usersMap[m.student_id] || {};
      return {
        sNo: idx + 1,
        studentName: u.name || 'Student Player',
        registerNumber: u.register_number || 'N/A',
        department: u.department || team.department,
        gender: u.gender || team.gender,
        role: m.role || 'Player'
      };
    });

    const settings = settingsRaw ? toCamelCase(settingsRaw) : {
      collegeName: 'Government Arts and Science College, Idappadi',
      departmentName: 'Department of Physical Education & Sports',
      sportsInchargeName: 'Dr. R. ANITHA, M.P.Ed., M.Phil., Ph.D.',
      sportsInchargeRole: 'Physical Directress & Sports Incharge'
    };

    res.json({
      success: true,
      pdfData: {
        collegeName: settings.collegeName || 'Government Arts and Science College, Idappadi',
        departmentName: settings.departmentName || 'Department of Physical Education & Sports',
        sportsInchargeName: settings.sportsInchargeName || 'Dr. R. ANITHA (Sports Mam)',
        sportsInchargeRole: settings.sportsInchargeRole || 'Physical Directress & Sports Incharge',
        tournament: team.tournamentName || 'SPARK 2026 Annual Sports Fest',
        sport: team.sportName || 'Sports',
        department: team.department,
        gender: team.gender || 'Boys',
        teamName: team.name,
        totalPlayers: members.length,
        createdDate: team.createdAt ? new Date(team.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '27 September 2026',
        createdBy: team.createdBy || 'Sports Mam',
        members
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Student Team Assignment Status
// @route   GET /api/teams/student-status
// @access  Private/Student
exports.getStudentTeamStatus = async (req, res) => {
  try {
    let targetId = req.headers['x-student-id'] || req.query.studentId || (req.user ? req.user.id : null);
    const targetReg = req.headers['x-register-number'] || req.query.registerNumber || (req.user ? (req.user.register_number || req.user.registerNumber) : null);

    // If targetReg is provided and targetId is not specified or we want to resolve to actual user:
    if (targetReg && (!targetId || targetId === 'user_student_01')) {
      const { data: matchedU } = await supabase.from('users').select('*').or(`register_number.ilike.%${targetReg}%,name.ilike.%${targetReg}%`).maybeSingle();
      if (matchedU) targetId = matchedU.id;
    }

    if (!targetId) {
      targetId = 'usr_cs_b_1'; // Default test student
    }

    const [
      { data: myRegsRaw },
      { data: myMembershipsRaw },
      { data: allTeamsRaw },
      { data: allMembersRaw },
      { data: allUsersRaw }
    ] = await Promise.all([
      supabase.from('competition_registrations').select('*, competitions(id, name, tournament_name, sport_name, type)').eq('student_id', targetId),
      supabase.from('team_members').select('*').eq('student_id', targetId),
      supabase.from('teams').select('*'),
      supabase.from('team_members').select('*'),
      supabase.from('users').select('id, name, register_number, department, gender')
    ]);

    const usersMap = {};
    (allUsersRaw || []).forEach(u => { usersMap[u.id] = u; });

    // Map each team with its members
    const teamMap = {};
    (allTeamsRaw || []).forEach(t => {
      const tMems = (allMembersRaw || []).filter(m => m.team_id === t.id);
      teamMap[t.id] = {
        ...toCamelCase(t),
        members: tMems.map(m => {
          const u = usersMap[m.student_id] || {};
          return {
            id: m.student_id,
            name: u.name || 'Teammate',
            registerNumber: u.register_number || 'N/A',
            role: m.role || 'Player'
          };
        })
      };
    });

    const assignedTeamIds = new Set((myMembershipsRaw || []).map(m => m.team_id));
    const myTeams = Array.from(assignedTeamIds).map(tId => teamMap[tId]).filter(Boolean);

    // For each registered sport, determine assignment status
    const registrationsWithTeamStatus = (myRegsRaw || []).map(r => {
      const c = r.competitions || {};
      const sportName = c.sport_name || (c.name ? c.name.split('-')[1]?.trim() : 'General') || 'General';
      const tournamentName = c.tournament_name || (c.name ? c.name.split('-')[0].trim() : 'SPARK 2026');

      // Check if student belongs to a team for this sport
      const matchedTeam = myTeams.find(t => 
        (t.sportName || '').toLowerCase() === sportName.toLowerCase() &&
        (!t.tournamentName || !tournamentName || t.tournamentName.toLowerCase() === tournamentName.toLowerCase())
      );

      const isTeam = (c.type || '').toLowerCase().includes('team') || isTeamSport(sportName);

      return {
        registrationId: r.id,
        registrationCode: r.registration_code,
        sportName,
        tournamentName,
        registrationStatus: r.status || 'Registered',
        isTeamEvent: isTeam,
        teamStatus: !isTeam ? 'INDIVIDUAL' : (matchedTeam ? 'TEAM CREATED' : 'Not Assigned'),
        assignedTeam: matchedTeam || null
      };
    });

    res.json({
      success: true,
      studentId: targetId,
      myTeams,
      registrations: registrationsWithTeamStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function isTeamSport(sportName) {
  const s = (sportName || '').toLowerCase();
  const defaultTeamSports = ['cricket', 'football', 'kabaddi', 'volleyball', 'basketball', 'handball', 'kho kho', 'throwball', 'hockey', 'relay'];
  return defaultTeamSports.some(ts => s.includes(ts));
}

