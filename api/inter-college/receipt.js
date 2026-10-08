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

    const { data: reg } = await supabase
      .from('external_registrations')
      .select('*')
      .or(`id.eq.${id},registration_id.eq.${id}`)
      .maybeSingle();

    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const { data: players } = await supabase
      .from('external_registration_players')
      .select('*')
      .eq('external_registration_id', reg.id)
      .order('created_at', { ascending: true });

    const { data: comp } = await supabase
      .from('competitions')
      .select('name, tournament_name, sport_name, venue, date, start_time, contact_person, contact_phone')
      .eq('id', reg.competition_id)
      .maybeSingle();

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
