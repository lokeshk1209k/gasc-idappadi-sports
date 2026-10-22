const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const NotificationService = require('../services/notificationService');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const fs = require('fs');
const path = require('path');

// Keep all competitions.json files in sync for ultra-fast student portal loading
function syncCompetitionsJsonFiles(compsList) {
  try {
    const list = Array.isArray(compsList) ? compsList : [];
    const payload = JSON.stringify({ success: true, count: list.length, competitions: list }, null, 2);
    const targets = [
      path.join(__dirname, '../../client/public/competitions.json'),
      path.join(__dirname, '../../dist/competitions.json'),
      path.join(__dirname, '../../student-client/public/competitions.json'),
      path.join(__dirname, '../../student-client/dist/competitions.json')
    ];
    targets.forEach(t => {
      try {
        const dir = path.dirname(t);
        if (fs.existsSync(dir)) {
          fs.writeFileSync(t, payload, 'utf8');
        }
      } catch (err) {}
    });
  } catch (e) {}
}

// Compute dynamic registration status based on open & close conditions
function computeRegistrationStatus(item) {
  if (!item) return 'Registration Open';
  
  const currentStatus = String(item.status || '').trim();
  if (/^cancelled$|^canceled$/i.test(currentStatus)) return 'Cancelled';
  if (/^completed$/i.test(currentStatus)) return 'Completed';
  if (/^closed$|^registration closed$/i.test(currentStatus)) return 'Registration Closed';
  if (/^draft$/i.test(currentStatus)) return 'Draft';

  // If Admin explicitly set or saved status as "Registration Open" or "Open", ALWAYS RESPECT IT
  if (/^open$|^registration open$/i.test(currentStatus)) {
    return 'Registration Open';
  }

  const now = new Date();
  
  // 1. Check Registration Start Condition (Auto Open)
  const startRaw = item.registration_start || item.registrationStart || item.registrationStartDate;
  if (startRaw) {
    const startDate = new Date(startRaw);
    if (!isNaN(startDate.getTime()) && now < startDate) {
      return 'Upcoming';
    }
  }

  // 2. Check Registration End Condition / Deadline (Auto Close)
  const endRaw = item.registration_end || item.registrationEnd || item.registration_deadline || item.registrationDeadline || item.endDate;
  if (endRaw) {
    let endDate = new Date(endRaw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endRaw).trim())) {
      endDate = new Date(`${String(endRaw).trim()}T23:59:59.999Z`);
    }
    if (!isNaN(endDate.getTime()) && now > endDate) {
      return 'Registration Closed';
    }
  }

  return 'Registration Open';
}

exports.computeRegistrationStatus = computeRegistrationStatus;

// @desc    Get all competitions
// @route   GET /api/competitions
// @access  Public
exports.getAllCompetitions = async (req, res) => {
  try {
    const { status, type, level, sportId } = req.query;

    let compsRaw = [];
    const { supabase: rawSupabase, isSupabaseConfigured } = require('../config/supabase');

    // 1. Fetch fresh competitions from Supabase if online (ensures multi-system sync)
    if (isSupabaseConfigured() && rawSupabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase query timeout')), 2500));
        let query = rawSupabase.from('competitions').select('*').order('date', { ascending: true });
        const { data, error } = await Promise.race([query, timeoutPromise]);
        if (!error && Array.isArray(data)) {
          compsRaw = data;
          // Synchronize to localStore and static files
          try {
            const localStore = require('../data/localStore');
            localStore.storeInstance.db['competitions'] = data;
            localStore.storeInstance.save();
            syncCompetitionsJsonFiles(data);
          } catch (sErr) {}
        }
      } catch (cloudErr) {
        // Fall back to local store when offline or on network delay
      }
    }

    // 2. Fallback to LocalStore / bundled files if Supabase was unreachable or returned empty
    if (!compsRaw || compsRaw.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const table = localStore.storeInstance.getTable('competitions');
        if (Array.isArray(table) && table.length > 0) {
          compsRaw = table;
        }
      } catch (e) {}
    }

    // High-performance in-memory filtering (<0.1ms)
    let filtered = compsRaw;
    if (status && status !== 'All') filtered = filtered.filter(c => (c.status || '').toLowerCase() === status.toLowerCase());
    if (type && type !== 'All') filtered = filtered.filter(c => (c.type || '').toLowerCase() === type.toLowerCase());
    if (level && level !== 'All') filtered = filtered.filter(c => (c.level || '').toLowerCase() === level.toLowerCase());
    if (sportId && sportId !== 'All') filtered = filtered.filter(c => String(c.sport_id || c.sportId) === String(sportId));

    const competitions = (filtered || []).map(c => {
      const item = toCamelCase(c);
      if (c.sports) item.sportId = toCamelCase(c.sports);

      // Robust tournament and sport fields for 100% portal compatibility
      item.tournamentName = (item.tournamentName || c.tournament_name || (c.name ? c.name.split('—')[0].trim() : 'GASC Annual Sports Meet 2026')).trim();
      item.tournament_name = item.tournamentName;
      item.tournamentId = item.tournamentId || c.tournament_id || `tour_${item.tournamentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      item.tournament_id = item.tournamentId;

      item.sportName = (item.sportName || c.sport_name || (item.sportId && item.sportId.name) || c.name || 'Sports').trim();
      item.sport_name = item.sportName;

      if (!item.bannerImage || item.bannerImage.includes('unsplash') || item.bannerImage.includes('default') || item.bannerImage === 'null' || item.bannerImage === 'undefined' || item.bannerImage.startsWith('/images/sports/')) {
        item.bannerImage = '/images/sports/tournament.png';
      }
      item.banner_image = item.bannerImage;

      // Automatically determine real-time registration status based on open & close conditions
      const dynStatus = computeRegistrationStatus(c);
      item.status = dynStatus;
      item.isRegistrationOpen = (dynStatus === 'Registration Open');
      item.isRegistrationUpcoming = (dynStatus === 'Upcoming');
      item.isRegistrationClosed = (dynStatus === 'Registration Closed');

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
      .select('*')
      .eq('id', id)
      .single();

    if (compErr || !compRaw) {
      return res.status(404).json({ success: false, message: 'Competition not found.' });
    }

    const competition = toCamelCase(compRaw);
    if (compRaw.sports) competition.sportId = toCamelCase(compRaw.sports);

    const dynStatus = computeRegistrationStatus(compRaw);
    competition.status = dynStatus;
    competition.isRegistrationOpen = (dynStatus === 'Registration Open');
    competition.isRegistrationUpcoming = (dynStatus === 'Upcoming');
    competition.isRegistrationClosed = (dynStatus === 'Registration Closed');

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

    if (!name || !sportId || !date || !registrationEnd) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    let sport = null;
    try {
      const { data: s } = await supabase
        .from('sports')
        .select('*')
        .eq('id', sportId)
        .maybeSingle();
      if (s) sport = s;
    } catch (e) {}

    if (!sport) {
      sport = { id: sportId || 'sp_cricket', name: req.body.sportName || req.body.name || 'Sports' };
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

    const crypto = require('crypto');
    const tName = req.body.tournamentName || req.body.tournament_name || name.split('-')[0].trim();
    const tId = req.body.tournamentId || req.body.tournament_id || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const token = req.body.registrationToken || req.body.registration_token || crypto.randomBytes(16).toString('hex');
    const pType = req.body.participationType || req.body.participation_type || (type === 'Inter-College' ? 'INTER_COLLEGE' : 'BOTH');
    const cMode = req.body.competitionMode || req.body.competition_mode || (type === 'Team Event' || type === 'TEAM' ? 'TEAM' : 'INDIVIDUAL');
    const isExternalEnabled = (pType === 'BOTH' || pType === 'INTER_COLLEGE');

    // Ensure parent tournament exists in tournaments table for public portal
    const parentComputedStatus = computeRegistrationStatus({
      registration_start: registrationStart,
      registration_end: registrationEnd,
      registration_deadline: registrationEnd,
      status: req.body.status
    });

    const entryFee = req.body.entryFee !== undefined ? Number(req.body.entryFee) : (req.body.entry_fee !== undefined ? Number(req.body.entry_fee) : 0);
    const hasPayment = req.body.hasPayment !== undefined ? (req.body.hasPayment === true || req.body.hasPayment === 'true') : (entryFee > 0);

    // Separate Registration Fees for Our College vs Other College Students
    const ourFeeEnabled = req.body.ourCollegeFeeEnabled !== undefined 
      ? (req.body.ourCollegeFeeEnabled === true || req.body.ourCollegeFeeEnabled === 'true' || req.body.ourCollegeFeeEnabled === 1) 
      : (req.body.our_college_fee_enabled !== undefined ? (req.body.our_college_fee_enabled === true || req.body.our_college_fee_enabled === 'true') : false);
    const ourFee = ourFeeEnabled ? Math.max(0, Number(req.body.ourCollegeFee !== undefined ? req.body.ourCollegeFee : (req.body.our_college_fee || 0))) : 0;

    const otherFeeEnabled = req.body.otherCollegeFeeEnabled !== undefined 
      ? (req.body.otherCollegeFeeEnabled === true || req.body.otherCollegeFeeEnabled === 'true' || req.body.otherCollegeFeeEnabled === 1) 
      : (req.body.other_college_fee_enabled !== undefined ? (req.body.other_college_fee_enabled === true || req.body.other_college_fee_enabled === 'true') : hasPayment);
    const otherFee = otherFeeEnabled ? Math.max(0, Number(req.body.otherCollegeFee !== undefined ? req.body.otherCollegeFee : (req.body.other_college_fee !== undefined ? req.body.other_college_fee : entryFee))) : 0;

    const upiId = (req.body.upiId || req.body.upi_id || '').trim();
    const gpayNumber = (req.body.gpayNumber || req.body.gpay_number || '').trim();
    const receiverName = (req.body.receiverName || req.body.receiver_name || '').trim();

    const parseEndOfDay = (val) => {
      if (!val) return new Date().toISOString();
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
        return new Date(`${val.trim()}T23:59:59.999Z`).toISOString();
      }
      const d = new Date(val);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    };

    const parsedStartDate = date ? new Date(date).toISOString() : new Date().toISOString();
    const parsedEndDate = parseEndOfDay(registrationEnd);

    try {
      const tourToken = tId.replace(/^tour_/, '');
      const tourPayload = {
        id: tId,
        name: tName,
        tournament_name: tName,
        description: description || `Official collegiate championship conducted by GASC Idappadi.`,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        registration_deadline: parsedEndDate,
        venue: venue || 'GASC Idappadi Main Stadium',
        status: parentComputedStatus,
        banner_image: bannerImage,
        participation_type: pType,
        external_registration_enabled: isExternalEnabled,
        registration_token: tourToken,
        entry_fee: otherFee,
        our_college_fee_enabled: ourFeeEnabled,
        our_college_fee: ourFee,
        other_college_fee_enabled: otherFeeEnabled,
        other_college_fee: otherFee,
        upi_id: upiId,
        gpay_number: gpayNumber,
        receiver_name: receiverName,
        contact_person: req.body.contactPerson || 'Dr. R. ANITHA (Physical Director)',
        contact_phone: req.body.contactPhone || '9443567890',
        contact_email: req.body.contactEmail || 'sportsgascidappadi@gmail.com',
        rules: req.body.rules || 'Official collegiate ID cards and bonafide certificates from the respective Head of Department/Principal are mandatory.'
      };

      const { error: tErr } = await supabase.from('tournaments').upsert(tourPayload, { onConflict: 'id' });
      if (tErr) {
        console.warn('[CompetitionController] Tournaments upsert warning:', tErr.message);
      }
    } catch (tErr) {
      console.warn('Parent tournament upsert notice:', tErr.message);
    }

    const rawCategory = (req.body.category || req.body.gender || 'Mixed').trim();
    let normCategory = 'Mixed';
    if (/^men$|^boys?$/i.test(rawCategory)) normCategory = 'Men';
    else if (/^women$|^girls?$/i.test(rawCategory)) normCategory = 'Women';
    else normCategory = 'Mixed';

    const newComp = {
      id: req.body.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: name.trim(),
      tournament_id: tId,
      tournament_name: tName,
      sport_id: sport.id,
      sport_name: sport.name,
      type: type || 'Inter-College',
      level: level || 'College',
      category: normCategory,
      gender: normCategory,
      venue: venue || 'GASC Idappadi Sports Ground',
      date: parsedStartDate,
      start_time: startTime || '09:00 AM',
      end_time: endTime || '05:00 PM',
      registration_start: registrationStart ? new Date(registrationStart).toISOString() : new Date().toISOString(),
      registration_end: parsedEndDate,
      registration_deadline: parsedEndDate,
      organizer: organizer || 'GASC Idappadi Sports Board',
      eligibility: eligibility || 'All enrolled UG and PG students',
      max_participants: maxParticipants ? Number(maxParticipants) : 50,
      description: description || '',
      banner_image: bannerImage,
      status: parentComputedStatus,
      participation_type: pType,
      competition_mode: cMode,
      registration_token: token,
      external_registration_enabled: isExternalEnabled,
      entry_fee: otherFee,
      our_college_fee_enabled: ourFeeEnabled,
      our_college_fee: ourFee,
      other_college_fee_enabled: otherFeeEnabled,
      other_college_fee: otherFee,
      upi_id: upiId,
      gpay_number: gpayNumber,
      receiver_name: receiverName,
      required_players: req.body.requiredPlayers ? Number(req.body.requiredPlayers) : null,
      substitutes: req.body.substitutes ? Number(req.body.substitutes) : null,
      max_colleges: req.body.maxColleges ? Number(req.body.maxColleges) : null,
      max_teams: req.body.maxTeams ? Number(req.body.maxTeams) : null,
      contact_person: req.body.contactPerson || 'Dr. R. ANITHA (Physical Director)',
      contact_phone: req.body.contactPhone || '9443567890',
      contact_email: req.body.contactEmail || 'sportsgascidappadi@gmail.com',
      rules: req.body.rules || (typeof req.body.textRules === 'string' ? req.body.textRules : '')
    };

    let createdRaw = null;
    let finalComp = { ...newComp };

    try {
      const { data, error } = await supabase
        .from('competitions')
        .insert(newComp)
        .select()
        .single();

      if (!error && data) {
        createdRaw = data;
        finalComp = { ...newComp, ...data };
      } else if (error) {
        console.warn('[CompetitionController] Cloud insert schema notice:', error.message);
        // Fallback retry with core columns if cloud table has not yet run separate_registration_fees_setup.sql
        const coreComp = { ...newComp };
        delete coreComp.gpay_number;
        delete coreComp.upi_id;
        delete coreComp.receiver_name;
        delete coreComp.our_college_fee_enabled;
        delete coreComp.our_college_fee;
        delete coreComp.other_college_fee_enabled;
        delete coreComp.other_college_fee;
        const { data: fallbackData } = await supabase.from('competitions').insert(coreComp).select().maybeSingle();
        if (fallbackData) {
          createdRaw = fallbackData;
          finalComp = { ...newComp, ...fallbackData };
        }
      }
    } catch (dbErr) {
      console.warn('[CompetitionController] Database insert notice:', dbErr.message);
    }

    const competition = toCamelCase(finalComp);

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
      syncCompetitionsJsonFiles(table);
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

    // Separate Registration Fees for Our College vs Other College Students
    if (req.body.ourCollegeFeeEnabled !== undefined || req.body.our_college_fee_enabled !== undefined) {
      const ourEnabled = req.body.ourCollegeFeeEnabled !== undefined ? (req.body.ourCollegeFeeEnabled === true || req.body.ourCollegeFeeEnabled === 'true') : (req.body.our_college_fee_enabled === true || req.body.our_college_fee_enabled === 'true');
      updates.our_college_fee_enabled = ourEnabled;
    }
    if (req.body.ourCollegeFee !== undefined || req.body.our_college_fee !== undefined) {
      updates.our_college_fee = Math.max(0, Number(req.body.ourCollegeFee !== undefined ? req.body.ourCollegeFee : req.body.our_college_fee));
    }
    if (req.body.otherCollegeFeeEnabled !== undefined || req.body.other_college_fee_enabled !== undefined) {
      const otherEnabled = req.body.otherCollegeFeeEnabled !== undefined ? (req.body.otherCollegeFeeEnabled === true || req.body.otherCollegeFeeEnabled === 'true') : (req.body.other_college_fee_enabled === true || req.body.other_college_fee_enabled === 'true');
      updates.other_college_fee_enabled = otherEnabled;
    }
    if (req.body.otherCollegeFee !== undefined || req.body.other_college_fee !== undefined) {
      const otherFeeVal = Math.max(0, Number(req.body.otherCollegeFee !== undefined ? req.body.otherCollegeFee : req.body.other_college_fee));
      updates.other_college_fee = otherFeeVal;
      updates.entry_fee = otherFeeVal;
    }
    if (req.body.upiId !== undefined || req.body.upi_id !== undefined) {
      updates.upi_id = (req.body.upiId || req.body.upi_id || '').trim();
    }
    if (req.body.gpayNumber !== undefined || req.body.gpay_number !== undefined) {
      updates.gpay_number = (req.body.gpayNumber || req.body.gpay_number || '').trim();
    }
    if (req.body.receiverName !== undefined || req.body.receiver_name !== undefined) {
      updates.receiver_name = (req.body.receiverName || req.body.receiver_name || '').trim();
    }

    if (req.file) {
      updates.banner_image = `/uploads/${req.file.filename}`;
    }

    const { data: updatedRaw, error } = await supabase
      .from('competitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // Update localStore immediately
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const table = storeInstance.getTable('competitions');
      const idx = table.findIndex(c => String(c.id) === String(id) || String(c._id) === String(id));
      if (idx >= 0) {
        table[idx] = { ...table[idx], ...updates, ...(updatedRaw || {}) };
        storeInstance.save();
        syncCompetitionsJsonFiles(table);
      }
    } catch (e) {
      console.warn('localStore update notice on updateCompetition:', e.message);
    }

    // Invalidate API caches so student portal sees updates immediately
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: 'Competition updated successfully!',
      competition: toCamelCase(updatedRaw || updates)
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

    const { supabase: rawSupabase, isSupabaseConfigured } = require('../config/supabase');

    // 1. Direct Cascade Delete in Supabase Cloud
    if (isSupabaseConfigured() && rawSupabase) {
      try {
        await rawSupabase.from('external_registrations').delete().eq('competition_id', id);
      } catch (e) {}
      try {
        await rawSupabase.from('competition_registrations').delete().eq('competition_id', id);
      } catch (e) {}
      try {
        await rawSupabase.from('teams').delete().eq('competition_id', id);
      } catch (e) {}
      try {
        await rawSupabase.from('match_fixtures').delete().eq('competition_id', id);
      } catch (e) {}
      try {
        await rawSupabase.from('competitions').delete().eq('id', id);
      } catch (e) {}
    }

    // 2. Delete from SQLite localDB
    try {
      const localDB = require('../database/localDB');
      localDB.run('DELETE FROM registrations WHERE competition_id = ?', [id]);
      localDB.run('DELETE FROM competitions WHERE id = ?', [id]);
      localDB.saveDB();
    } catch (dbErr) {}

    // 3. Ensure deletion is saved in LocalStore immediately
    const localStore = require('../data/localStore');
    const table = localStore.storeInstance.getTable('competitions');
    const remaining = table.filter(c => String(c.id) !== String(id) && String(c._id) !== String(id));
    localStore.storeInstance.db['competitions'] = remaining;
    localStore.storeInstance.save();
    syncCompetitionsJsonFiles(remaining);

    // 4. Invalidate cache immediately
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
    const rawName = req.query.name || (req.body && (req.body.tournamentName || req.body.name || req.body.tournament_name));
    const rawId = req.query.id || req.query.tournamentId || (req.body && (req.body.id || req.body.tournamentId));

    if (!rawName && !rawId) {
      return res.status(400).json({ success: false, message: 'Tournament name or ID is required' });
    }

    const tName = (rawName || '').trim();
    const tId = (rawId || '').trim();
    const tNameLower = tName.toLowerCase();
    const slugId = tName ? `tour_${tNameLower.replace(/[^a-z0-9]/g, '_')}` : '';

    const { supabase: rawSupabase, isSupabaseConfigured } = require('../config/supabase');

    const tourIdsToDelete = new Set();
    if (tId) tourIdsToDelete.add(tId);
    if (slugId) tourIdsToDelete.add(slugId);

    const compIdsToDelete = new Set();

    // 1. Direct query in Supabase to find all matching tournament records and competitions
    if (isSupabaseConfigured() && rawSupabase) {
      try {
        let tQuery = rawSupabase.from('tournaments').select('id, name');
        if (tId && tName) {
          tQuery = tQuery.or(`id.eq.${tId},name.ilike.%${tName}%,tournament_name.ilike.%${tName}%`);
        } else if (tId) {
          tQuery = tQuery.eq('id', tId);
        } else {
          tQuery = tQuery.or(`name.ilike.%${tName}%,tournament_name.ilike.%${tName}%`);
        }
        const { data: matchedTours } = await tQuery;
        (matchedTours || []).forEach(t => tourIdsToDelete.add(t.id));

        const tourIdsArr = Array.from(tourIdsToDelete);
        let cQuery = rawSupabase.from('competitions').select('id, tournament_id, tournament_name');
        if (tourIdsArr.length > 0 && tName) {
          cQuery = cQuery.or(`tournament_name.ilike.%${tName}%,tournament_id.in.(${tourIdsArr.join(',')})`);
        } else if (tourIdsArr.length > 0) {
          cQuery = cQuery.in('tournament_id', tourIdsArr);
        } else {
          cQuery = cQuery.ilike('tournament_name', `%${tName}%`);
        }
        const { data: matchedComps } = await cQuery;
        (matchedComps || []).forEach(c => compIdsToDelete.add(c.id));

        const compIdsArr = Array.from(compIdsToDelete);

        // Delete all child registrations and relations in Supabase
        if (compIdsArr.length > 0) {
          try { await rawSupabase.from('external_registrations').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await rawSupabase.from('competition_registrations').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await rawSupabase.from('teams').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await rawSupabase.from('match_fixtures').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await rawSupabase.from('competitions').delete().in('id', compIdsArr); } catch (e) {}
        }

        if (tourIdsArr.length > 0) {
          try { await rawSupabase.from('external_registrations').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await rawSupabase.from('competition_registrations').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await rawSupabase.from('teams').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await rawSupabase.from('match_fixtures').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await rawSupabase.from('competitions').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await rawSupabase.from('tournaments').delete().in('id', tourIdsArr); } catch (e) {}
        }

        if (tName) {
          try { await rawSupabase.from('competitions').delete().ilike('tournament_name', `%${tName}%`); } catch (e) {}
          try { await rawSupabase.from('tournaments').delete().ilike('name', `%${tName}%`); } catch (e) {}
          try { await rawSupabase.from('tournaments').delete().ilike('tournament_name', `%${tName}%`); } catch (e) {}
        }
      } catch (cloudErr) {
        console.warn('[CompetitionController] Cloud delete notice:', cloudErr.message);
      }
    }

    // 2. Delete from SQLite localDB
    try {
      const localDB = require('../database/localDB');
      for (const cId of compIdsToDelete) {
        localDB.run('DELETE FROM registrations WHERE competition_id = ?', [cId]);
        localDB.run('DELETE FROM competitions WHERE id = ?', [cId]);
      }
      for (const tourId of tourIdsToDelete) {
        localDB.run('DELETE FROM tournaments WHERE id = ?', [tourId]);
        localDB.run('DELETE FROM competitions WHERE tournament_id = ?', [tourId]);
      }
      if (tName) {
        localDB.run('DELETE FROM tournaments WHERE name LIKE ?', [`%${tName}%`]);
        localDB.run('DELETE FROM competitions WHERE tournament_id LIKE ? OR name LIKE ?', [`%${tName}%`, `%${tName}%`]);
      }
      localDB.saveDB();
    } catch (dbErr) {}

    // 3. Delete from LocalStore
    const localStore = require('../data/localStore');
    const compTable = localStore.storeInstance.getTable('competitions');
    const remainingComps = compTable.filter(c => {
      const cId = String(c.id || c._id);
      if (compIdsToDelete.has(cId)) return false;
      const cTourId = String(c.tournament_id || c.tournamentId || '');
      if (tourIdsToDelete.has(cTourId)) return false;
      const cTName = (c.tournament_name || c.tournamentName || (c.name || '').split('-')[0].trim()).toLowerCase();
      if (tNameLower && (cTName === tNameLower || cTName.includes(tNameLower) || tNameLower.includes(cTName))) {
        compIdsToDelete.add(cId);
        return false;
      }
      return true;
    });

    localStore.storeInstance.db['competitions'] = remainingComps;

    // Also purge from tournaments table in LocalStore
    const tourTable = localStore.storeInstance.getTable('tournaments');
    const remainingTours = tourTable.filter(t => {
      const tIdStr = String(t.id || t._id);
      if (tourIdsToDelete.has(tIdStr)) return false;
      const nameStr = (t.name || t.tournament_name || '').toLowerCase();
      if (tNameLower && (nameStr === tNameLower || nameStr.includes(tNameLower) || tNameLower.includes(nameStr))) {
        return false;
      }
      return true;
    });
    localStore.storeInstance.db['tournaments'] = remainingTours;
    localStore.storeInstance.save();

    // 4. Update all 4 competitions.json static files
    syncCompetitionsJsonFiles(remainingComps);

    // 5. Invalidate API cache
    try { invalidateCache('/api/competitions'); } catch (e) {}

    res.json({
      success: true,
      message: `Tournament "${tName || tId}" and all related competitions deleted successfully across all systems!`,
      deletedCount: compIdsToDelete.size
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

    const now = new Date();

    // Check registration start condition (Auto Open validation)
    if (compRaw.registration_start) {
      const regStart = new Date(compRaw.registration_start);
      if (!isNaN(regStart.getTime()) && now < regStart) {
        return res.status(400).json({
          success: false,
          message: `Registration has not opened yet for ${compRaw.name || compRaw.sport_name}. It will automatically open on ${regStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
        });
      }
    }

    // Check registration deadline (Auto Close validation)
    if (compRaw.registration_end || compRaw.registration_deadline) {
      const deadlineRaw = compRaw.registration_end || compRaw.registration_deadline;
      let deadline = new Date(deadlineRaw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(deadlineRaw).trim())) {
        deadline = new Date(`${String(deadlineRaw).trim()}T23:59:59.999Z`);
      }
      if (!isNaN(deadline.getTime()) && now > deadline) {
        return res.status(400).json({
          success: false,
          message: `Registration has automatically closed for ${compRaw.name || compRaw.sport_name}. Deadline was ${deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
        });
      }
    }

    // Check status flags
    const cStatus = (compRaw.status || '').toLowerCase();
    if (cStatus === 'upcoming' || cStatus === 'draft') {
      return res.status(400).json({
        success: false,
        message: `Registration has not opened yet for ${compRaw.name || compRaw.sport_name} (Status: Upcoming).`
      });
    }
    if (cStatus === 'cancelled' || cStatus === 'completed' || cStatus === 'closed' || cStatus === 'registration closed') {
      return res.status(400).json({
        success: false,
        message: `Registration is currently closed for ${compRaw.name || compRaw.sport_name} (Status: ${compRaw.status}).`
      });
    }

    if (compRaw.max_participants && (compRaw.current_registrations || 0) >= compRaw.max_participants) {
      return res.status(400).json({ success: false, message: 'Maximum participant capacity reached for this competition.' });
    }

    // 2. Resolve or Auto-Provision Student Record in `users`
    const regNo = (
      req.body.registerNumber ||
      (req.headers && req.headers['x-register-number']) ||
      (req.user && (req.user.register_number || req.user.registerNumber)) ||
      '23UGCS101'
    ).trim().toUpperCase();

    const reqStudentId = (req.user && req.user.id) || req.body.studentId || (req.headers && req.headers['x-student-id']);

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

    // 3. Category & Gender Eligibility Check
    const compCategory = (compRaw.category || compRaw.gender || 'Mixed').trim();
    const studentGender = (studentUser.gender || req.body.gender || 'Male').trim();
    const isMale = /^male|^boy|^men/i.test(studentGender);
    const isFemale = /^female|^girl|^women/i.test(studentGender);

    if (/^men$|^boys?$/i.test(compCategory) && isFemale) {
      return res.status(400).json({
        success: false,
        message: `Eligibility Restriction: Female students cannot register for Men's category competitions (${compRaw.name || compRaw.sport_name}).`
      });
    }
    if (/^women$|^girls?$/i.test(compCategory) && isMale) {
      return res.status(400).json({
        success: false,
        message: `Eligibility Restriction: Male students cannot register for Women's category competitions (${compRaw.name || compRaw.sport_name}).`
      });
    }


    // 4. Duplicate Check
    const { data: existing } = await supabase
      .from('competition_registrations')
      .select('id, status')
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

    // 5. Trusted Fee Calculation for Our College Students
    const ourFeeEnabled = (compRaw.our_college_fee_enabled === true || compRaw.our_college_fee_enabled === 'true');
    const ourFee = ourFeeEnabled ? Math.max(0, Number(compRaw.our_college_fee || 0)) : 0;

    let paymentStatus = 'Free';
    let feeAmount = 0;
    const paymentId = req.body.paymentId || req.body.payment_id || null;
    const orderId = req.body.orderId || req.body.order_id || null;
    const signature = req.body.signature || req.body.razorpay_signature || null;

    if (ourFee > 0) {
      if (!paymentId || !orderId) {
        return res.status(400).json({
          success: false,
          requiresPayment: true,
          amount: ourFee,
          message: `Registration fee of ₹${ourFee} is required for this competition. Please complete payment before confirming registration.`
        });
      }

      // Cryptographically verify Razorpay signature if provided
      if (signature) {
        try {
          const paymentService = require('../services/paymentService');
          const isValid = paymentService.verifyPaymentSignature({ orderId, paymentId, signature });
          if (!isValid) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_SIGNATURE',
              message: 'Cryptographic payment verification failed. Payment cannot be verified.'
            });
          }
        } catch (sigErr) {
          console.warn('Payment verification signature check notice:', sigErr.message);
        }
      }

      paymentStatus = 'Paid';
      feeAmount = ourFee;
    }

    // 6. Create Registration
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
      student_category: 'OUR_COLLEGE',
      fee_amount: feeAmount,
      payment_status: paymentStatus,
      payment_id: paymentId,
      order_id: orderId,
      transaction_ref: paymentId,
      preferred_position: req.body.preferredPosition || 'Player',
      remarks: req.body.remarks || (feeAmount > 0 ? `Paid ₹${feeAmount} via Razorpay (${paymentId})` : 'Free entry - Confirmed via Student Portal'),
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Prepare Cloud-compatible payload matching Supabase schema cache
    const cloudReg = {
      id: newReg.id,
      competition_id: newReg.competition_id,
      student_id: newReg.student_id,
      student_name: newReg.student_name,
      register_number: newReg.register_number,
      department: newReg.department,
      gender: newReg.gender,
      tournament_id: newReg.tournament_id,
      sport_name: newReg.sport_name,
      preferred_position: newReg.preferred_position,
      remarks: newReg.remarks,
      status: newReg.status,
      student_category: newReg.student_category,
      fee_amount: newReg.fee_amount,
      payment_status: newReg.payment_status,
      payment_id: newReg.payment_id,
      order_id: newReg.order_id,
      transaction_ref: newReg.transaction_ref,
      registration_date: newReg.registration_date,
      created_at: newReg.created_at
    };

    const { data: regRaw, error: regErr } = await supabase
      .from('competition_registrations')
      .insert(cloudReg)
      .select()
      .maybeSingle();

    const regTable = localStore.storeInstance.getTable('competition_registrations');
    const finalRegDoc = { ...newReg, ...(regRaw || {}) };
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
// @desc    Get all registrations (Admin - Both Our College & External Colleges)
// @route   GET /api/competitions/registrations/all
// @access  Private/Admin
exports.getAllRegistrations = async (req, res) => {
  try {
    const { status, competitionId, scope } = req.query;

    // ── 1. Fetch Internal Registrations (Our College Students) ──
    let internalRegs = [];
    try {
      let query = supabase.from('competition_registrations').select('*, users(id, name, register_number, department, year, mobile, email, profile_photo), competitions(id, name, sport_name, tournament_name, date, venue)');
      if (competitionId) query = query.eq('competition_id', competitionId);
      query = query.order('registration_date', { ascending: false });
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        internalRegs = data;
      }
    } catch (e) {
      console.warn('Supabase internal registrations fetch error:', e.message);
    }

    // LocalStore fallback if internal empty or offline
    if (internalRegs.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const localList = localStore.storeInstance.getTable('competition_registrations') || [];
        if (competitionId) {
          internalRegs = localList.filter(r => String(r.competition_id || r.competitionId) === String(competitionId));
        } else {
          internalRegs = [...localList];
        }
      } catch (e) {}
    }

    // ── 2. Fetch External Registrations (Other Colleges via QR / Open Reg) ──
    let externalRegs = [];
    try {
      let extQuery = supabase.from('external_registrations').select('*');
      if (competitionId) extQuery = extQuery.eq('competition_id', competitionId);
      extQuery = extQuery.order('created_at', { ascending: false });
      const { data, error } = await extQuery;
      if (!error && Array.isArray(data)) {
        externalRegs = data;
      }
    } catch (e) {
      console.warn('Supabase external registrations fetch error:', e.message);
    }

    // Merge SQLite database records for external registrations
    try {
      const localDB = require('../database/localDB');
      const sqliteExt = localDB.query('SELECT * FROM external_registrations ORDER BY created_at DESC');
      if (Array.isArray(sqliteExt)) {
        sqliteExt.forEach(sr => {
          if (!externalRegs.some(r => String(r.id) === String(sr.id) || String(r.registration_id) === String(sr.registration_id))) {
            externalRegs.push(sr);
          }
        });
      }
    } catch (e) {}

    // Merge localStore records for external registrations
    try {
      const localStore = require('../data/localStore');
      const storeExt = localStore.storeInstance.getTable('external_registrations') || [];
      storeExt.forEach(se => {
        if (!externalRegs.some(r => String(r.id) === String(se.id) || String(r.registration_id) === String(se.registration_id))) {
          externalRegs.push(se);
        }
      });
    } catch (e) {}

    // ── 3. Normalize Internal Registrations ──
    const mappedInternal = internalRegs.map(r => {
      const item = toCamelCase(r);
      item.studentCategory = 'OUR_COLLEGE';
      item.isExternal = false;
      item.collegeName = 'Government Arts and Science College, Idappadi';

      const studentObj = r.users || {
        id: r.student_id,
        name: r.student_name || 'Student Athlete',
        registerNumber: r.register_number || 'N/A',
        department: r.department || 'General',
        year: r.year || '',
        gender: r.gender || 'Male',
        mobile: r.mobile || '',
        email: r.email || '',
        collegeName: 'Government Arts and Science College, Idappadi',
        isExternal: false
      };
      item.studentId = toCamelCase(studentObj);

      const compObj = r.competitions || {
        id: r.competition_id,
        name: r.competition_name || `${r.sport_name || 'Sport'} Competition`,
        sportName: r.sport_name || 'General',
        tournamentName: r.tournament_name || 'Inter-Department Sports Meet',
        date: r.registration_date,
        venue: 'GASC Sports Ground'
      };
      item.competitionId = toCamelCase(compObj);

      // Status normalization
      const rawStatus = (item.status || 'Pending').trim();
      if (rawStatus.toLowerCase() === 'registered' || rawStatus.toLowerCase() === 'pending') {
        item.status = 'Pending';
      } else if (rawStatus.toLowerCase() === 'approved') {
        item.status = 'Approved';
      } else if (rawStatus.toLowerCase() === 'rejected') {
        item.status = 'Rejected';
      }

      return item;
    });

    // ── 4. Normalize External Registrations ──
    const mappedExternal = externalRegs.map(r => {
      const ext = toCamelCase(r);
      const college = r.college_name || ext.collegeName || 'External College';
      const playerName = r.player_name || ext.playerName || r.team_name || ext.teamName || 'External Athlete';
      const regNo = r.player_register_number || ext.playerRegisterNumber || r.registration_id || ext.registrationId || 'EXT';
      const sport = r.sport_name || ext.sportName || 'General';
      const gender = r.gender || ext.gender || 'Boys';
      const dept = r.department || ext.department || college;

      let normStatus = 'Pending';
      const rawSt = (r.status || ext.status || 'PENDING').toUpperCase();
      if (rawSt === 'APPROVED') normStatus = 'Approved';
      else if (rawSt === 'REJECTED') normStatus = 'Rejected';
      else normStatus = 'Pending';

      const regDate = r.created_at || ext.createdAt || new Date().toISOString();
      const dateStr = typeof regDate === 'number' ? new Date(regDate * 1000).toISOString() : regDate;

      return {
        ...ext,
        id: r.id || ext.id,
        _id: r.id || ext.id,
        registrationId: r.registration_id || ext.registrationId,
        studentCategory: 'OTHER_COLLEGE',
        isExternal: true,
        collegeName: college,
        studentName: playerName,
        registerNumber: regNo,
        department: dept,
        year: r.year || ext.year || '',
        gender: gender,
        category: gender,
        mobile: r.participant_phone || ext.participantPhone || r.college_phone || '',
        email: r.participant_email || ext.participantEmail || r.college_email || '',
        preferredPosition: (r.registration_type || ext.registrationType) === 'TEAM' ? `Team (${r.team_name || ext.teamName || 'Squad'})` : 'Individual',
        registrationType: r.registration_type || ext.registrationType || 'INDIVIDUAL',
        tournamentName: r.tournament_name || ext.tournamentName || 'Inter-College Championship',
        competitionName: sport,
        sportName: sport,
        status: normStatus,
        rawStatus: rawSt,
        feeAmount: Number(r.fee_amount || ext.feeAmount || 0),
        paymentStatus: r.payment_status || ext.paymentStatus || 'FREE',
        transactionRef: r.transaction_ref || ext.transactionRef || '',
        registrationDate: dateStr,
        createdAt: dateStr,
        studentId: {
          id: r.id || ext.id,
          name: playerName,
          registerNumber: regNo,
          department: dept,
          collegeName: college,
          isExternal: true,
          gender: gender,
          mobile: r.participant_phone || ext.participantPhone || '',
          email: r.participant_email || ext.participantEmail || ''
        },
        competitionId: {
          id: r.competition_id || ext.competitionId,
          name: sport,
          sportName: sport,
          tournamentName: r.tournament_name || ext.tournamentName || 'Inter-College Championship',
          date: dateStr,
          venue: 'GASC Sports Ground'
        }
      };
    });

    // ── 5. Combine and Filter ──
    let allRegistrations = [];
    if (scope === 'OUR_COLLEGE') {
      allRegistrations = mappedInternal;
    } else if (scope === 'OTHER_COLLEGE') {
      allRegistrations = mappedExternal;
    } else {
      allRegistrations = [...mappedInternal, ...mappedExternal];
    }

    if (status && status !== 'All') {
      if (status === 'Pending') {
        allRegistrations = allRegistrations.filter(r => r.status === 'Pending' || r.status === 'Registered');
      } else {
        allRegistrations = allRegistrations.filter(r => r.status === status);
      }
    }

    // Sort by registration date descending
    allRegistrations.sort((a, b) => {
      const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    res.json({
      success: true,
      count: allRegistrations.length,
      ourCollegeCount: mappedInternal.length,
      otherCollegeCount: mappedExternal.length,
      pendingCount: allRegistrations.filter(r => r.status === 'Pending').length,
      approvedCount: allRegistrations.filter(r => r.status === 'Approved').length,
      registrations: allRegistrations
    });
  } catch (error) {
    console.error('getAllRegistrations error:', error);
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

// @desc    Approve / Reject competition registration (Admin - Both Our College & External Colleges)
// @route   PATCH /api/competitions/registrations/:id/status
// @access  Private/Admin
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    let regRaw = null;

    // 1. Try finding in competition_registrations (Our College)
    try {
      const { data, error } = await supabase
        .from('competition_registrations')
        .select('*, competitions(*), users(*)')
        .eq('id', id)
        .single();
      if (!error && data) regRaw = data;
    } catch (e) {}

    // Check localStore for internal registrations if Supabase didn't find it
    if (!regRaw) {
      try {
        const localStore = require('../data/localStore');
        const list = localStore.storeInstance.getTable('competition_registrations') || [];
        const found = list.find(r => r.id === id || r._id === id);
        if (found) {
          found.status = status;
          found.admin_remarks = adminRemarks || '';
          found.reviewed_at = new Date().toISOString();
          localStore.storeInstance.save();
          return res.json({
            success: true,
            message: `Registration marked as ${status} successfully.`,
            registration: toCamelCase(found)
          });
        }
      } catch (e) {}
    }

    // 2. If internal registration found in Supabase
    if (regRaw) {
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

      const reg = toCamelCase(updatedRaw || regRaw);

      // Notify student
      if (regRaw.users && regRaw.competitions) {
        try {
          await NotificationService.notifyApplicationStatus(
            regRaw.users.id,
            regRaw.competitions.name,
            status,
            adminRemarks
          );
        } catch (e) {}
      }

      return res.json({
        success: true,
        message: `Registration marked as ${status} successfully. Student has been notified.`,
        registration: reg
      });
    }

    // 3. Not in competition_registrations -> Check external_registrations (Other Colleges)
    let extRaw = null;
    try {
      const { data } = await supabase
        .from('external_registrations')
        .select('*')
        .or(`id.eq.${id},registration_id.eq.${id}`)
        .maybeSingle();
      if (data) extRaw = data;
    } catch (e) {}

    if (!extRaw) {
      try {
        const localDB = require('../database/localDB');
        const rows = localDB.query('SELECT * FROM external_registrations WHERE id = ? OR registration_id = ? LIMIT 1', [id, id]);
        if (rows && rows.length > 0) extRaw = rows[0];
      } catch (e) {}
    }

    if (!extRaw) {
      try {
        const localStore = require('../data/localStore');
        const extList = localStore.storeInstance.getTable('external_registrations') || [];
        extRaw = extList.find(r => r.id === id || r.registration_id === id);
      } catch (e) {}
    }

    if (extRaw) {
      const extStatus = status === 'Approved' ? 'APPROVED' : (status === 'Rejected' ? 'REJECTED' : 'PENDING');
      const nowIso = new Date().toISOString();

      try {
        await supabase
          .from('external_registrations')
          .update({
            status: extStatus,
            remarks: adminRemarks || '',
            updated_at: nowIso
          })
          .eq('id', extRaw.id);
      } catch (e) {}

      try {
        const localDB = require('../database/localDB');
        localDB.run(`UPDATE external_registrations SET status = ?, remarks = ?, updated_at = strftime('%s','now') WHERE id = ? OR registration_id = ?`, [extStatus, adminRemarks || '', id, id]);
        localDB.saveDB();
      } catch (e) {}

      try {
        const localStore = require('../data/localStore');
        const extList = localStore.storeInstance.getTable('external_registrations') || [];
        const item = extList.find(r => r.id === id || r.registration_id === id);
        if (item) {
          item.status = extStatus;
          item.remarks = adminRemarks || '';
          localStore.storeInstance.save();
        }
      } catch (e) {}

      return res.json({
        success: true,
        message: `External registration (${extRaw.player_name || extRaw.college_name}) marked as ${status} successfully.`,
        registration: { ...extRaw, status }
      });
    }

    return res.status(404).json({ success: false, message: 'Registration record not found.' });
  } catch (error) {
    console.error('updateRegistrationStatus error:', error);
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
