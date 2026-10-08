const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

const DEFAULT_SPORT_RULES = {
  cricket: { mode: 'TEAM', requiredPlayers: 11, substitutes: 4, maxPlayers: 15 },
  football: { mode: 'TEAM', requiredPlayers: 11, substitutes: 5, maxPlayers: 16 },
  volleyball: { mode: 'TEAM', requiredPlayers: 6, substitutes: 6, maxPlayers: 12 },
  kabaddi: { mode: 'TEAM', requiredPlayers: 7, substitutes: 5, maxPlayers: 12 },
  basketball: { mode: 'TEAM', requiredPlayers: 5, substitutes: 5, maxPlayers: 10 },
  hockey: { mode: 'TEAM', requiredPlayers: 11, substitutes: 5, maxPlayers: 16 },
  kho_kho: { mode: 'TEAM', requiredPlayers: 9, substitutes: 3, maxPlayers: 12 },
  handball: { mode: 'TEAM', requiredPlayers: 7, substitutes: 5, maxPlayers: 12 },
  throwball: { mode: 'TEAM', requiredPlayers: 7, substitutes: 5, maxPlayers: 12 },
  relay: { mode: 'TEAM', requiredPlayers: 4, substitutes: 1, maxPlayers: 5 },
  badminton: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  tennis: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  table_tennis: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  chess: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  carrom: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  running: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  athletics: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  long_jump: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  high_jump: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  shot_put: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  javelin_throw: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  discus_throw: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 }
};

function getSportRules(sportName) {
  if (!sportName) return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
  const clean = sportName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  for (const [key, rules] of Object.entries(DEFAULT_SPORT_RULES)) {
    if (clean.includes(key)) return rules;
  }
  return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
}

function calculateCompetitionStatus(c, t) {
  const now = new Date();
  const cStatus = (c.status || '').toLowerCase();
  const tStatus = (t?.status || '').toLowerCase();

  // If tournament or competition is explicitly completed or cancelled
  if (tStatus === 'completed' || cStatus === 'completed') return 'COMPLETED';
  if (tStatus === 'cancelled' || cStatus === 'cancelled') return 'CANCELLED';

  // Check registration start
  const regStart = c.registration_start ? new Date(c.registration_start) : null;
  if (regStart && now < regStart) return 'UPCOMING';

  // Check registration deadline
  const deadline = c.registration_end || c.registration_deadline || t?.end_date || c.date;
  const deadlineDate = deadline ? new Date(deadline) : null;
  if (deadlineDate && now > deadlineDate) return 'CLOSED';

  // Check explicit status
  if (cStatus === 'draft' || tStatus === 'draft') return 'UPCOMING';
  if (cStatus === 'registration closed' || cStatus === 'closed' || tStatus === 'registration_closed') return 'CLOSED';

  // Check capacity limit
  const max = c.max_participants || c.max_teams || c.max_colleges;
  const current = c.current_registrations || 0;
  if (max && current >= max) return 'FULL';

  return 'OPEN';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.token || req.query.id;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Tournament token or ID is required.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    let tournament = null;
    let allTournaments = [];
    let allCompetitions = [];

    // 1. Query Supabase
    try {
      const { data: tData } = await supabase.from('tournaments').select('*');
      if (Array.isArray(tData)) allTournaments = tData;

      const { data: cData } = await supabase.from('competitions').select('*');
      if (Array.isArray(cData)) allCompetitions = cData;
    } catch (e) {
      console.warn('Supabase query error:', e.message);
    }

    // Fallback search in local files
    if (allTournaments.length === 0 || allCompetitions.length === 0) {
      const paths = [
        path.join(__dirname, '../../server/data/local_db.json'),
        path.join(process.cwd(), 'server/data/local_db.json'),
        path.join(process.cwd(), 'client/public/competitions.json')
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) {
          try {
            const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (raw.tournaments && allTournaments.length === 0) allTournaments = raw.tournaments;
            if (raw.competitions && allCompetitions.length === 0) allCompetitions = raw.competitions;
          } catch (e) {}
        }
      }
    }

    // Try finding tournament by registration_token, id, or tournament_name matching token
    const lowerToken = token.toLowerCase();
    tournament = allTournaments.find(t =>
      (t.registration_token && t.registration_token.toLowerCase() === lowerToken) ||
      (t.id && t.id.toLowerCase() === lowerToken) ||
      (t.name && t.name.toLowerCase() === lowerToken) ||
      (t.tournament_name && t.tournament_name.toLowerCase() === lowerToken)
    );

    // If still not found in tournaments, look through competitions rules or tournament_id
    if (!tournament) {
      const matchedComp = allCompetitions.find(c =>
        (c.tournament_token && c.tournament_token.toLowerCase() === lowerToken) ||
        (c.tournament_id && c.tournament_id.toLowerCase() === lowerToken) ||
        (c.rules && typeof c.rules === 'string' && c.rules.includes(token)) ||
        (c.id && c.id.toLowerCase() === lowerToken)
      );

      if (matchedComp) {
        const tId = matchedComp.tournament_id || `tour_${(matchedComp.tournament_name || matchedComp.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        tournament = {
          id: tId,
          name: matchedComp.tournament_name || matchedComp.name,
          tournament_name: matchedComp.tournament_name || matchedComp.name,
          description: matchedComp.description || 'Government Arts and Science College, Idappadi Inter-College Sports Meet.',
          venue: matchedComp.venue || 'GASC Idappadi Sports Ground',
          start_date: matchedComp.date,
          end_date: matchedComp.registration_end || matchedComp.registration_deadline,
          status: matchedComp.status || 'Registration Open',
          banner_image: matchedComp.banner_image || '/images/sports/tournament.png',
          registration_token: token
        };
      }
    }

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired tournament registration link. Tournament not found.'
      });
    }

    const tName = tournament.tournament_name || tournament.name;
    const tId = tournament.id;

    // Find ALL competitions belonging to this tournament
    const childComps = allCompetitions.filter(c =>
      (c.tournament_id && c.tournament_id === tId) ||
      (c.tournament_name && c.tournament_name.toLowerCase() === tName.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === tName.toLowerCase()) ||
      (c.id === tId) ||
      (c.rules && typeof c.rules === 'string' && c.rules.includes(token))
    );

    // Map each competition with sport rules & status
    const mappedCompetitions = childComps.map(c => {
      let extra = {};
      if (c.rules && typeof c.rules === 'string') {
        try { extra = JSON.parse(c.rules); } catch (e) {}
      }

      const sportName = c.sport_name || c.name || 'Athletics';
      const defaultRules = getSportRules(sportName);

      const mode = (extra.competitionMode || c.competition_mode || (c.type === 'Team' ? 'TEAM' : defaultRules.mode)).toUpperCase();
      const requiredPlayers = Number(extra.requiredPlayers || c.required_players || defaultRules.requiredPlayers);
      const substitutes = Number(extra.substitutes !== undefined ? extra.substitutes : (c.substitutes !== undefined ? c.substitutes : defaultRules.substitutes));
      const maxPlayers = Number(extra.maxPlayers || c.max_players || defaultRules.maxPlayers);

      const status = calculateCompetitionStatus(c, tournament);

      return {
        id: c.id,
        name: c.name || sportName,
        tournamentName: tName,
        tournamentId: tId,
        sportName: sportName,
        eventName: c.event_name || c.name,
        gender: c.gender || extra.gender || 'Boys',
        competitionMode: mode,
        date: c.date || tournament.start_date,
        startTime: c.start_time || '09:00 AM',
        endTime: c.end_time || '05:00 PM',
        venue: c.venue || tournament.venue || 'GASC Idappadi Sports Ground',
        registrationStart: c.registration_start || tournament.start_date,
        registrationDeadline: c.registration_end || c.registration_deadline || tournament.end_date,
        requiredPlayers,
        substitutes,
        maxPlayers,
        maxColleges: Number(extra.maxColleges || c.max_colleges || 50),
        maxTeams: Number(extra.maxTeams || c.max_teams || 30),
        currentRegistrations: Number(c.current_registrations || 0),
        status, // UPCOMING, OPEN, CLOSED, FULL, COMPLETED
        description: c.description || '',
        bannerImage: c.banner_image || tournament.banner_image || '/images/sports/tournament.png',
        rules: c.rules || tournament.rules || '',
        contactPerson: extra.contactPerson || tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: extra.contactPhone || tournament.contact_phone || '+91 94432 18765',
        contactEmail: extra.contactEmail || tournament.contact_email || 'sportsgascidappadi@gmail.com',
        registrationToken: c.registration_token || c.id
      };
    });

    return res.status(200).json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tName,
        description: tournament.description || 'Government Arts and Science College, Idappadi Inter-College Sports Championship.',
        startDate: tournament.start_date || tournament.date,
        endDate: tournament.end_date || tournament.registration_end,
        registrationDeadline: tournament.end_date || tournament.registration_end,
        venue: tournament.venue || 'GASC Idappadi Sports Ground',
        status: tournament.status || 'Registration Open',
        bannerImage: tournament.banner_image || tournament.banner_url || '/images/sports/tournament.png',
        registrationToken: tournament.registration_token || token,
        contactPerson: tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: tournament.contact_phone || '+91 94432 18765',
        contactEmail: tournament.contact_email || 'sportsgascidappadi@gmail.com',
        rules: tournament.rules || 'Official collegiate ID cards and bonafide certificates from the respective Head of Department/Principal are mandatory.'
      },
      competitions: mappedCompetitions
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tournament details: ' + err.message
    });
  }
};
