const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, message: 'Registration ID is required.' });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    let reg = null;
    let players = [];

    // 1. Try external_registrations table
    try {
      const { data: r1 } = await supabase
        .from('external_registrations')
        .select('*')
        .or(`id.eq.${id},registration_id.eq.${id}`)
        .maybeSingle();
      if (r1) {
        reg = r1;
        const { data: pls } = await supabase
          .from('external_registration_players')
          .select('*')
          .eq('external_registration_id', reg.id)
          .order('created_at', { ascending: true });
        if (pls) players = pls;
      }
    } catch(e) {}

    // 2. Try competition_registrations table
    if (!reg) {
      try {
        const { data: r2 } = await supabase
          .from('competition_registrations')
          .select('*')
          .or(`id.eq.${id},student_id.eq.${id}`)
          .maybeSingle();

        if (r2) {
          let details = {};
          try { details = JSON.parse(r2.remarks || '{}'); } catch(e) {}
          reg = {
            id: r2.id,
            registration_id: r2.student_id,
            competition_id: r2.competition_id,
            college_name: details.college_name || details.collegeName || r2.department,
            college_address: details.college_address || details.collegeAddress || '',
            district: details.district || '',
            state: details.state || 'Tamil Nadu',
            college_phone: details.college_phone || details.collegePhone,
            college_email: details.college_email || details.collegeEmail,
            registration_type: details.registration_type || details.registrationType || r2.preferred_position || 'TEAM',
            sport_name: r2.sport_name,
            gender: r2.gender,
            team_name: details.team_name || details.teamName || r2.student_name,
            coach_name: details.coach_name || details.coachName,
            coach_phone: details.coach_phone || details.coachPhone,
            manager_name: details.manager_name || details.managerName,
            manager_phone: details.manager_phone || details.managerPhone,
            player_name: details.player_name || details.playerName || r2.student_name,
            player_register_number: details.player_register_number || details.playerRegisterNumber || r2.register_number,
            department: details.department || r2.department,
            year: details.year || 'I Year',
            participant_email: details.participant_email || details.participantEmail,
            participant_phone: details.participant_phone || details.participantPhone,
            status: r2.status || 'PENDING',
            created_at: r2.created_at || r2.registration_date
          };
          if (details.players && Array.isArray(details.players)) {
            players = details.players;
          }
        }
      } catch(e) {}
    }

    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found.' });

    let comp = null;
    try {
      const { data: cData } = await supabase
        .from('competitions')
        .select('name, tournament_name, sport_name, venue, date, start_time, contact_person, contact_phone')
        .eq('id', reg.competition_id)
        .maybeSingle();
      if (cData) comp = cData;
    } catch(e) {}

    return res.status(200).json({
      success: true,
      registration: reg,
      players: players || [],
      competition: comp || null
    });
  } catch(err) {
    console.error('api/inter-college/receipt error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching receipt' });
  }
};
