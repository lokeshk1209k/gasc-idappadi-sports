const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

function computeRegistrationStatus(comp) {
  if (!comp) return 'Registration Open';
  const currentStatus = String(comp.status || '').trim();
  if (/^cancelled$|^canceled$/i.test(currentStatus)) return 'Cancelled';
  if (/^completed$/i.test(currentStatus)) return 'Completed';
  if (/^closed$|^registration closed$/i.test(currentStatus)) return 'Registration Closed';
  if (/^draft$/i.test(currentStatus)) return 'Draft';

  // If Admin explicitly marked or kept as Registration Open, ALWAYS RESPECT IT
  if (/^open$|^registration open$/i.test(currentStatus)) {
    return 'Registration Open';
  }

  const now = new Date();
  const start = comp.registration_start ? new Date(comp.registration_start) : null;
  const end = comp.registration_end || comp.registration_deadline || comp.date;
  const endDate = end ? new Date(end) : null;

  if (start && !isNaN(start.getTime()) && now < start) {
    return 'Upcoming';
  }
  if (endDate && !isNaN(endDate.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(end).trim())) {
      const eod = new Date(`${String(end).trim()}T23:59:59.999Z`);
      if (now > eod) return 'Registration Closed';
    } else if (now > endDate) {
      return 'Registration Closed';
    }
  }
  return 'Registration Open';
}

// High-Concurrency In-Memory Micro-Cache for 100,000+ Concurrent Students
let _cachedCompetitionsData = null;
let _cachedCompetitionsTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds TTL

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabase();

  const url = req.url || '';
  const cleanPath = url.split('?')[0];
  const parts = cleanPath.split('/').filter(Boolean);

  // ── GET /api/competitions/my-applications ──
  if (req.method === 'GET' && cleanPath.includes('/my-applications')) {
    try {
      const regNo = (req.headers && req.headers['x-register-number']) || req.query.registerNumber || '';
      const studentId = (req.headers && req.headers['x-student-id']) || req.query.studentId || '';

      let query = supabase.from('competition_registrations').select('*');
      if (regNo && studentId) {
        query = query.or(`student_id.eq.${studentId},register_number.ilike.%${regNo}%`);
      } else if (studentId) {
        query = query.eq('student_id', studentId);
      } else if (regNo) {
        query = query.ilike('register_number', `%${regNo}%`);
      }

      const { data: regsRaw, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      res.setHeader('Cache-Control', 'private, no-cache, no-store');
      return res.status(200).json({
        success: true,
        count: (regsRaw || []).length,
        registrations: regsRaw || []
      });
    } catch (err) {
      console.error('GET /api/competitions/my-applications error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /api/competitions ──
  if (req.method === 'GET') {
    try {
      const { tournament_id, tournamentId, t } = req.query || {};
      const targetTour = tournament_id || tournamentId;
      const bypassCache = !!t || (req.headers && req.headers['cache-control'] && req.headers['cache-control'].includes('no-cache'));

      const nowTime = Date.now();
      if (!targetTour && !bypassCache && _cachedCompetitionsData && (nowTime - _cachedCompetitionsTimestamp < CACHE_TTL_MS)) {
        res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
        res.setHeader('X-Cache-Status', 'HIT');
        return res.status(200).json(_cachedCompetitionsData);
      }

      let query = supabase.from('competitions').select('*').order('date', { ascending: true });
      if (targetTour) {
        query = query.eq('tournament_id', targetTour);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
      res.setHeader('X-Cache-Status', 'MISS');

      const normalizedComps = (data || []).map(c => {
        const regEnd = c.registration_end || c.registration_deadline || c.registrationEnd;
        const regStart = c.registration_start || c.registrationStart;
        const eventDate = c.date || c.start_date || c.startDate;
        const endDate = c.end_date || c.endDate || regEnd || eventDate;

        const tName = (c.tournament_name || c.tournamentName || (c.name ? c.name.split('—')[0].trim() : 'GASC Annual Sports Meet 2026')).trim();
        const tId = c.tournament_id || c.tournamentId || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const sName = (c.sport_name || c.sportName || c.name || 'Sports').trim();

        return {
          ...c,
          id: c.id,
          name: c.name,
          sportName: sName,
          sport_name: sName,
          tournamentName: tName,
          tournament_name: tName,
          tournamentId: tId,
          tournament_id: tId,
          date: eventDate,
          startDate: eventDate,
          endDate: endDate,
          registrationStart: regStart,
          registration_start: regStart,
          registrationEnd: regEnd,
          registration_end: regEnd,
          registrationDeadline: regEnd,
          registration_deadline: regEnd,
          bannerImage: c.banner_image || c.bannerImage || '/images/sports/tournament.png',
          ourCollegeFee: c.our_college_fee !== undefined ? Number(c.our_college_fee) : Number(c.ourCollegeFee || 0),
          ourCollegeFeeEnabled: c.our_college_fee_enabled !== undefined ? Boolean(c.our_college_fee_enabled) : Boolean(c.ourCollegeFeeEnabled),
          otherCollegeFee: c.other_college_fee !== undefined ? Number(c.other_college_fee) : Number(c.otherCollegeFee || 0),
          otherCollegeFeeEnabled: c.other_college_fee_enabled !== undefined ? Boolean(c.other_college_fee_enabled) : Boolean(c.otherCollegeFeeEnabled),
          upiId: c.upi_id || c.upiId || '9443218765@sbi',
          gpayNumber: c.gpay_number || c.gpayNumber || '+91 94432 18765',
          receiverName: c.receiver_name || c.receiverName || 'Physical Education Dept, GASC Idappadi',
          participationType: c.participation_type || c.participationType || 'BOTH',
          competitionMode: c.competition_mode || c.competitionMode || 'TEAM',
          requiredPlayers: c.required_players || c.requiredPlayers,
          substitutes: c.substitutes,
          maxParticipants: c.max_participants || c.maxParticipants || 50,
          currentRegistrations: c.current_registrations || c.currentRegistrations || 0,
          status: c.status || 'Registration Open'
        };
      });

      const responsePayload = {
        success: true,
        count: normalizedComps.length,
        competitions: normalizedComps
      };

      if (!targetTour) {
        _cachedCompetitionsData = responsePayload;
        _cachedCompetitionsTimestamp = nowTime;
      }

      return res.status(200).json(responsePayload);
    } catch (err) {
      console.error('GET /api/competitions error:', err);
      if (_cachedCompetitionsData) {
        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        res.setHeader('X-Cache-Status', 'STALE');
        return res.status(200).json(_cachedCompetitionsData);
      }
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/competitions/:id/register (Student Registration) ──
  if (req.method === 'POST' && (cleanPath.includes('/register') || parts.includes('register'))) {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      body = body || {};

      let targetCompId = req.query?.id || body.competitionId;
      if (!targetCompId && parts.length > 0) {
        const regIdx = parts.indexOf('register');
        if (regIdx > 0) targetCompId = parts[regIdx - 1];
      }

      if (!targetCompId) {
        return res.status(400).json({ success: false, message: 'Competition ID is required for registration.' });
      }

      // Fetch competition from Supabase
      const { data: comp, error: compErr } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', targetCompId)
        .maybeSingle();

      if (compErr || !comp) {
        return res.status(404).json({ success: false, message: 'Competition not found.' });
      }

      // Check registration dates
      const now = new Date();
      if (comp.registration_end) {
        let dDate = new Date(comp.registration_end);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(comp.registration_end).trim())) {
          dDate = new Date(`${String(comp.registration_end).trim()}T23:59:59.999Z`);
        }
        if (!isNaN(dDate.getTime()) && now > dDate) {
          return res.status(400).json({ success: false, message: `Registration closed on ${dDate.toLocaleDateString('en-IN')}.` });
        }
      }

      // Gender & Category Check
      const compCat = (comp.category || comp.gender || 'Mixed').trim().toLowerCase();
      const studentGender = (body.gender || 'Male').trim().toLowerCase();
      const isMale = /^male|^boy|^men/.test(studentGender);
      const isFemale = /^female|^girl|^women/.test(studentGender);

      if (compCat === 'men' && isFemale) {
        return res.status(400).json({ success: false, message: "Female athletes cannot register for Men's category." });
      }
      if (compCat === 'women' && isMale) {
        return res.status(400).json({ success: false, message: "Male athletes cannot register for Women's category." });
      }

      // Fee validation
      const ourFeeEnabled = Boolean(comp.our_college_fee_enabled);
      const ourFee = ourFeeEnabled ? Math.max(0, Number(comp.our_college_fee || 0)) : 0;
      const cleanUtr = String(body.transactionRef || body.transaction_ref || body.utrNumber || body.paymentId || '').trim();

      if (ourFee > 0) {
        // MUST have valid transaction reference
        if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.toLowerCase().startsWith('pay_sim')) {
          return res.status(400).json({
            success: false,
            requiresPayment: true,
            feeAmount: ourFee,
            message: `Mandatory Registration Fee of ₹${ourFee} INR must be paid via GPay / UPI. Please complete payment and provide your Transaction Reference (UTR) number.`
          });
        }
      }

      const regNo = (body.registerNumber || (req.headers && req.headers['x-register-number']) || 'C24UG183CSC013').trim().toUpperCase();
      const studentId = body.studentId || (req.headers && req.headers['x-student-id']) || `usr_${Date.now()}`;

      // Duplicate check
      const { data: existing } = await supabase
        .from('competition_registrations')
        .select('id, registration_code')
        .eq('competition_id', comp.id)
        .or(`student_id.eq.${studentId},register_number.ilike.%${regNo}%`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Already registered for ${comp.name || comp.sport_name}.`,
          registrationCode: existing.registration_code
        });
      }

      const tName = comp.tournament_name || (comp.name || '').split('-')[0].trim() || 'Tournament';
      const sName = comp.sport_name || comp.name || 'Sports';
      const cleanT = tName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const tCode = cleanT.substring(0, 5) + '26';
      const sCode = sName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
      const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const regCode = `${tCode}-${sCode}-${hex}`;

      const newReg = {
        id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        competition_id: comp.id,
        tournament_id: comp.tournament_id || comp.id,
        sport_id: comp.sport_id || 'sp_general',
        sport_name: sName,
        student_id: studentId,
        register_number: regNo,
        student_name: body.studentName || 'Student',
        department: body.department || 'Computer Science',
        gender: body.gender || 'Male',
        preferred_position: body.preferredPosition || 'Player',
        status: 'Registered',
        student_category: 'OUR_COLLEGE',
        fee_amount: ourFee,
        payment_status: ourFee > 0 ? 'Paid' : 'Free',
        payment_id: cleanUtr || null,
        order_id: body.orderId || null,
        transaction_ref: cleanUtr || null,
        remarks: ourFee > 0
          ? `Paid ₹${ourFee} via GPay/UPI (UTR: ${cleanUtr}) | Code: ${regCode} | Contact: ${body.mobile || ''} ${body.email || ''}`
          : `Free entry - Confirmed via Student Portal | Code: ${regCode}`,
        registration_date: new Date().toISOString()
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('competition_registrations')
        .insert(newReg)
        .select()
        .single();

      if (insertErr) {
        console.error('Supabase registration insert error:', insertErr);
        throw insertErr;
      }

      // Increment count
      try {
        await supabase
          .from('competitions')
          .update({ current_registrations: (comp.current_registrations || 0) + 1 })
          .eq('id', comp.id);
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Registration confirmed successfully!',
        registration: inserted || newReg
      });
    } catch (err) {
      console.error('POST /api/competitions registration error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/competitions ──
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      body = body || {};

      const name = (body.name || body.compName || 'Competition').trim();
      const tName = (body.tournamentName || body.tournament_name || name.split('-')[0]).trim();
      const sportName = body.sportName || body.sport_name || (name.includes('—') ? name.split('—')[0].trim() : name);

      // Resolve parent tournament in Supabase
      let parentTour = null;
      const targetTourId = body.tournamentId || body.tournament_id;
      if (targetTourId) {
        const { data: tData } = await supabase.from('tournaments').select('*').eq('id', targetTourId).maybeSingle();
        if (tData) parentTour = tData;
      }
      if (!parentTour && tName) {
        const { data: tNameData } = await supabase.from('tournaments').select('*').ilike('name', tName).limit(1);
        if (Array.isArray(tNameData) && tNameData.length > 0) parentTour = tNameData[0];
      }

      const tId = parentTour ? parentTour.id : (targetTourId || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
      const uniqueCompId = body.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const pType = parentTour?.participation_type || body.participationType || body.participation_type || (body.type === 'Inter-College' ? 'INTER_COLLEGE' : 'INTRA_COLLEGE');
      const cMode = (body.competitionMode || body.competition_mode || (body.type === 'Team Event' || body.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
      const token = body.registrationToken || body.registration_token || crypto.randomBytes(16).toString('hex');
      const bannerImage = body.coverImageUrl || body.bannerImage || parentTour?.banner_image || '/images/sports/tournament.png';
      const dateVal = body.date || new Date().toISOString();
      const regEnd = body.registrationEnd || body.date || new Date().toISOString();

      // Ensure parent tournament exists in database
      if (!parentTour) {
        try {
          const tourToken = tId.replace(/^tour_/, '');
          await supabase.from('tournaments').upsert({
            id: tId,
            name: tName,
            tournament_name: tName,
            description: body.description || `Official collegiate championship conducted by GASC Idappadi.`,
            start_date: new Date(dateVal).toISOString(),
            end_date: new Date(regEnd).toISOString(),
            registration_deadline: new Date(regEnd).toISOString(),
            venue: body.venue || 'GASC Idappadi Main Stadium',
            status: 'Registration Open',
            banner_image: bannerImage,
            participation_type: pType,
            external_registration_enabled: true,
            registration_token: tourToken,
            contact_person: body.contactPerson || 'Dr. R. ANITHA (Physical Director)',
            contact_phone: body.contactPhone || '+91 94432 18765',
            contact_email: body.contactEmail || 'sportsgascidappadi@gmail.com'
          }, { onConflict: 'id' });
        } catch (tErr) {
          console.warn('Parent tournament upsert notice:', tErr.message);
        }
      }

      const rawCat = (body.category || body.gender || 'Mixed').trim();
      let normCat = 'Mixed';
      if (/^men$|^boys?$/i.test(rawCat)) normCat = 'Men';
      else if (/^women$|^girls?$/i.test(rawCat)) normCat = 'Women';
      else normCat = 'Mixed';

      const computedStatus = computeRegistrationStatus({
        registration_start: body.registrationStart,
        registration_end: regEnd,
        date: dateVal
      });

      const newComp = {
        id: uniqueCompId,
        name: name,
        tournament_id: tId,
        tournament_name: parentTour?.name || tName,
        sport_id: body.sportId || 'sp_general',
        sport_name: sportName,
        type: body.type || 'Inter-College',
        level: body.level || 'College',
        category: normCat,
        gender: normCat,
        venue: body.venue || parentTour?.venue || 'GASC Idappadi Sports Ground',
        date: new Date(dateVal).toISOString(),
        start_time: body.startTime || '09:00 AM',
        end_time: body.endTime || '05:00 PM',
        registration_start: body.registrationStart ? new Date(body.registrationStart).toISOString() : new Date().toISOString(),
        registration_end: new Date(regEnd).toISOString(),
        registration_deadline: new Date(regEnd).toISOString(),
        organizer: body.organizer || 'GASC Idappadi Sports Board',
        eligibility: body.eligibility || 'All enrolled UG and PG students',
        max_participants: body.maxParticipants ? Number(body.maxParticipants) : 50,
        description: body.description || '',
        banner_image: bannerImage,
        status: computedStatus,
        participation_type: pType,
        competition_mode: cMode,
        registration_token: token,
        external_registration_enabled: pType === 'INTER_COLLEGE',
        required_players: body.requiredPlayers ? Number(body.requiredPlayers) : null,
        substitutes: body.substitutes ? Number(body.substitutes) : null,
        max_colleges: body.maxColleges ? Number(body.maxColleges) : null,
        max_teams: body.maxTeams ? Number(body.maxTeams) : null,
        contact_person: body.contactPerson || parentTour?.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contact_phone: body.contactPhone || parentTour?.contact_phone || '+91 94432 18765',
        contact_email: body.contactEmail || parentTour?.contact_email || 'sportsgascidappadi@gmail.com',
        rules: body.rules || ''
      };

      const { data: createdComp, error } = await supabase.from('competitions').insert(newComp).select().single();
      if (error) {
        console.error('Supabase insert competition error:', error);
        throw error;
      }

      _cachedCompetitionsData = null;
      _cachedCompetitionsTimestamp = 0;

      return res.status(201).json({
        success: true,
        message: 'Competition created and published successfully!',
        competition: createdComp
      });
    } catch (err) {
      console.error('POST /api/competitions error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── DELETE /api/competitions ──
  if (req.method === 'DELETE') {
    try {
      const url = req.url || '';
      const cleanPath = url.split('?')[0];
      const parts = cleanPath.split('/').filter(Boolean);

      _cachedCompetitionsData = null;
      _cachedCompetitionsTimestamp = 0;

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      body = body || {};

      const isTournamentDelete = cleanPath.includes('/tournament') || req.query?.tournament || req.query?.tournamentName;
      const tName = (req.query?.name || req.query?.tournamentName || req.query?.tournament || body.name || body.tournamentName || '').trim();
      const tId = (req.query?.tournamentId || body.tournamentId || (cleanPath.includes('/tournament') ? req.query?.id : null) || '').trim();

      // Case A: Delete entire Tournament & all its competitions
      if (isTournamentDelete || (tName && !req.query?.id)) {
        if (!tName && !tId) {
          return res.status(400).json({ success: false, message: 'Tournament name or ID is required for deletion.' });
        }

        const tourIds = new Set();
        if (tId) tourIds.add(tId);
        if (tName) tourIds.add(`tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);

        // Find matching tournaments
        let tQuery = supabase.from('tournaments').select('id, name');
        if (tId && tName) {
          tQuery = tQuery.or(`id.eq.${tId},name.ilike.%${tName}%,tournament_name.ilike.%${tName}%`);
        } else if (tId) {
          tQuery = tQuery.eq('id', tId);
        } else {
          tQuery = tQuery.or(`name.ilike.%${tName}%,tournament_name.ilike.%${tName}%`);
        }
        const { data: matchedTours } = await tQuery;
        (matchedTours || []).forEach(t => tourIds.add(t.id));
        const tourIdsArr = Array.from(tourIds);

        // Find matching competitions
        let cQuery = supabase.from('competitions').select('id, tournament_id, tournament_name');
        if (tourIdsArr.length > 0 && tName) {
          cQuery = cQuery.or(`tournament_name.ilike.%${tName}%,tournament_id.in.(${tourIdsArr.join(',')})`);
        } else if (tourIdsArr.length > 0) {
          cQuery = cQuery.in('tournament_id', tourIdsArr);
        } else {
          cQuery = cQuery.ilike('tournament_name', `%${tName}%`);
        }
        const { data: matchedComps } = await cQuery;
        const compIdsArr = (matchedComps || []).map(c => c.id);

        // Cascade delete child registrations and fixtures
        if (compIdsArr.length > 0) {
          try { await supabase.from('external_registrations').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await supabase.from('competition_registrations').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await supabase.from('teams').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await supabase.from('match_fixtures').delete().in('competition_id', compIdsArr); } catch (e) {}
          try { await supabase.from('competitions').delete().in('id', compIdsArr); } catch (e) {}
        }

        if (tourIdsArr.length > 0) {
          try { await supabase.from('external_registrations').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await supabase.from('competition_registrations').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await supabase.from('teams').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await supabase.from('match_fixtures').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await supabase.from('competitions').delete().in('tournament_id', tourIdsArr); } catch (e) {}
          try { await supabase.from('tournaments').delete().in('id', tourIdsArr); } catch (e) {}
        }

        if (tName) {
          try { await supabase.from('competitions').delete().ilike('tournament_name', `%${tName}%`); } catch (e) {}
          try { await supabase.from('tournaments').delete().ilike('name', `%${tName}%`); } catch (e) {}
          try { await supabase.from('tournaments').delete().ilike('tournament_name', `%${tName}%`); } catch (e) {}
        }

        return res.json({
          success: true,
          message: `Tournament "${tName || tId}" and ${compIdsArr.length} competitions deleted successfully!`,
          deletedCount: compIdsArr.length
        });
      }

      // Case B: Delete single competition
      let targetId = req.query?.id;
      if (!targetId && parts.length > 0 && parts[parts.length - 1] !== 'competitions') {
        targetId = parts[parts.length - 1];
      }

      if (targetId && targetId !== 'tournament') {
        try {
          await supabase.from('external_registrations').delete().eq('competition_id', targetId);
          await supabase.from('competition_registrations').delete().eq('competition_id', targetId);
          await supabase.from('teams').delete().eq('competition_id', targetId);
          await supabase.from('match_fixtures').delete().eq('competition_id', targetId);
        } catch (e) {}
        const { error } = await supabase.from('competitions').delete().eq('id', targetId);
        if (error) throw error;
        return res.json({ success: true, message: 'Competition deleted successfully.', deletedId: targetId });
      }

      return res.status(400).json({ success: false, message: 'Competition or Tournament ID is required for deletion.' });
    } catch (err) {
      console.error('DELETE /api/competitions error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
