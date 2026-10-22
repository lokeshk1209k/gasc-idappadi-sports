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

  // ── GET /api/competitions ──
  if (req.method === 'GET') {
    try {
      const { tournament_id, tournamentId } = req.query || {};
      const targetTour = tournament_id || tournamentId;

      const nowTime = Date.now();
      if (!targetTour && _cachedCompetitionsData && (nowTime - _cachedCompetitionsTimestamp < CACHE_TTL_MS)) {
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

      const responsePayload = {
        success: true,
        count: (data || []).length,
        competitions: data || []
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
      const pType = parentTour?.participation_type || body.participationType || body.participation_type || (body.type === 'Inter-College' ? 'INTER_COLLEGE' : 'BOTH');
      const cMode = (body.competitionMode || body.competition_mode || (body.type === 'Team Event' || body.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
      const token = body.registrationToken || body.registration_token || crypto.randomBytes(16).toString('hex');
      const bannerImage = body.coverImageUrl || body.bannerImage || parentTour?.banner_image || '/images/sports/tournament.png';
      const dateVal = body.date || new Date().toISOString();
      const regEnd = body.registrationEnd || body.date || new Date().toISOString();
      const isExternal = (pType === 'BOTH' || pType === 'INTER_COLLEGE');

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
            external_registration_enabled: isExternal,
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
        external_registration_enabled: isExternal,
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
      let targetId = req.query?.id;
      if (!targetId && parts.length > 0 && parts[parts.length - 1] !== 'competitions') {
        targetId = parts[parts.length - 1];
      }

      if (targetId) {
        try {
          await supabase.from('external_registrations').delete().eq('competition_id', targetId);
          await supabase.from('competition_registrations').delete().eq('competition_id', targetId);
        } catch (e) {}
        const { error } = await supabase.from('competitions').delete().eq('id', targetId);
        if (error) throw error;
        return res.json({ success: true, message: 'Competition deleted successfully.', deletedId: targetId });
      }

      return res.status(400).json({ success: false, message: 'Competition ID is required for deletion.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
