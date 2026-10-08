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
  athletics: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 }
};

function getSportRules(sportName) {
  if (!sportName) return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
  const clean = sportName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  for (const [key, rules] of Object.entries(DEFAULT_SPORT_RULES)) {
    if (clean.includes(key)) return rules;
  }
  return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.token || req.query.id;
  if (!token) return res.status(400).json({ success: false, message: 'Token parameter is required.' });

  try {
    let comp = null;
    let extraConfig = {};

    // 1. Primary lookup: Supabase Query
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

      // Lookup by rules string (contains JSON interCollegeConfig with registrationToken)
      const { data: dRules } = await supabase
        .from('competitions')
        .select('*')
        .ilike('rules', `%${token}%`)
        .maybeSingle();

      if (dRules) {
        comp = dRules;
      } else {
        // Lookup by competition ID
        const { data: dId } = await supabase
          .from('competitions')
          .select('*')
          .eq('id', token)
          .maybeSingle();
        if (dId) comp = dId;
      }
    } catch (supaErr) {
      console.warn('Supabase query error:', supaErr.message);
    }

    // 2. Secondary lookup: Local JSON database fallback
    if (!comp) {
      const pathsToTry = [
        path.join(__dirname, '../../server/data/local_db.json'),
        path.join(__dirname, '../server/data/local_db.json'),
        path.join(process.cwd(), 'server/data/local_db.json'),
        path.join(process.cwd(), 'dist/competitions.json'),
        path.join(process.cwd(), 'public/competitions.json')
      ];

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          try {
            const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
            const list = raw.competitions || (Array.isArray(raw) ? raw : []);
            const match = list.find(c =>
              c.registration_token === token ||
              c.registrationToken === token ||
              c.id === token ||
              (c.rules && typeof c.rules === 'string' && c.rules.includes(token))
            );
            if (match) {
              comp = match;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!comp) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired competition link.'
      });
    }

    // Parse extraConfig from rules if stored as JSON
    if (comp.rules && typeof comp.rules === 'string' && comp.rules.includes('{')) {
      try {
        const parsed = JSON.parse(comp.rules);
        if (parsed.interCollegeConfig) {
          extraConfig = parsed.interCollegeConfig;
        }
      } catch (e) {}
    }

    const deadline = comp.registration_end || comp.registration_deadline || comp.date;
    const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
    const isRegistrationEnabled = comp.external_registration_enabled !== false &&
      comp.status !== 'Registration Closed' &&
      comp.status !== 'Cancelled' &&
      comp.status !== 'Draft';

    const defaultRules = getSportRules(comp.sport_name || comp.name);
    const requiredPlayers = extraConfig.requiredPlayers || comp.required_players || defaultRules.requiredPlayers;
    const substitutes = extraConfig.substitutes !== undefined ? extraConfig.substitutes : (comp.substitutes !== undefined ? comp.substitutes : defaultRules.substitutes);
    const competitionMode = (extraConfig.competitionMode || comp.competition_mode || (comp.type === 'Team' ? 'TEAM' : defaultRules.mode)).toUpperCase();

    return res.status(200).json({
      success: true,
      competition: {
        id: comp.id,
        name: comp.name,
        tournamentName: comp.tournament_name || comp.name,
        sportName: comp.sport_name || comp.name,
        participationType: extraConfig.participationType || comp.participation_type || 'INTER_COLLEGE',
        competitionMode,
        gender: comp.gender || 'All',
        date: comp.date,
        startTime: comp.start_time || '09:00 AM',
        endTime: comp.end_time || '05:00 PM',
        venue: comp.venue || 'GASC Idappadi Sports Ground',
        registrationStart: comp.registration_start,
        registrationEnd: deadline,
        description: comp.description || '',
        rules: (comp.rules && typeof comp.rules === 'string' && comp.rules.startsWith('{')) ? '' : (comp.rules || ''),
        bannerImage: comp.banner_image || comp.banner_url || '/images/sports/tournament.png',
        contactPerson: extraConfig.contactPerson || comp.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: extraConfig.contactPhone || comp.contact_phone || '+91 94432 18765',
        contactEmail: extraConfig.contactEmail || comp.contact_email || 'sportsgascidappadi@gmail.com',
        requiredPlayers: Number(requiredPlayers),
        substitutes: Number(substitutes),
        maxPlayers: Number(requiredPlayers) + Number(substitutes),
        maxColleges: extraConfig.maxColleges || comp.max_colleges || 32,
        maxTeams: extraConfig.maxTeams || comp.max_teams || 16,
        status: comp.status || 'Registration Open',
        isRegistrationOpen: isRegistrationEnabled && !isDeadlinePassed,
        isDeadlinePassed,
        registrationToken: extraConfig.registrationToken || comp.registration_token || token
      }
    });

  } catch (err) {
    console.error('api/inter-college/competition error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving competition' });
  }
};
