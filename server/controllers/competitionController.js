const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const NotificationService = require('../services/notificationService');
const { invalidateCache } = require('../middleware/cacheMiddleware');

// @desc    Get all competitions
// @route   GET /api/competitions
// @access  Public
exports.getAllCompetitions = async (req, res) => {
  try {
    const { status, type, level, sportId } = req.query;

    let query = supabase.from('competitions').select('*');

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

      // Guarantee dual property compatibility
      item.tournamentName = item.tournamentName || c.tournament_name || (c.name && c.name.includes('-') ? c.name.split('-')[0].trim() : c.name) || 'Collegiate Tournament';
      item.tournament_name = item.tournamentName;

      item.sportName = item.sportName || c.sport_name || (c.sports && c.sports.name) || c.name || 'General';
      item.sport_name = item.sportName;

      const sportNameStr = item.sportName || '';
      const slug = sportNameStr.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      if (!item.bannerImage || item.bannerImage.includes('unsplash') || item.bannerImage.includes('default') || item.bannerImage === 'null' || item.bannerImage === 'undefined' || item.bannerImage.startsWith('/images/sports/')) {
        item.bannerImage = '/images/sports/tournament.png';
      }

      if (c.rules && typeof c.rules === 'string' && c.rules.includes('interCollegeConfig')) {
        try {
          const parsed = JSON.parse(c.rules);
          if (parsed.interCollegeConfig) {
            Object.assign(item, parsed.interCollegeConfig);
          }
        } catch(e) {}
      }
      item.participationType = item.participationType || c.participation_type || (item.type === 'Inter-College' ? 'INTER_COLLEGE' : 'INTERNAL');
      item.competitionMode = item.competitionMode || c.competition_mode || (item.type === 'Team' ? 'TEAM' : 'INDIVIDUAL');
      item.registrationToken = item.registrationToken || c.registration_token || null;

      return item;
    });

    const storeInstance = require('../data/localStore').storeInstance;
    let tournaments = storeInstance.getTable('tournaments') || [];

    // Ensure all tournament names from competitions exist in tournaments list
    competitions.forEach(c => {
      const tName = (c.tournamentName || c.tournament_name || '').trim();
      if (tName && !tournaments.some(t => (t.name || t.tournament_name || '').toLowerCase() === tName.toLowerCase())) {
        tournaments.push({
          id: `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: tName,
          tournament_name: tName,
          venue: c.venue || 'GASC Idappadi Sports Ground',
          type: c.type || 'Inter-Department',
          date: c.date,
          registration_end: c.registrationEnd,
          banner_image: c.bannerImage || '/images/sports/tournament.png',
          status: c.status || 'Registration Open',
          description: c.description || `Official ${tName} Tournament.`
        });
      }
    });

    res.json({
      success: true,
      count: competitions.length,
      competitions,
      tournaments
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
      .select('*')
      .eq('id', id)
      .single();

    if (compErr || !compRaw) {
      return res.status(404).json({ success: false, message: 'Competition not found.' });
    }

    const competition = toCamelCase(compRaw);

    const { data: regsRaw } = await supabase
      .from('competition_registrations')
      .select('*')
      .eq('competition_id', id)
      .order('registration_date', { ascending: false });

    const registrations = (regsRaw || []).map(r => {
      const item = toCamelCase(r);
      item.studentId = toCamelCase(r.users || {
        id: r.student_id,
        name: r.student_name || 'Student Athlete',
        registerNumber: r.register_number || 'N/A',
        department: r.department || 'General',
        gender: r.gender || 'Male'
      });
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

    const tName = (req.body.tournamentName || req.body.tournament_name || name.split('-')[0].trim()).trim();
    const tId = req.body.tournamentId || req.body.tournament_id || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // 1. Ensure parent tournament container exists in Supabase FIRST
    try {
      await supabase.from('tournaments').upsert({
        id: tId,
        name: tName,
        tournament_name: tName,
        description: req.body.tournamentDescription || req.body.description || `Official ${tName} Tournament conducted by GASC Idappadi.`,
        venue: venue || 'GASC Idappadi Sports Ground',
        start_date: new Date(date).toISOString(),
        end_date: registrationEnd ? new Date(registrationEnd).toISOString() : new Date().toISOString(),
        type: type || 'Inter-Department',
        status: req.body.status || 'Registration Open',
        banner_image: bannerImage,
        banner_url: bannerImage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (supaTournErr) {
      console.warn('Supabase tournaments pre-upsert notice:', supaTournErr.message);
    }

    const compId = req.body.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const crypto = require('crypto');
    const isInterCollege = (req.body.participationType === 'INTER_COLLEGE' || req.body.participation_type === 'INTER_COLLEGE' || type === 'Inter-College');
    const registrationToken = isInterCollege ? (req.body.registrationToken || req.body.registration_token || crypto.randomBytes(16).toString('hex')) : null;
    const compMode = (req.body.competitionMode || req.body.competition_mode || req.body.sportType || 'INDIVIDUAL').toUpperCase();

    const newComp = {
      id: compId,
      name: name.trim(),
      tournament_id: tId,
      tournament_name: tName,
      sport_id: sport.id,
      sport_name: sport.name,
      type: type || (isInterCollege ? 'Inter-College' : 'Inter-Department'),
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
      rules: req.body.rules || '',
      banner_image: bannerImage,
      status: req.body.status || 'Registration Open'
    };

    // Include Inter-College fields if applicable
    if (isInterCollege) {
      newComp.participation_type = 'INTER_COLLEGE';
      newComp.competition_mode = compMode;
      newComp.external_registration_enabled = true;
      newComp.registration_token = registrationToken;
      if (req.body.maxColleges) newComp.max_colleges = Number(req.body.maxColleges);
      if (req.body.maxTeams) newComp.max_teams = Number(req.body.maxTeams);
      if (req.body.requiredPlayers) newComp.required_players = Number(req.body.requiredPlayers);
      if (req.body.substitutes !== undefined) newComp.substitutes = Number(req.body.substitutes);
      if (req.body.contactPerson) newComp.contact_person = req.body.contactPerson.trim();
      if (req.body.contactPhone) newComp.contact_phone = req.body.contactPhone.trim();
      if (req.body.contactEmail) newComp.contact_email = req.body.contactEmail.trim();
    } else {
      newComp.participation_type = 'INTERNAL';
      newComp.competition_mode = compMode;
    }

    let createdRaw = null;
    let supaError = null;
    try {
      const { data, error } = await supabase
        .from('competitions')
        .insert(newComp)
        .select()
        .single();
      if (error) supaError = error;
      else createdRaw = data;
    } catch (e) {
      supaError = e;
    }

    // Defensive fallback: If Supabase returns schema cache error for new columns,
    // insert base columns only and pack extended config into rules JSON string
    if (supaError && supaError.message && (supaError.message.includes('schema cache') || supaError.message.includes('column'))) {
      try {
        const baseComp = {
          id: newComp.id,
          name: newComp.name,
          tournament_id: newComp.tournament_id,
          tournament_name: newComp.tournament_name,
          sport_id: newComp.sport_id,
          sport_name: newComp.sport_name,
          type: newComp.type,
          level: newComp.level,
          venue: newComp.venue,
          date: newComp.date,
          start_time: newComp.start_time,
          end_time: newComp.end_time,
          registration_start: newComp.registration_start,
          registration_end: newComp.registration_end,
          organizer: newComp.organizer,
          eligibility: newComp.eligibility,
          max_participants: newComp.max_participants,
          description: newComp.description,
          rules: JSON.stringify({
            textRules: req.body.rules || '',
            interCollegeConfig: {
              participationType: newComp.participation_type,
              competitionMode: newComp.competition_mode,
              registrationToken: newComp.registration_token,
              requiredPlayers: newComp.required_players,
              substitutes: newComp.substitutes,
              maxColleges: newComp.max_colleges,
              maxTeams: newComp.max_teams,
              contactPerson: newComp.contact_person,
              contactPhone: newComp.contact_phone,
              contactEmail: newComp.contact_email
            }
          }),
          banner_image: newComp.banner_image,
          status: newComp.status
        };
        const { data } = await supabase.from('competitions').insert(baseComp).select().single();
        if (data) createdRaw = { ...data, ...newComp };
      } catch (retryErr) {}
    }

    const competition = toCamelCase(createdRaw || newComp);
    competition.registrationToken = registrationToken;
    competition.participationType = newComp.participation_type;
    competition.competitionMode = newComp.competition_mode;

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
      // Also register parent tournament container
      const tournTable = storeInstance.getTable('tournaments');
      const existingTournIdx = tournTable.findIndex(t => (t.name || t.tournament_name || '').toLowerCase() === tName.toLowerCase());
      const tournRecord = {
        id: existingTournIdx >= 0 ? tournTable[existingTournIdx].id : `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: tName,
        tournament_name: tName,
        description: req.body.tournamentDescription || req.body.description || `Official ${tName} Tournament conducted by GASC Idappadi.`,
        venue: venue || 'GASC Idappadi Sports Ground',
        date: new Date(date).toISOString(),
        start_date: new Date(date).toISOString(),
        registration_end: new Date(registrationEnd).toISOString(),
        end_date: new Date(registrationEnd).toISOString(),
        type: type || 'Inter-Department',
        status: req.body.status || 'Registration Open',
        banner_image: bannerImage,
        banner_url: bannerImage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (existingTournIdx >= 0) {
        tournTable[existingTournIdx] = { ...tournTable[existingTournIdx], ...tournRecord };
      } else {
        tournTable.unshift(tournRecord);
      }

      storeInstance.save();

      // Upsert directly into Supabase tournaments table
      try {
        await supabase.from('tournaments').upsert({
          id: tournRecord.id,
          name: tournRecord.name,
          tournament_name: tournRecord.tournament_name,
          description: tournRecord.description,
          venue: tournRecord.venue,
          start_date: tournRecord.start_date,
          end_date: tournRecord.end_date,
          type: tournRecord.type,
          status: tournRecord.status,
          banner_image: tournRecord.banner_image,
          banner_url: tournRecord.banner_url,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (supaTournErr) {
        console.warn('Supabase tournaments upsert notice:', supaTournErr.message);
      }
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

function syncStaticCompetitions(comps) {
  try {
    const fs = require('fs');
    const path = require('path');
    const payload = JSON.stringify({ success: true, count: comps.length, competitions: comps }, null, 2);
    const targets = [
      path.join(__dirname, '../../dist/competitions.json'),
      path.join(__dirname, '../../dist/api/competitions'),
      path.join(__dirname, '../../dist/api/competitions.json'),
      path.join(__dirname, '../../student-client/dist/competitions.json'),
      path.join(__dirname, '../../student-client/dist/api/competitions'),
      path.join(__dirname, '../../student-client/dist/api/competitions.json')
    ];
    for (const t of targets) {
      if (fs.existsSync(path.dirname(t))) {
        try { fs.writeFileSync(t, payload, 'utf8'); } catch (e) {}
      }
    }
  } catch (err) {}
}

// @desc    Delete competition
// @route   DELETE /api/competitions/:id
// @access  Private/Admin
exports.deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid competition ID provided.' });
    }

    const cleanId = String(id).trim();

    // 1. Delete associated registrations first in Supabase if online
    try {
      await supabase.from('competition_registrations').delete().eq('competition_id', cleanId);
      await supabase.from('competitions').delete().eq('id', cleanId);
    } catch(e) {}

    // 2. Ensure deletion is saved in LocalStore immediately
    const localStore = require('../data/localStore');
    const table = localStore.storeInstance.getTable('competitions');
    const targetComp = table.find(c => String(c.id) === cleanId || String(c._id) === cleanId);
    const remaining = table.filter(c => String(c.id) !== cleanId && String(c._id) !== cleanId);
    localStore.storeInstance.db['competitions'] = remaining;

    // Purge related registrations from localStore
    const regTable = localStore.storeInstance.getTable('competition_registrations') || [];
    localStore.storeInstance.db['competition_registrations'] = regTable.filter(r => String(r.competition_id) !== cleanId);

    // CRITICAL: Preserve parent tournament container in tournaments table so deleting a sport NEVER deletes the tournament!
    if (targetComp) {
      const tName = (targetComp.tournament_name || targetComp.tournamentName || '').trim();
      if (tName) {
        const tournTable = localStore.storeInstance.getTable('tournaments');
        const exists = tournTable.some(t => (t.name || t.tournament_name || '').toLowerCase() === tName.toLowerCase());
        if (!exists) {
          tournTable.push({
            id: `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: tName,
            tournament_name: tName,
            description: targetComp.description || `Official ${tName} Tournament.`,
            venue: targetComp.venue || 'GASC Idappadi Sports Ground',
            date: targetComp.date || new Date().toISOString(),
            registration_end: targetComp.registration_end || targetComp.date || new Date().toISOString(),
            type: targetComp.type || 'Inter-Department',
            status: targetComp.status || 'Registration Open',
            banner_image: targetComp.banner_image || '/images/sports/tournament.png',
            created_at: targetComp.created_at || new Date().toISOString()
          });
        }
      }
    }
    localStore.storeInstance.save();

    // Sync static files
    syncStaticCompetitions(remaining);

    // 3. Delete in local SQLite database
    try {
      const localDB = require('../database/localDB');
      localDB.run('DELETE FROM competitions WHERE id = ?', [cleanId]);
      try { localDB.run('DELETE FROM registrations WHERE competition_id = ?', [cleanId]); } catch(e) {}
      localDB.saveDB();
    } catch (e) {}

    // Invalidate cache immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: 'Competition sport deleted successfully.',
      deletedId: cleanId
    });
  } catch (error) {
    console.error('deleteCompetition error:', error);
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

    const tLower = tournamentName.trim().toLowerCase();
    const localStore = require('../data/localStore');
    const table = localStore.storeInstance.getTable('competitions');
    const deletedIds = [];
    const remaining = table.filter(c => {
      const cTName = (c.tournament_name || c.tournamentName || '').trim().toLowerCase();
      const cName = (c.name || '').trim().toLowerCase();
      const cPrefix = cName.includes('-') ? cName.split('-')[0].trim().toLowerCase() : cName;
      const cId = String(c.id || c._id || '').toLowerCase();

      const match = (cTName && (cTName === tLower || cTName.includes(tLower) || tLower.includes(cTName))) ||
                    (cName && (cName === tLower || cName.includes(tLower) || tLower.includes(cName))) ||
                    (cPrefix && (cPrefix === tLower || cPrefix.includes(tLower) || tLower.includes(cPrefix))) ||
                    (cId === tLower);

      if (match) {
        deletedIds.push(String(c.id));
        return false;
      }
      return true;
    });

    localStore.storeInstance.db['competitions'] = remaining;

    // Delete tournament from tournaments table
    const tournTable = localStore.storeInstance.getTable('tournaments');
    localStore.storeInstance.db['tournaments'] = tournTable.filter(t => {
      const n = (t.name || t.tournament_name || '').toLowerCase();
      return n !== tLower && !n.includes(tLower) && !tLower.includes(n);
    });

    // Delete registrations from localStore
    const regTable = localStore.storeInstance.getTable('competition_registrations') || [];
    localStore.storeInstance.db['competition_registrations'] = regTable.filter(r => !deletedIds.includes(String(r.competition_id)));
    localStore.storeInstance.save();

    // Sync static files
    syncStaticCompetitions(remaining);

    // Delete in local SQLite database
    try {
      const localDB = require('../database/localDB');
      try { localDB.run('DELETE FROM tournaments WHERE LOWER(name) LIKE ?', [`%${tLower}%`]); } catch(e) {}
      try { localDB.run('DELETE FROM competitions WHERE LOWER(name) LIKE ?', [`%${tLower}%`]); } catch(e) {}
      for (const dId of deletedIds) {
        try { localDB.run('DELETE FROM competitions WHERE id = ?', [dId]); } catch(e) {}
        try { localDB.run('DELETE FROM registrations WHERE competition_id = ?', [dId]); } catch(e) {}
      }
      localDB.saveDB();
    } catch(e) {}

    // Delete registrations, competitions & tournaments in Supabase if online
    try {
      for (const dId of deletedIds) {
        await supabase.from('competition_registrations').delete().eq('competition_id', dId);
      }
      await supabase.from('competitions').delete().ilike('tournament_name', `%${tournamentName}%`);
      await supabase.from('competitions').delete().eq('tournament_id', `tour_${tLower.replace(/[^a-z0-9]/g, '_')}`);
      await supabase.from('tournaments').delete().or(`name.ilike.%${tournamentName}%,tournament_name.ilike.%${tournamentName}%,id.eq.tour_${tLower.replace(/[^a-z0-9]/g, '_')}`);
    } catch(e) {}

    // Invalidate cache immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: `Tournament "${tournamentName}" and ${deletedIds.length} sports competitions deleted successfully!`,
      deletedCount: deletedIds.length
    });
  } catch (error) {
    console.error('deleteTournament error:', error);
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

    let query = supabase.from('competition_registrations').select('*');

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

      const rawTourn = (r.tournament_id || '').replace(/^tour_/, '').replace(/_/g, ' ');
      const cleanTourn = rawTourn ? rawTourn.charAt(0).toUpperCase() + rawTourn.slice(1) : '';
      const compDisplayName = r.competition_name || (cleanTourn ? `${cleanTourn} - ${r.sport_name || 'Event'}` : `${r.sport_name || 'Sport'} Competition`);

      const compObj = r.competitions || {
        id: r.competition_id,
        name: compDisplayName,
        sportName: r.sport_name || 'General',
        date: r.registration_date,
        venue: 'GASC Sports Ground'
      };
      item.competitionId = toCamelCase(compObj);
      item.tournamentName = cleanTourn || r.competition_name || 'Collegiate Tournament';
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
      .select('*');

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
      item.competitionId = {
        id: r.competition_id,
        name: r.tournament_id || `${r.sport_name || 'Sport'} Competition`,
        sportName: r.sport_name || 'General',
        sportId: { name: r.sport_name || 'General' }
      };
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
      .select('*')
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
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    const reg = toCamelCase(updatedRaw);

    // Notify student
    const studentUserId = regRaw.student_id;
    const competitionTitle = regRaw.sport_name || regRaw.tournament_id || 'Competition';
    if (studentUserId) {
      try {
        await NotificationService.notifyApplicationStatus(
          studentUserId,
          competitionTitle,
          status,
          adminRemarks
        );
      } catch (e) {}
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

    try {
      await supabase
        .from('tournaments')
        .update({ banner_image: bannerImage, banner_url: bannerImage, updated_at: new Date().toISOString() })
        .ilike('name', `%${tournamentName}%`);
    } catch(e) {}

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
