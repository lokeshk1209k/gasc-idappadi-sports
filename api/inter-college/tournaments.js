const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // 1. Fetch tournaments from Supabase
    let tournaments = [];
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        tournaments = data;
      }
    } catch (e) {
      console.warn('Tournaments fetch error:', e.message);
    }

    // 2. Fetch all competitions to map counts & verify inter-college tournaments
    let competitions = [];
    try {
      const { data: compData } = await supabase
        .from('competitions')
        .select('*')
        .order('date', { ascending: true });
      if (Array.isArray(compData)) competitions = compData;
    } catch (e) {}

    // Fallback if tournaments table is empty or localStore fallback needed
    if (tournaments.length === 0) {
      const paths = [
        path.join(__dirname, '../../server/data/local_db.json'),
        path.join(process.cwd(), 'server/data/local_db.json'),
        path.join(process.cwd(), 'client/public/competitions.json')
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) {
          try {
            const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (raw.tournaments) tournaments = raw.tournaments;
            if (raw.competitions && competitions.length === 0) competitions = raw.competitions;
            if (tournaments.length > 0) break;
          } catch (e) {}
        }
      }
    }

    // Derive or group inter-college tournaments
    // An inter-college tournament is either marked participation_type = 'INTER_COLLEGE'
    // or has type = 'Inter-College' or has child competitions with type 'Inter-College' / 'INTER_COLLEGE'
    const interCollegeTournamentsMap = new Map();

    tournaments.forEach(t => {
      const tName = (t.tournament_name || t.name || '').trim();
      const isInter = t.participation_type === 'INTER_COLLEGE' ||
                      t.type === 'Inter-College' ||
                      (t.description && t.description.toLowerCase().includes('inter-college')) ||
                      (tName && tName.toLowerCase().includes('inter-college'));

      if (isInter) {
        interCollegeTournamentsMap.set(t.id || tName, {
          id: t.id,
          name: tName || 'Inter-College Championship',
          description: t.description || 'Government Arts and Science College, Idappadi Inter-College Tournament.',
          startDate: t.start_date || t.date || new Date().toISOString(),
          endDate: t.end_date || t.registration_end || null,
          venue: t.venue || 'GASC Idappadi Sports Ground',
          status: t.status || 'Registration Open',
          bannerImage: t.banner_image || t.banner_url || '/images/sports/tournament.png',
          registrationToken: t.registration_token || t.id,
          competitionsCount: 0
        });
      }
    });

    // Also scan competitions for any Inter-College tournaments that might not be in tournaments table
    competitions.forEach(c => {
      const isCompInter = c.participation_type === 'INTER_COLLEGE' ||
                          c.type === 'Inter-College' ||
                          (c.rules && typeof c.rules === 'string' && c.rules.includes('INTER_COLLEGE'));
      if (isCompInter) {
        const tId = c.tournament_id || `tour_${(c.tournament_name || c.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const tName = c.tournament_name || c.name;
        if (!interCollegeTournamentsMap.has(tId) && !interCollegeTournamentsMap.has(tName)) {
          interCollegeTournamentsMap.set(tId, {
            id: tId,
            name: tName,
            description: c.description || `Inter-College Championship conducted by GASC Idappadi.`,
            startDate: c.date,
            endDate: c.registration_end || c.registration_deadline,
            venue: c.venue || 'College Ground',
            status: c.status || 'Registration Open',
            bannerImage: c.banner_image || '/images/sports/tournament.png',
            registrationToken: c.tournament_token || tId,
            competitionsCount: 0
          });
        }
      }
    });

    // Count competitions per tournament
    const list = Array.from(interCollegeTournamentsMap.values());
    list.forEach(t => {
      const matchingComps = competitions.filter(c =>
        (c.tournament_id && c.tournament_id === t.id) ||
        (c.tournament_name && c.tournament_name.toLowerCase() === t.name.toLowerCase()) ||
        (c.name && c.name.toLowerCase() === t.name.toLowerCase())
      );
      t.competitionsCount = matchingComps.length > 0 ? matchingComps.length : 1;
    });

    return res.status(200).json({
      success: true,
      tournaments: list,
      count: list.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load inter-college tournaments: ' + err.message
    });
  }
};
