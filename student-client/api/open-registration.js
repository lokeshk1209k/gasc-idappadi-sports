/**
 * Unified Serverless Handler for Inter-College Open Registration
 * Consolidates all 8 endpoints into 1 function to satisfy Vercel Hobby plan limits.
 */
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
const OTP_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';
const COLLEGE_NAME = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com',
    pass: process.env.EMAIL_PASS || 'aqrapupgrqymlhsh'
  }
});

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user.slice(-1)}@${domain}`;
}

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

  if (tStatus === 'completed' || cStatus === 'completed') return 'COMPLETED';
  if (tStatus === 'cancelled' || cStatus === 'cancelled') return 'CANCELLED';

  const regStart = c.registration_start ? new Date(c.registration_start) : null;
  if (regStart && now < regStart) return 'UPCOMING';

  const deadline = c.registration_end || c.registration_deadline || t?.end_date || c.date;
  const deadlineDate = deadline ? new Date(deadline) : null;
  if (deadlineDate && now > deadlineDate) return 'CLOSED';

  if (cStatus === 'draft' || tStatus === 'draft') return 'UPCOMING';
  if (cStatus === 'registration closed' || cStatus === 'closed' || tStatus === 'registration_closed') return 'CLOSED';

  const max = c.max_participants || c.max_teams || c.max_colleges;
  const current = c.current_registrations || 0;
  if (max && current >= max) return 'FULL';

  return 'OPEN';
}

// ── Handler: Tournaments List ──
async function handleTournaments(req, res) {
  try {
    const supabase = getSupabase();
    let tournaments = [];
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) tournaments = data;
    } catch (e) {}

    let competitions = [];
    try {
      const { data: compData } = await supabase
        .from('competitions')
        .select('*')
        .order('date', { ascending: true });
      if (Array.isArray(compData)) competitions = compData;
    } catch (e) {}

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
            description: c.description || 'Inter-College Championship conducted by GASC Idappadi.',
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

    const list = Array.from(interCollegeTournamentsMap.values());
    list.forEach(t => {
      const matchingComps = competitions.filter(c =>
        (c.tournament_id && c.tournament_id === t.id) ||
        (c.tournament_name && c.tournament_name.toLowerCase() === t.name.toLowerCase()) ||
        (c.name && c.name.toLowerCase() === t.name.toLowerCase())
      );
      t.competitionsCount = matchingComps.length > 0 ? matchingComps.length : 1;
    });

    return res.status(200).json({ success: true, tournaments: list, count: list.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load tournaments: ' + err.message });
  }
}

// ── Handler: Single Tournament & Competitions ──
async function handleTournament(req, res, tokenParam) {
  let token = tokenParam || req.query.token || req.query.id;
  if (!token && req.url) {
    const cleanUrl = req.url.split('?')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && !['tournament', 'tournaments', 'open-registration', 'inter-college'].includes(last.toLowerCase())) {
      token = decodeURIComponent(last);
    }
  }
  if (!token) return res.status(400).json({ success: false, message: 'Tournament token or ID is required.' });

  try {
    const supabase = getSupabase();
    let allTournaments = [];
    let allCompetitions = [];

    try {
      const { data: tData } = await supabase.from('tournaments').select('*');
      if (Array.isArray(tData)) allTournaments = tData;
      const { data: cData } = await supabase.from('competitions').select('*');
      if (Array.isArray(cData)) allCompetitions = cData;
    } catch (e) {}

    const lowerToken = token.toLowerCase();
    const cleanToken = lowerToken.replace(/[^a-z0-9]/g, '');

    let tournament = allTournaments.find(t =>
      (t.registration_token && t.registration_token.toLowerCase() === lowerToken) ||
      (t.id && t.id.toLowerCase() === lowerToken) ||
      (t.name && t.name.toLowerCase() === lowerToken) ||
      (t.tournament_name && t.tournament_name.toLowerCase() === lowerToken) ||
      (t.registration_token && t.registration_token.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
      (t.id && t.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
      (t.name && t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
      (t.tournament_name && t.tournament_name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken)
    );

    let activeCompetitionId = null;
    if (!tournament) {
      const matchedComp = allCompetitions.find(c =>
        (c.registration_token && c.registration_token.toLowerCase() === lowerToken) ||
        (c.registrationToken && c.registrationToken.toLowerCase() === lowerToken) ||
        (c.tournament_token && c.tournament_token.toLowerCase() === lowerToken) ||
        (c.tournament_id && c.tournament_id.toLowerCase() === lowerToken) ||
        (c.id && c.id.toLowerCase() === lowerToken) ||
        (c.tournament_name && c.tournament_name.toLowerCase() === lowerToken) ||
        (c.name && c.name.toLowerCase() === lowerToken) ||
        (c.tournament_id && c.tournament_id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
        (c.tournament_name && c.tournament_name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
        (c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
        (c.id && c.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanToken) ||
        (c.rules && typeof c.rules === 'string' && c.rules.includes(token))
      );

      if (matchedComp) {
        activeCompetitionId = matchedComp.id;
        const parentT = allTournaments.find(t =>
          (t.id && t.id.toLowerCase() === (matchedComp.tournament_id || '').toLowerCase()) ||
          (t.name && t.name.toLowerCase() === (matchedComp.tournament_name || matchedComp.name || '').toLowerCase()) ||
          (t.tournament_name && t.tournament_name.toLowerCase() === (matchedComp.tournament_name || matchedComp.name || '').toLowerCase()) ||
          (t.id && t.id.toLowerCase().replace(/[^a-z0-9]/g, '') === (matchedComp.tournament_id || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
        if (parentT) {
          tournament = parentT;
        } else {
          tournament = {
            id: matchedComp.tournament_id || `tour_${(matchedComp.tournament_name || matchedComp.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
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
    }

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found or invalid registration token.' });
    }

    const tId = (tournament.id || '').toLowerCase();
    const tClean = tId.replace(/[^a-z0-9]/g, '');
    const tName = (tournament.name || tournament.tournament_name || '').toLowerCase();
    const tNameClean = tName.replace(/[^a-z0-9]/g, '');

    let childComps = allCompetitions.filter(c =>
      (c.tournament_id && c.tournament_id.toLowerCase() === tId) ||
      (c.tournament_name && c.tournament_name.toLowerCase() === tName) ||
      (c.name && c.name.toLowerCase() === tName) ||
      (c.tournament_id && c.tournament_id.toLowerCase().replace(/[^a-z0-9]/g, '') === tClean) ||
      (c.tournament_name && c.tournament_name.toLowerCase().replace(/[^a-z0-9]/g, '') === tNameClean) ||
      (activeCompetitionId && c.id === activeCompetitionId)
    );


    const formattedCompetitions = childComps.map(c => {
      const sportName = c.sport_name || c.sportName || c.name || 'Sports';
      const defaultRules = getSportRules(sportName);
      let parsedRules = {};
      if (c.rules && typeof c.rules === 'string') {
        try { parsedRules = JSON.parse(c.rules); } catch(e) {}
      }

      const compMode = (c.competition_mode || parsedRules.competitionMode || (c.type === 'Team' ? 'TEAM' : defaultRules.mode)).toUpperCase();
      const status = calculateCompetitionStatus(c, tournament);

      return {
        id: c.id,
        name: c.name,
        tournamentName: tournament.name || tournament.tournament_name,
        tournamentId: tournament.id,
        sportName: sportName,
        eventName: c.event_name || c.eventName || c.name,
        gender: c.gender || 'Boys',
        competitionMode: compMode,
        date: c.date,
        startTime: c.start_time || '09:00 AM',
        endTime: c.end_time || '05:00 PM',
        venue: c.venue || tournament.venue || 'GASC Ground',
        registrationStart: c.registration_start,
        registrationDeadline: c.registration_end || c.registration_deadline || tournament.end_date,
        requiredPlayers: c.required_players || parsedRules.requiredPlayers || defaultRules.requiredPlayers,
        substitutes: c.substitutes !== undefined ? c.substitutes : (parsedRules.substitutes !== undefined ? parsedRules.substitutes : defaultRules.substitutes),
        maxPlayers: c.max_players || defaultRules.maxPlayers,
        maxColleges: c.max_colleges || 50,
        maxTeams: c.max_teams || 30,
        currentRegistrations: c.current_registrations || 0,
        status: status,
        description: c.description || tournament.description,
        bannerImage: c.banner_image || tournament.banner_image || '/images/sports/tournament.png',
        rules: c.rules,
        contactPerson: tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: tournament.contact_phone || '9443567890',
        contactEmail: tournament.contact_email || 'sportsgascidappadi@gmail.com',
        registrationToken: c.registration_token || c.id
      };
    });

    return res.status(200).json({
      success: true,
      activeCompetitionId,
      tournament: {
        id: tournament.id,
        name: tournament.name || tournament.tournament_name,
        description: tournament.description,
        startDate: tournament.start_date || tournament.date,
        endDate: tournament.end_date,
        registrationDeadline: tournament.registration_end || tournament.registration_deadline || tournament.end_date,
        venue: tournament.venue || 'College Ground',
        status: tournament.status || 'Registration Open',
        bannerImage: tournament.banner_image || tournament.banner_url || '/images/sports/tournament.png',
        registrationToken: tournament.registration_token || tournament.id,
        contactPerson: tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: tournament.contact_phone || '9443567890',
        contactEmail: tournament.contact_email || 'sportsgascidappadi@gmail.com',
        rules: tournament.rules || 'Collegiate ID card verification mandatory.',
        competitionsCount: formattedCompetitions.length
      },
      competitions: formattedCompetitions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}

async function parseRequestBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch(e) { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch(e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// ── Handler: Send OTP ──
async function handleSendOtp(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);
    const { email, competitionToken, collegeName, participantName } = body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    const expiryTime = Date.now() + expiryMinutes * 60 * 1000;

    const hash = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${cleanEmail}:${otp}:${expiryTime}`)
      .digest('hex');
    const otpToken = `${hash}.${expiryTime}`;

    try {
      const supabase = getSupabase();
      await supabase.from('external_otps').insert({
        email: cleanEmail,
        otp_hash: hash,
        competition_token: competitionToken || null,
        expires_at: new Date(expiryTime).toISOString()
      });
    } catch (dbErr) {}

    const mailOptions = {
      from: `"${COLLEGE_NAME} - Sports Department" <sportsgascidappadi@gmail.com>`,
      to: cleanEmail,
      subject: `Your Registration Verification Code: ${otp}`,
      html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
        <h2 style="color:#0f4c81;margin-top:0;">${COLLEGE_NAME}</h2>
        <h4 style="color:#334155;">Inter-College Sports Championship Registration</h4>
        <p>Dear ${participantName || 'Participant'} (${collegeName || 'Collegiate Team'}),</p>
        <p>Please enter the following 6-digit verification code to complete your registration:</p>
        <div style="background:#f1f5f9;padding:16px;text-align:center;border-radius:10px;margin:20px 0;">
          <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#0f4c81;">${otp}</span>
        </div>
        <p style="font-size:12px;color:#64748b;">This OTP code expires in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${maskEmail(cleanEmail)}`,
      otpToken,
      maskedEmail: maskEmail(cleanEmail)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP: ' + err.message });
  }
}

// ── Handler: Verify OTP ──
async function handleVerifyOtp(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);
    const { email, otp, otpToken } = body || {};

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    if (otpToken && otpToken.includes('.')) {
      const [expectedHash, expiryTimeStr] = otpToken.split('.');
      const expiryTime = parseInt(expiryTimeStr, 10);

      if (Date.now() <= expiryTime) {
        const calculated = crypto.createHmac('sha256', OTP_SECRET)
          .update(`${cleanEmail}:${cleanOtp}:${expiryTime}`)
          .digest('hex');

        if (calculated === expectedHash) {
          return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
      }
    }

    return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Verification error: ' + err.message });
  }
}

// ── Handler: Submit Registration ──
async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);

    const {
      competitionToken, collegeName, collegeAddress, district, state,
      collegePhone, collegeEmail, registrationType, sportName, gender,
      teamName, coachName, coachPhone, managerName, managerPhone,
      playerName, playerRegisterNumber, playerRollNumber, department, year,
      participantEmail, participantPhone, supportingDocument, players
    } = body || {};

    const finalRollNumber = (playerRegisterNumber || playerRollNumber || (players && players[0] && players[0].registerNumber) || '').trim().toUpperCase();

    if (!competitionToken) return res.status(400).json({ success: false, message: 'Competition token is required.' });
    if (!collegeName || !collegeName.trim()) return res.status(400).json({ success: false, message: 'College name is required.' });
    if (!collegeAddress || !collegeAddress.trim()) return res.status(400).json({ success: false, message: 'College address is required.' });
    if (!district || !district.trim()) return res.status(400).json({ success: false, message: 'District is required.' });
    if (!state || !state.trim()) return res.status(400).json({ success: false, message: 'State is required.' });
    if (!participantEmail || !participantEmail.includes('@')) return res.status(400).json({ success: false, message: 'Valid contact email is required.' });
    if (!participantPhone || !participantPhone.trim()) return res.status(400).json({ success: false, message: 'Valid contact phone is required.' });

    const supabase = getSupabase();

    let comp = null;
    try {
      const { data: dRules } = await supabase
        .from('competitions')
        .select('*')
        .ilike('rules', `%${competitionToken}%`)
        .maybeSingle();

      if (dRules) {
        comp = dRules;
      } else {
        const { data: dId } = await supabase
          .from('competitions')
          .select('*')
          .eq('id', competitionToken)
          .maybeSingle();
        if (dId) comp = dId;
      }
    } catch (e) {}

    if (!comp) {
      comp = {
        id: competitionToken,
        name: sportName || 'Inter-College Competition',
        sport_name: sportName || 'Sports',
        tournament_id: 'tour_gasc_inter'
      };
    }

    const mode = (registrationType || (comp.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
    const cleanCollege = collegeName.trim();
    const cleanEmail = participantEmail.toLowerCase().trim();

    if (mode === 'INDIVIDUAL') {
      if (!playerName || !playerName.trim()) return res.status(400).json({ success: false, message: 'Player name is required.' });
      if (!finalRollNumber) return res.status(400).json({ success: false, message: 'Player register/roll number is required.' });
    }

    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationId = `GASC-IC-2026-${hex}`;
    const primaryId = `ereg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const regPayload = {
      id: primaryId,
      registration_id: registrationId,
      competition_id: comp.id,
      college_name: cleanCollege,
      college_address: collegeAddress.trim(),
      district: district.trim(),
      state: state.trim(),
      college_phone: collegePhone?.trim() || null,
      college_email: collegeEmail?.trim() || null,
      registration_type: mode,
      sport_id: comp.sport_id || null,
      sport_name: comp.sport_name || comp.name,
      gender: gender || comp.gender || 'All',
      team_name: mode === 'TEAM' ? (teamName?.trim() || `${cleanCollege} Team`) : null,
      coach_name: coachName?.trim() || null,
      coach_phone: coachPhone?.trim() || null,
      manager_name: managerName?.trim() || null,
      manager_phone: managerPhone?.trim() || null,
      player_name: mode === 'INDIVIDUAL' ? playerName?.trim() : null,
      player_register_number: mode === 'INDIVIDUAL' ? finalRollNumber : null,
      department: department?.trim() || 'General',
      year: year?.trim() || 'I Year',
      participant_email: cleanEmail,
      participant_phone: participantPhone.trim(),
      supporting_document: supportingDocument || null,
      otp_verified: true,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const compReg = {
        id: primaryId,
        competition_id: comp.id,
        student_id: registrationId,
        student_name: mode === 'TEAM' ? (teamName?.trim() || `${cleanCollege} Team`) : (playerName?.trim() || 'External Athlete'),
        register_number: (mode === 'INDIVIDUAL' ? (finalRollNumber || registrationId) : (coachPhone?.trim() || registrationId)),
        department: cleanCollege,
        gender: gender || comp.gender || 'All',
        tournament_id: comp.tournament_id || 'tour_gasc_inter',
        sport_id: comp.sport_id || 'sp_cricket',
        sport_name: comp.sport_name || comp.name,
        preferred_position: mode,
        remarks: JSON.stringify({ ...regPayload, players: Array.isArray(players) ? players : [] }),
        status: 'Pending',
        registration_date: new Date().toISOString()
      };
      await supabase.from('competition_registrations').insert(compReg);
    } catch (e) {}

    try {
      await supabase.from('external_registrations').insert(regPayload);
    } catch (e) {}

    if (mode === 'TEAM' && Array.isArray(players)) {
      for (const p of players) {
        const pId = `epl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          await supabase.from('external_registration_players').insert({
            id: pId,
            external_registration_id: primaryId,
            player_name: p.playerName || p.name || 'Player',
            college_register_number: (p.registerNumber || p.rollNo || 'N/A').toUpperCase().trim(),
            department: p.department || 'General',
            year: p.year || 'I Year',
            gender: p.gender || gender || 'Boys',
            player_role: p.playerRole || p.role || 'Player'
          });
        } catch(e) {}
      }
    }

    try {
      const confirmHtml = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
        <h2 style="color:#0f4c81;margin-top:0;">${COLLEGE_NAME}</h2>
        <h3 style="color:#16a34a;">✅ Registration Submitted Successfully</h3>
        <p>Your registration for <strong>${comp.name}</strong> has been received and is PENDING sports board verification.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:10px;margin:18px 0;border:1px solid #cbd5e1;">
          <p><strong>Registration ID:</strong> <span style="color:#0f4c81;font-weight:800;font-size:16px;">${registrationId}</span></p>
          <p><strong>College:</strong> ${cleanCollege}</p>
          <p><strong>Competition:</strong> ${comp.name}</p>
          <p><strong>Status:</strong> PENDING APPROVAL</p>
        </div>
        <p style="font-size:12px;color:#64748b;">Please preserve this email as proof of entry. Report to the venue with original college ID cards.</p>
      </div>`;

      await transporter.sendMail({
        from: `"${COLLEGE_NAME} - Sports Department" <sportsgascidappadi@gmail.com>`,
        to: cleanEmail,
        subject: `[${registrationId}] Registration Submitted: ${comp.name}`,
        html: confirmHtml
      });
    } catch (mErr) {}

    return res.status(201).json({
      success: true,
      registrationId,
      message: 'Registration submitted successfully! Pending Sports Administrator review.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  }
}

// ── Handler: Receipt Details ──
async function handleReceipt(req, res, idParam) {
  let id = idParam || req.query.id || req.query.registrationId;
  if (!id && req.url) {
    const cleanUrl = req.url.split('?')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && !['receipt', 'open-registration', 'inter-college'].includes(last.toLowerCase())) {
      id = decodeURIComponent(last);
    }
  }
  if (!id) return res.status(400).json({ success: false, message: 'Registration ID is required.' });

  try {
    const supabase = getSupabase();
    let reg = null;
    let players = [];

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

    if (!reg) return res.status(404).json({ success: false, message: 'Registration record not found.' });

    return res.status(200).json({ success: true, registration: reg, players });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Receipt fetch error: ' + err.message });
  }
}

// ── Handler: QR Code Generator ──
async function handleQr(req, res, tokenParam) {
  let token = tokenParam || req.query.token || req.query.id;
  if (!token && req.url) {
    const cleanUrl = req.url.split('?')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && !['qr', 'open-registration', 'inter-college'].includes(last.toLowerCase())) {
      token = decodeURIComponent(last);
    }
  }
  if (!token) return res.status(400).json({ success: false, message: 'QR token is required' });

  let baseUrl = req.query.baseUrl || 'https://gasc-student-portal.vercel.app';
  baseUrl = baseUrl.replace(/\/+$/, '');
  const targetPath = req.query.path || `/open-registration/${token}`;
  const registrationUrl = `${baseUrl}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
  const size = parseInt(req.query.size, 10) || 300;

  try {
    const buffer = await QRCode.toBuffer(registrationUrl, {
      type: 'png',
      width: size,
      margin: 2,
      color: { dark: '#0a192f', light: '#ffffff' }
    });
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'QR generation failed: ' + err.message });
  }
}

// ── Handler: Competitions CRUD for Web Admin ──
async function handleCompetitions(req, res) {
  const supabase = getSupabase();
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('competitions').select('*').order('date', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ success: true, count: (data || []).length, competitions: data || [] });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }
      body = body || {};

      const name = (body.name || body.compName || 'Competition').trim();
      const sportName = body.sportName || body.sport_name || name;
      const tName = (body.tournamentName || body.tournament_name || name.split('-')[0]).trim();
      const tId = body.tournamentId || body.tournament_id || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const uniqueCompId = body.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const pType = body.participationType || body.participation_type || (body.type === 'Inter-College' ? 'INTER_COLLEGE' : 'INTRA_COLLEGE');
      const cMode = (body.competitionMode || body.competition_mode || (body.type === 'Team Event' || body.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
      const token = body.registrationToken || body.registration_token || crypto.randomBytes(16).toString('hex');
      const bannerImage = body.coverImageUrl || body.bannerImage || '/images/sports/tournament.png';
      const dateVal = body.date || new Date().toISOString();
      const regEnd = body.registrationEnd || body.date || new Date().toISOString();

      // Upsert parent tournament
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
          external_registration_enabled: pType === 'INTER_COLLEGE',
          registration_token: tourToken,
          contact_person: body.contactPerson || 'Dr. R. ANITHA (Physical Director)',
          contact_phone: body.contactPhone || '9443567890',
          contact_email: body.contactEmail || 'sportsgascidappadi@gmail.com',
          rules: body.rules || 'Official collegiate ID cards and bonafide certificates from the respective Head of Department/Principal are mandatory.'
        }, { onConflict: 'id' });
      } catch (tErr) {
        console.warn('Parent tournament upsert notice:', tErr.message);
      }

      const newComp = {
        id: uniqueCompId,
        name: name,
        tournament_id: tId,
        tournament_name: tName,
        sport_id: body.sportId || 'sp_general',
        sport_name: sportName,
        type: body.type || 'Inter-College',
        level: body.level || 'College',
        venue: body.venue || 'GASC Idappadi Sports Ground',
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
        status: 'Registration Open',
        participation_type: pType,
        competition_mode: cMode,
        registration_token: token,
        external_registration_enabled: pType === 'INTER_COLLEGE',
        required_players: body.requiredPlayers ? Number(body.requiredPlayers) : null,
        substitutes: body.substitutes ? Number(body.substitutes) : null,
        max_colleges: body.maxColleges ? Number(body.maxColleges) : null,
        max_teams: body.maxTeams ? Number(body.maxTeams) : null,
        contact_person: body.contactPerson || 'Dr. R. ANITHA (Physical Director)',
        contact_phone: body.contactPhone || '9443567890',
        contact_email: body.contactEmail || 'sportsgascidappadi@gmail.com',
        rules: body.rules || ''
      };

      const { data: createdComp, error } = await supabase.from('competitions').insert(newComp).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Competition created and published successfully!',
        competition: createdComp
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ── Main Dispatcher ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanPath = url.split('?')[0].toLowerCase();

  if (cleanPath.includes('/tournaments') || cleanPath === '/tournaments') {
    return handleTournaments(req, res);
  }
  if (cleanPath.includes('/tournament')) {
    return handleTournament(req, res);
  }
  if (cleanPath.includes('/competitions') || cleanPath === '/competitions') {
    return handleCompetitions(req, res);
  }
  if (cleanPath.includes('/send-otp')) {
    return handleSendOtp(req, res);
  }
  if (cleanPath.includes('/verify-otp')) {
    return handleVerifyOtp(req, res);
  }
  if (cleanPath.includes('/register')) {
    return handleRegister(req, res);
  }
  if (cleanPath.includes('/receipt')) {
    return handleReceipt(req, res);
  }
  if (cleanPath.includes('/qr')) {
    return handleQr(req, res);
  }

  // Default to tournaments list if root called
  return handleTournaments(req, res);
};
