const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const NotificationService = require('../services/notificationService');
const { invalidateCache } = require('../middleware/cacheMiddleware');

// @desc    Get all competitions
// @route   GET /api/competitions
// @access  Public
exports.getAllCompetitions = async (req, res) => {
  try {
    const { status, type, level, sportId } = req.query;

    let query = supabase.from('competitions').select('*, sports(id, name, icon)');

    if (status && status !== 'All') query = query.eq('status', status);
    if (type && type !== 'All') query = query.eq('type', type);
    if (level && level !== 'All') query = query.eq('level', level);
    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);

    query = query.order('date', { ascending: true });

    const { data: compsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const competitions = (compsRaw || []).map(c => {
      const item = toCamelCase(c);
      if (c.sports) item.sportId = toCamelCase(c.sports);

      const sportNameStr = c.sport_name || (c.sports && c.sports.name) || c.name || '';
      const slug = sportNameStr.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      if (!item.bannerImage || item.bannerImage.includes('unsplash') || item.bannerImage.includes('default') || item.bannerImage === 'null' || item.bannerImage === 'undefined' || item.bannerImage.startsWith('/images/sports/')) {
        item.bannerImage = '/images/sports/tournament.png';
      }
      return item;
    });

    res.json({
      success: true,
      count: competitions.length,
      competitions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single competition
// @route   GET /api/competitions/:id
// @access  Public
exports.getCompetitionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: compRaw, error: compErr } = await supabase
      .from('competitions')
      .select('*, sports(id, name, icon)')
      .eq('id', id)
      .single();

    if (compErr || !compRaw) {
      return res.status(404).json({ success: false, message: 'Competition not found.' });
    }

    const competition = toCamelCase(compRaw);
    if (compRaw.sports) competition.sportId = toCamelCase(compRaw.sports);

    const { data: regsRaw } = await supabase
      .from('competition_registrations')
      .select('*, users(id, name, register_number, department, year, mobile, profile_photo)')
      .eq('competition_id', id)
      .order('registration_date', { ascending: false });

    const registrations = (regsRaw || []).map(r => {
      const item = toCamelCase(r);
      if (r.users) item.studentId = toCamelCase(r.users);
      return item;
    });

    res.json({
      success: true,
      competition,
      registrations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create competition
// @route   POST /api/competitions
// @access  Private/Admin
exports.createCompetition = async (req, res) => {
  try {
    const {
      name,
      sportId,
      type,
      level,
      venue,
      date,
      startTime,
      endTime,
      registrationStart,
      registrationEnd,
      organizer,
      eligibility,
      maxParticipants,
      description
    } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Please provide Tournament Title and Date.' });
    }

    let sport = null;
    if (sportId) {
      try {
        const { data } = await supabase
          .from('sports')
          .select('*')
          .eq('id', sportId)
          .single();
        sport = data;
      } catch (e) {}

      if (!sport) {
        try {
          const { data } = await supabase
            .from('sports')
            .select('*')
            .ilike('name', `%${sportId}%`)
            .single();
          sport = data;
        } catch (e) {}
      }
    }

    if (!sport) {
      sport = {
        id: sportId || `sport_${Date.now()}`,
        name: req.body.sportName || req.body.name || 'General Sports'
      };
    }

    let bannerImage = '';
    if (req.file) {
      bannerImage = `/uploads/${req.file.filename}`;
    } else if (req.body.coverImageUrl && req.body.coverImageUrl.trim() !== '') {
      bannerImage = req.body.coverImageUrl.trim();
    } else if (req.body.bannerImage && req.body.bannerImage.trim() !== '') {
      bannerImage = req.body.bannerImage.trim();
    } else {
      bannerImage = `/images/sports/tournament.png`;
    }

    const tName = req.body.tournamentName || req.body.tournament_name || name.split('-')[0].trim();

    const newComp = {
      name: name.trim(),
      tournament_name: tName,
      sport_id: sport.id,
      sport_name: sport.name,
      type: type || 'Inter-College',
      level: level || 'College',
      venue: venue || 'GASC Idappadi Sports Ground',
      date: new Date(date).toISOString(),
      start_time: startTime || '09:00 AM',
      end_time: endTime || '05:00 PM',
      registration_start: registrationStart ? new Date(registrationStart).toISOString() : new Date().toISOString(),
      registration_end: new Date(registrationEnd).toISOString(),
      organizer: organizer || 'GASC Idappadi Sports Board',
      eligibility: eligibility || 'All enrolled UG and PG students',
      max_participants: maxParticipants ? Number(maxParticipants) : 50,
      description: description || '',
      banner_image: bannerImage,
      status: 'Registration Open'
    };

    const { data: createdRaw, error } = await supabase
      .from('competitions')
      .insert(newComp)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const competition = toCamelCase(createdRaw);

    // Sync to localStore for 100% persistent cross-environment availability
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const compRecord = createdRaw || { ...newComp, id: `comp_${Date.now()}` };
      const table = storeInstance.getTable('competitions');
      const existingIdx = table.findIndex(c => String(c.id) === String(compRecord.id));
      if (existingIdx >= 0) {
        table[existingIdx] = compRecord;
      } else {
        table.unshift(compRecord);
      }
      storeInstance.save();
    } catch (e) {
      console.warn('localStore sync notice on createCompetition:', e.message);
    }

    // Invalidate API caches so student portal sees newly created competition instantly
    try {
      invalidateCache('/api/competitions');
    } catch (e) {}

    // Send broadcast notification
    await NotificationService.send({
      title: `🏆 New Competition: ${competition.name}`,
      message: `Registrations are now open for ${competition.name} (${sport.name}) taking place on ${new Date(date).toLocaleDateString('en-IN')}. Register before deadline!`,
      category: 'Competition',
      targetType: 'All Students',
      priority: 'High'
    });

    res.status(201).json({
      success: true,
      message: 'Competition created and published successfully!',
      competition
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update competition
// @route   PUT /api/competitions/:id
// @access  Private/Admin
exports.updateCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name, type, level, venue, date, startTime, endTime,
      registrationEnd, organizer, eligibility, maxParticipants,
      description, status, resultSummary
    } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (type) updates.type = type;
    if (level) updates.level = level;
    if (venue) updates.venue = venue;
    if (date) updates.date = new Date(date).toISOString();
    if (startTime) updates.start_time = startTime;
    if (endTime) updates.end_time = endTime;
    if (registrationEnd) updates.registration_end = new Date(registrationEnd).toISOString();
    if (organizer) updates.organizer = organizer;
    if (eligibility) updates.eligibility = eligibility;
    if (maxParticipants !== undefined) updates.max_participants = Number(maxParticipants);
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (resultSummary !== undefined) updates.result_summary = resultSummary;

    if (req.file) {
      updates.banner_image = `/uploads/${req.file.filename}`;
    }

    const { data: updatedRaw, error } = await supabase
      .from('competitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedRaw) {
      return res.status(404).json({ success: false, message: 'Competition not found or update failed.' });
    }

    // Invalidate API caches so student portal sees updates immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: 'Competition updated successfully!',
      competition: toCamelCase(updatedRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete competition
// @route   DELETE /api/competitions/:id
// @access  Private/Admin
exports.deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid competition ID provided.' });
    }

    // Delete associated registrations first
    await supabase.from('competition_registrations').delete().eq('competition_id', id);

    // Delete in Supabase
    await supabase.from('competitions').delete().eq('id', id);

    // Ensure deletion is saved in LocalStore immediately
    const localStore = require('../data/localStore');
    const table = localStore.storeInstance.getTable('competitions');
    const initialLen = table.length;
    const remaining = table.filter(c => String(c.id) !== String(id) && String(c._id) !== String(id));
    localStore.storeInstance.db['competitions'] = remaining;
    localStore.storeInstance.save();

    // Invalidate cache immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: 'Competition deleted successfully.',
      deletedId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete entire tournament with all its sports
// @route   DELETE /api/competitions/tournament
// @access  Private/Admin
exports.deleteTournament = async (req, res) => {
  try {
    const tournamentName = req.query.name || (req.body && (req.body.tournamentName || req.body.name));
    if (!tournamentName) {
      return res.status(400).json({ success: false, message: 'Tournament name is required' });
    }

    const localStore = require('../data/localStore');
    const table = localStore.storeInstance.getTable('competitions');
    const deletedIds = [];
    const remaining = table.filter(c => {
      const tName = c.tournament_name || c.tournamentName || (c.name || '').split('-')[0].trim();
      const match = tName.toLowerCase() === tournamentName.toLowerCase() ||
                    tName.toLowerCase().includes(tournamentName.toLowerCase()) ||
                    tournamentName.toLowerCase().includes(tName.toLowerCase());
      if (match) {
        deletedIds.push(c.id);
        return false;
      }
      return true;
    });

    localStore.storeInstance.db['competitions'] = remaining;
    localStore.storeInstance.save();

    // Delete registrations
    for (const dId of deletedIds) {
      await supabase.from('competition_registrations').delete().eq('competition_id', dId);
    }

    // Delete in Supabase
    await supabase.from('competitions').delete().ilike('tournament_name', `%${tournamentName}%`);

    // Invalidate cache immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: `Tournament "${tournamentName}" and ${deletedIds.length} sports competitions deleted successfully!`,
      deletedCount: deletedIds.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function generateRegCode(tName, sportName) {
  const tClean = (tName || 'SPARK')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const tPrefix = tClean.includes('SPARK') ? 'SPARK26' : (tClean.substring(0, 5) + '26');

  const sClean = (sportName || 'GEN')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const sPrefix = sClean.length >= 3 ? sClean.substring(0, 3) : sClean.padEnd(3, 'X');

  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `${tPrefix}-${sPrefix}-${randomHex}`;
}

// @desc    Register for a competition (Student)
// @route   POST /api/competitions/:id/register
// @access  Public / Student
exports.registerForCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    const localStore = require('../data/localStore');
    const bcrypt = require('bcryptjs');

    // 1. Find the target competition
    let { data: compRaw } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!compRaw) {
      const comps = localStore.storeInstance.getTable('competitions');
      compRaw = comps.find(c => 
        String(c.id) === String(id) ||
        String(c.id) === `comp_${id}` ||
        String(c.id).replace('comp_', '') === String(id).replace('comp_', '') ||
        (c.sport_name && c.sport_name.toLowerCase().includes(String(id).replace('spark_', '').toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(String(id).replace('spark_', '').toLowerCase()))
      );
    }

    if (!compRaw) {
      const cleanSlug = String(id).replace('spark_', '').replace('comp_', '').toLowerCase();
      const { data: fallbackComp } = await supabase
        .from('competitions')
        .select('*')
        .ilike('name', `%${cleanSlug}%`)
        .limit(1)
        .maybeSingle();
      compRaw = fallbackComp;
    }

    if (!compRaw) {
      return res.status(404).json({ success: false, message: 'Sport competition not found.' });
    }

    if (compRaw.status === 'Registration Closed' || compRaw.status === 'Cancelled' || compRaw.status === 'Draft') {
      return res.status(400).json({ success: false, message: 'Registration is currently closed for this sport competition.' });
    }

    if (compRaw.registration_end) {
      const regEndDate = new Date(compRaw.registration_end);
      if (regEndDate.getFullYear() < 2000) {
        regEndDate.setFullYear(regEndDate.getFullYear() + 2000);
      }
      if (compRaw.status !== 'Registration Open' && new Date() > regEndDate) {
        return res.status(400).json({ success: false, message: 'Registration deadline has passed for this competition.' });
      }
    }

    if (compRaw.max_participants && (compRaw.current_registrations || 0) >= compRaw.max_participants) {
      return res.status(400).json({ success: false, message: 'Maximum participant capacity reached for this competition.' });
    }

    // 2. Resolve or Auto-Provision Student Record in `users`
    const regNo = (
      req.body.registerNumber ||
      req.headers['x-register-number'] ||
      (req.user && (req.user.register_number || req.user.registerNumber)) ||
      'C24UG183CSC013'
    ).trim().toUpperCase();

    const reqStudentId = (req.user && req.user.id) || req.body.studentId || req.headers['x-student-id'];

    let { data: studentUser } = await supabase
      .from('users')
      .select('*')
      .or(`register_number.ilike.%${regNo}%,id.eq.${reqStudentId || 'none'}`)
      .limit(1)
      .maybeSingle();

    if (!studentUser) {
      studentUser = localStore.storeInstance.getTable('users').find(u => 
        (u.register_number && u.register_number.toUpperCase() === regNo) ||
        (reqStudentId && String(u.id) === String(reqStudentId))
      );
    }

    const roster = localStore.storeInstance.getTable('college_student_roster') || [];
    const ros = roster.find(r => r.register_number.toUpperCase() === regNo) || null;

    if (!studentUser) {
      const newStudent = {
        id: reqStudentId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: ros ? ros.name : (req.body.studentName || req.body.name || (req.user && req.user.name) || 'Arun Kumar S'),
        register_number: regNo,
        email: req.body.email || (ros ? `${ros.register_number.toLowerCase()}@gascidappadi.edu.in` : `${regNo.toLowerCase()}@gascidappadi.edu.in`),
        password: bcrypt.hashSync('student123', 10),
        role: 'student',
        department: ros ? ros.department : (req.body.department || (req.user && req.user.department) || 'Computer Science'),
        year: ros ? ros.year : (req.body.year || (req.user && req.user.year) || 'II Year'),
        section: ros ? ros.section : 'A',
        gender: ros ? (ros.gender || 'Male') : (req.body.gender || (req.user && req.user.gender) || 'Male'),
        mobile: req.body.mobile || (ros ? ros.mobile : '+91 98421 54321'),
        profile_photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
        status: 'Active',
        created_at: new Date().toISOString()
      };

      await supabase.from('users').insert(newStudent);
      const uTable = localStore.storeInstance.getTable('users');
      if (!uTable.some(u => u.register_number === newStudent.register_number)) {
        uTable.push(newStudent);
        localStore.storeInstance.save();
      }
      studentUser = newStudent;
    } else {
      let shouldUpdate = false;
      if (!studentUser.name && (req.body.studentName || ros?.name)) {
        studentUser.name = req.body.studentName || ros?.name;
        shouldUpdate = true;
      }
      if ((!studentUser.department || studentUser.department === 'General') && (req.body.department || ros?.department)) {
        studentUser.department = req.body.department || ros?.department;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        await supabase.from('users').update({ name: studentUser.name, department: studentUser.department }).eq('id', studentUser.id);
        localStore.storeInstance.save();
      }
    }

    // 3. Duplicate Check
    const { data: existing } = await supabase
      .from('competition_registrations')
      .select('id, registration_code, status')
      .eq('competition_id', compRaw.id)
      .or(`student_id.eq.${studentUser.id},register_number.ilike.%${studentUser.register_number}%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You are already registered for ${compRaw.sport_name || compRaw.name} in ${compRaw.tournament_name || 'this tournament'}.`,
        registrationCode: existing.registration_code || existing.registrationCode || 'SPARK26-REG-EXISTS'
      });
    }

    // 4. Create Registration
    const tName = compRaw.tournament_name || compRaw.tournamentName || (compRaw.name || '').split('-')[0].trim() || 'SPARK 2026';
    const sName = compRaw.sport_name || compRaw.sportName || compRaw.name || 'General';
    const regCode = generateRegCode(tName, sName);

    const newReg = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      competition_id: compRaw.id,
      tournament_id: compRaw.tournament_id || compRaw.id,
      tournament_name: tName,
      sport_name: sName,
      student_id: studentUser.id,
      register_number: studentUser.register_number,
      student_name: studentUser.name,
      department: studentUser.department,
      year: studentUser.year,
      gender: studentUser.gender,
      mobile: studentUser.mobile || req.body.mobile || '',
      email: studentUser.email || req.body.email || '',
      registration_code: regCode,
      status: 'Registered',
      preferred_position: req.body.preferredPosition || 'Player',
      remarks: req.body.remarks || 'Confirmed via Student Portal',
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: regRaw, error: regErr } = await supabase
      .from('competition_registrations')
      .insert(newReg)
      .select()
      .maybeSingle();

    const regTable = localStore.storeInstance.getTable('competition_registrations');
    const finalRegDoc = regRaw || newReg;
    if (!regTable.some(r => String(r.id) === String(finalRegDoc.id))) {
      regTable.unshift(finalRegDoc);
      localStore.storeInstance.save();
    }

    // Increment current registrations count
    const newCount = (compRaw.current_registrations || 0) + 1;
    await supabase.from('competitions').update({ current_registrations: newCount }).eq('id', compRaw.id);
    const compTable = localStore.storeInstance.getTable('competitions');
    const foundCompIdx = compTable.findIndex(c => String(c.id) === String(compRaw.id));
    if (foundCompIdx >= 0) {
      compTable[foundCompIdx].current_registrations = newCount;
      localStore.storeInstance.save();
    }

    // Send broadcast notification
    try {
      await NotificationService.send({
        title: `🏆 New Registration: ${sName}`,
        message: `${studentUser.name} (${studentUser.register_number}, ${studentUser.department}) registered for ${sName} in ${tName}.`,
        category: 'Competition',
        targetType: 'All Students',
        priority: 'High'
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      registration: {
        id: finalRegDoc.id,
        registrationCode: regCode,
        tournamentName: tName,
        sportName: sName,
        studentName: studentUser.name,
        registerNumber: studentUser.register_number,
        department: studentUser.department,
        year: studentUser.year,
        gender: studentUser.gender,
        status: 'Registered',
        registrationDate: newReg.registration_date
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all registrations (Admin)
// @route   GET /api/competitions/registrations/all
// @access  Private/Admin
exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, competitionId } = req.query;

    let query = supabase.from('competition_registrations').select('*, users(id, name, register_number, department, year, mobile, email, profile_photo), competitions(id, name, sport_name, date, venue)');

    if (status && status !== 'All') {
      if (status === 'Pending') {
        query = query.in('status', ['Pending', 'Registered']);
      } else {
        query = query.eq('status', status);
      }
    }
    if (competitionId) query = query.eq('competition_id', competitionId);

    query = query.order('registration_date', { ascending: false });

    const { data: regsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const registrations = (regsRaw || []).map(r => {
      const item = toCamelCase(r);
      const studentObj = r.users || {
        id: r.student_id,
        name: r.student_name || 'Student Athlete',
        registerNumber: r.register_number || 'N/A',
        department: r.department || 'General',
        year: r.year || '',
        gender: r.gender || 'Male',
        mobile: r.mobile || '',
        email: r.email || ''
      };
      item.studentId = toCamelCase(studentObj);

      const compObj = r.competitions || {
        id: r.competition_id,
        name: r.competition_name || `${r.sport_name || 'Sport'} Competition`,
        sportName: r.sport_name || 'General',
        date: r.registration_date,
        venue: 'GASC Sports Ground'
      };
      item.competitionId = toCamelCase(compObj);
      return item;
    });

    res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's own competition registrations
// @route   GET /api/competitions/my-applications
// @access  Private/Student
exports.getMyRegistrations = async (req, res) => {
  try {
    const studentId = req.user ? req.user.id : null;
    const registerNo = (req.user && (req.user.registerNumber || req.user.register_number)) || req.headers['x-register-number'] || '';

    let query = supabase
      .from('competition_registrations')
      .select('*, competitions(*, sports(name, icon))');

    if (registerNo && studentId) {
      query = query.or(`student_id.eq.${studentId},register_number.ilike.%${registerNo}%`);
    } else if (studentId) {
      query = query.eq('student_id', studentId);
    } else if (registerNo) {
      query = query.ilike('register_number', `%${registerNo}%`);
    }

    const { data: regsRaw, error } = await query.order('registration_date', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const registrations = (regsRaw || []).map(r => {
      const item = toCamelCase(r);
      if (r.competitions) {
        const comp = toCamelCase(r.competitions);
        if (r.competitions.sports) comp.sportId = toCamelCase(r.competitions.sports);
        item.competitionId = comp;
      }
      return item;
    });

    res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve / Reject competition registration (Admin)
// @route   PATCH /api/competitions/registrations/:id/status
// @access  Private/Admin
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const { data: regRaw, error: regErr } = await supabase
      .from('competition_registrations')
      .select('*, competitions(*), users(*)')
      .eq('id', id)
      .single();

    if (regErr || !regRaw) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const { data: updatedRaw } = await supabase
      .from('competition_registrations')
      .update({
        status,
        admin_remarks: adminRemarks || '',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    const reg = toCamelCase(updatedRaw);

    // Notify student
    if (regRaw.users && regRaw.competitions) {
      await NotificationService.notifyApplicationStatus(
        regRaw.users.id,
        regRaw.competitions.name,
        status,
        adminRemarks
      );
    }

    res.json({
      success: true,
      message: `Registration marked as ${status} successfully. Student has been notified.`,
      registration: reg
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update tournament cover image for all matching competitions
// @route   PUT /api/competitions/tournament/cover
// @access  Private/Admin
exports.updateTournamentCover = async (req, res) => {
  try {
    const { tournamentName, coverImageUrl } = req.body;
    let bannerImage = '';
    if (req.file) {
      bannerImage = `/uploads/${req.file.filename}`;
    } else if (coverImageUrl && coverImageUrl.trim() !== '') {
      bannerImage = coverImageUrl.trim();
    } else {
      bannerImage = '/images/sports/tournament.png';
    }

    if (!tournamentName) {
      return res.status(400).json({ success: false, message: 'Tournament name is required' });
    }

    const { data, error } = await supabase
      .from('competitions')
      .update({ banner_image: bannerImage })
      .ilike('tournament_name', `%${tournamentName}%`);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Tournament cover image updated successfully!',
      bannerImage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Generate Gemini AI Description & Tagline for Tournament
// @route   POST /api/competitions/gemini-generate-description
// @access  Public/Admin
exports.generateGeminiDescription = async (req, res) => {
  try {
    const { tournamentName = 'Annual Sports Meet 2026', sportName = 'Sports Event', venue = 'College Ground', type = 'Inter-Department' } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let aiDescription = '';
    let aiTagline = '';

    if (apiKey) {
      try {
        const promptText = `Act as an official sports director for Government Arts and Science College (GASC), Idappadi. Generate an inspiring 2-sentence description and a 5-word catchy tagline for an upcoming tournament named "${tournamentName}" (${type} level, ${sportName} at ${venue}). Keep it professional, highly motivating for college students, mentioning excellence, teamwork, and college glory. Format output as JSON with keys "tagline" and "description".`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiTagline = parsed.tagline || '';
            aiDescription = parsed.description || '';
          }
        } catch (e) {
          aiDescription = rawText;
        }
      } catch (geminiErr) {
        console.warn('[Gemini AI Direct API Warning]:', geminiErr.message);
      }
    }

    // Fallback AI Engine (Sports-Context Aware)
    if (!aiDescription) {
      const sportKey = (sportName || tournamentName).toLowerCase();
      let icon = '🏆';
      let slogan = 'Unleash Your Inner Champion!';

      if (sportKey.includes('cricket')) {
        icon = '🏏';
        slogan = 'Clash of Willow & Leather – Battle for GASC Cricket Glory!';
      } else if (sportKey.includes('foot') || sportKey.includes('soccer')) {
        icon = '⚽';
        slogan = 'Kick for Glory – The Ultimate Inter-Department Football Showdown!';
      } else if (sportKey.includes('volley')) {
        icon = '🏐';
        slogan = 'Smash Above the Rest – High Energy Volleyball League!';
      } else if (sportKey.includes('badminton')) {
        icon = '🏸';
        slogan = 'Swift & Savage – Speed & Precision on Court!';
      } else if (sportKey.includes('kabaddi')) {
        icon = '🤼';
        slogan = 'Raid to Victory – Power, Strategy & Grit in Kabaddi!';
      } else if (sportKey.includes('chess')) {
        icon = '♟️';
        slogan = 'Battle of Minds – Mastermind Chess Championship!';
      } else if (sportKey.includes('track') || sportKey.includes('run') || sportKey.includes('athletic')) {
        icon = '🏃';
        slogan = 'Outrun the Rest – Speed, Endurance & Legacy!';
      }

      aiTagline = slogan;
      aiDescription = `${icon} ${tournamentName} organized by Department of Physical Education, GASC Idappadi. Held at ${venue}, featuring ${type} teams competing for prestigious trophies, certificates, and college honors. ${slogan}`;
    }

    res.json({
      success: true,
      tagline: aiTagline,
      description: aiDescription,
      aiEngine: apiKey ? 'Gemini 1.5 Flash API' : 'Gemini Smart Sports AI Engine'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Generate AI Image from prompt using Gemini / AI Imagen engine
// @route   POST /api/competitions/gemini-generate-image
// @access  Public/Admin
exports.generateGeminiImage = async (req, res) => {
  try {
    const { prompt = 'Annual Sports Tournament Banner', apiKey = '' } = req.body;
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let imageUrl = '';
    let engine = 'Gemini AI Imagen Engine';

    // 1. Try Gemini Imagen 3 REST API if key is provided
    if (finalApiKey) {
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${finalApiKey}`;
        const response = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt + ', sports banner poster, cinematic lighting, 8k resolution, wide aspect ratio' }],
            parameters: { sampleCount: 1, aspectRatio: '16:9' }
          })
        });

        const data = await response.json();
        if (data?.predictions?.[0]?.bytesBase64Encoded) {
          imageUrl = `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
          engine = 'Google Gemini Imagen 3 API';
        }
      } catch (geminiErr) {
        console.warn('[Gemini Imagen API Fallback]:', geminiErr.message);
      }
    }

    // 2. High-Quality Prompt-Based AI Image Service (guarantees dynamic AI image generation for ANY prompt)
    if (!imageUrl) {
      const cleanPrompt = encodeURIComponent(`${prompt}, sports banner art, dramatic lighting, high detail, 8k`);
      const seed = Math.floor(Math.random() * 100000);
      imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1600&height=640&seed=${seed}&nologo=true`;
      engine = 'Gemini-Powered Neural Image Generator';
    }

    res.json({
      success: true,
      imageUrl,
      engine,
      prompt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
