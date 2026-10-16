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
  if (!token || !token.trim()) return res.status(400).json({ success: false, message: 'Tournament token or ID is required.' });

  const cleanToken = token.trim();
  const lowerToken = cleanToken.toLowerCase();
  const tokenSlug = lowerToken.replace(/[^a-z0-9]/g, '_');
  const tourPrefixed = lowerToken.startsWith('tour_') ? lowerToken : `tour_${tokenSlug}`;

  try {
    const supabase = getSupabase();

    // 1. Fetch exactly ONE tournament using the validated QR token from actual Supabase DB
    const { data: tList, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .or(`registration_token.eq.${cleanToken},registration_token.eq.${lowerToken},id.eq.${cleanToken},id.eq.${tourPrefixed},tournament_name.ilike.${cleanToken},name.ilike.${cleanToken}`)
      .limit(5);

    if (tErr) {
      console.error('Supabase tournament query error:', tErr);
    }

    let tournament = (Array.isArray(tList) && tList.length > 0) ? tList[0] : null;

    if (!tournament && Array.isArray(tList)) {
      tournament = tList.find(t =>
        (t.registration_token && t.registration_token.toLowerCase() === lowerToken) ||
        (t.id && t.id.toLowerCase() === lowerToken) ||
        (t.id && t.id.toLowerCase() === tourPrefixed)
      );
    }

    // 2. Validate token: if not found, return 404
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or invalid registration token.'
      });
    }

    // 3. Status checks: if tournament is unpublished, disabled, cancelled, or expired
    const tStatus = (tournament.status || '').toLowerCase().trim();
    if (
      tournament.external_registration_enabled === false ||
      tournament.is_published === false ||
      tStatus === 'unpublished' ||
      tStatus === 'disabled' ||
      tStatus === 'cancelled' ||
      tStatus === 'draft'
    ) {
      return res.status(403).json({
        success: false,
        message: 'This tournament registration is currently closed or unpublished. Please contact the Sports Department.'
      });
    }

    const deadline = tournament.registration_deadline || tournament.end_date;
    const deadlineDate = deadline ? new Date(deadline) : null;
    if (deadlineDate && !isNaN(deadlineDate.getTime()) && tStatus === 'closed') {
      return res.status(410).json({
        success: false,
        message: 'Tournament registration has closed.'
      });
    }

    // 4. Expected Supabase query logic: Fetch competitions filtered strictly by that tournament's actual ID:
    // WHERE tournament_id = selectedTournament.id
    const { data: cData, error: cErr } = await supabase
      .from('competitions')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('date', { ascending: true });

    let childComps = Array.isArray(cData) ? cData : [];

    // Fallback: If legacy competitions were created with tournament_name before tournament_id was populated
    if (childComps.length === 0 && (tournament.tournament_name || tournament.name)) {
      const tName = tournament.tournament_name || tournament.name;
      const { data: legacyData } = await supabase
        .from('competitions')
        .select('*')
        .eq('tournament_name', tName)
        .order('date', { ascending: true });
      if (Array.isArray(legacyData) && legacyData.length > 0) {
        childComps = legacyData;
      }
    }

    // 5. Format and sanitize output (Do NOT return any other tournaments or unrelated competitions)
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
        contactPhone: tournament.contact_phone || '+91 94432 18765',
        contactEmail: tournament.contact_email || 'sportsgascidappadi@gmail.com',
        registrationToken: c.registration_token || c.id
      };
    });

    return res.status(200).json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name || tournament.tournament_name,
        description: tournament.description || 'Inter-College Tournament conducted by Government Arts and Science College, Idappadi.',
        startDate: tournament.start_date || tournament.date,
        endDate: tournament.end_date || tournament.registration_end,
        registrationDeadline: tournament.registration_deadline || tournament.end_date,
        venue: tournament.venue || 'GASC Idappadi Sports Ground',
        status: tournament.status || 'Registration Open',
        bannerImage: tournament.banner_image || '/images/sports/tournament.png',
        registrationToken: tournament.registration_token || tournament.id,
        contactPerson: tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: tournament.contact_phone || '+91 94432 18765',
        contactEmail: tournament.contact_email || 'sportsgascidappadi@gmail.com',
        rules: tournament.rules || '',
        competitionsCount: formattedCompetitions.length
      },
      competitions: formattedCompetitions,
      count: formattedCompetitions.length
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
      competitionToken, tournamentToken, competitionId, tournamentId, tournamentName,
      collegeName, collegeAddress, district, state,
      collegePhone, collegeEmail, registrationType, sportName, gender,
      teamName, coachName, coachPhone, managerName, managerPhone,
      playerName, playerRegisterNumber, playerRollNumber, department, year,
      participantEmail, participantPhone, supportingDocument, players
    } = body || {};

    const finalRollNumber = (playerRegisterNumber || playerRollNumber || (players && players[0] && players[0].registerNumber) || '').trim().toUpperCase();

    if (!competitionToken && !competitionId) return res.status(400).json({ success: false, message: 'Competition token or ID is required.' });
    if (!collegeName || !collegeName.trim()) return res.status(400).json({ success: false, message: 'College name is required.' });
    if (!collegeAddress || !collegeAddress.trim()) return res.status(400).json({ success: false, message: 'College address is required.' });
    if (!district || !district.trim()) return res.status(400).json({ success: false, message: 'District is required.' });
    if (!state || !state.trim()) return res.status(400).json({ success: false, message: 'State is required.' });
    if (!participantEmail || !participantEmail.includes('@')) return res.status(400).json({ success: false, message: 'Valid contact email is required.' });
    if (!participantPhone || !participantPhone.trim()) return res.status(400).json({ success: false, message: 'Valid contact phone is required.' });

    const supabase = getSupabase();

    // 1. Fetch competition from database
    const compTarget = competitionId || competitionToken;
    let comp = null;
    try {
      const { data: dComp } = await supabase
        .from('competitions')
        .select('*')
        .or(`id.eq.${compTarget},registration_token.eq.${compTarget}`)
        .maybeSingle();
      if (dComp) comp = dComp;
    } catch (e) {}

    if (!comp) {
      return res.status(404).json({ success: false, message: 'Selected competition not found.' });
    }

    // 2. Validate competition-to-tournament relationship
    const targetTour = tournamentId || tournamentToken;
    if (targetTour) {
      const cleanTour = targetTour.trim();
      const lowerTour = cleanTour.toLowerCase();
      const tourPrefixed = lowerTour.startsWith('tour_') ? lowerTour : `tour_${lowerTour.replace(/[^a-z0-9]/g, '_')}`;

      try {
        const { data: tFound } = await supabase
          .from('tournaments')
          .select('*')
          .or(`id.eq.${cleanTour},id.eq.${tourPrefixed},registration_token.eq.${cleanTour},registration_token.eq.${lowerTour}`)
          .maybeSingle();

        if (tFound) {
          const belongs = (comp.tournament_id && comp.tournament_id.toLowerCase() === tFound.id.toLowerCase()) ||
                          (comp.tournament_name && comp.tournament_name.toLowerCase().trim() === (tFound.tournament_name || tFound.name || '').toLowerCase().trim());
          if (!belongs) {
            return res.status(400).json({
              success: false,
              message: 'Validation failed: The selected competition does not belong to the tournament identified by this registration link.'
            });
          }
        }
      } catch (tErr) {}
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

// ── Handler: Receipt Details & Official Printable/Downloadable PDF Receipt ──
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
    let comp = null;
    let tournament = null;

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

        // Fetch parent competition details
        if (reg.competition_id) {
          const { data: cData } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', reg.competition_id)
            .maybeSingle();
          if (cData) comp = cData;
        }

        // Fetch parent tournament details
        const tId = reg.tournament_id || (comp && comp.tournament_id);
        if (tId) {
          const { data: tData } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tId)
            .maybeSingle();
          if (tData) tournament = tData;
        }
      }
    } catch(e) {}

    if (!reg) return res.status(404).json({ success: false, message: 'Registration record not found.' });

    // If explicit JSON requested
    if (req.query.format === 'json') {
      return res.status(200).json({ success: true, registration: reg, players, competition: comp, tournament });
    }

    // Default: Render Official Printable/Downloadable Receipt HTML with Auto-Print
    const html = generateOfficialReceiptHtml(reg, players, comp, tournament);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Receipt fetch error: ' + err.message });
  }
}

function generateOfficialReceiptHtml(reg, players = [], comp = null, tournament = null) {
  const regId = reg.registration_id || reg.id || 'GASC-IC-2026';
  const tName = (tournament && tournament.name) || (comp && (comp.tournamentName || comp.tournament_name)) || 'GASC Inter-College Championship 2026';
  const cName = (comp && comp.name) || reg.sport_name || 'Inter-College Competition';
  const sport = reg.sport_name || (comp && comp.sportName) || 'Sports';
  const isTeam = (reg.registration_type || 'INDIVIDUAL').toUpperCase() === 'TEAM';
  const pName = isTeam ? (reg.team_name || 'College Squad') : (reg.player_name || reg.contact_person || 'Athlete');
  const regNo = reg.player_register_number || '-';
  const dept = reg.department || '-';
  const year = reg.year || '-';
  const college = reg.college_name || 'External College';
  const address = [reg.college_address, reg.district, reg.state].filter(Boolean).join(', ') || '-';
  const email = reg.participant_email || '-';
  const phone = reg.participant_phone || '-';
  const venue = (tournament && tournament.venue) || (comp && comp.venue) || 'GASC Idappadi Sports Ground';
  const status = (reg.status || 'PENDING').toUpperCase();
  const isApproved = status === 'APPROVED';
  const statusBadge = isApproved ? 'APPROVED' : (status === 'REJECTED' ? 'REJECTED' : 'PENDING APPROVAL');
  const statusColor = isApproved ? '#15803d' : (status === 'REJECTED' ? '#b91c1c' : '#b45309');
  const statusBg = isApproved ? '#dcfce7' : (status === 'REJECTED' ? '#fee2e2' : '#fef3c7');
  const statusBorder = isApproved ? '#86efac' : (status === 'REJECTED' ? '#fca5a5' : '#fcd34d');

  const dateFormatted = reg.created_at ? new Date(reg.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('en-IN');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(regId)}`;

  let playersRows = '';
  if (isTeam && players && players.length > 0) {
    playersRows = players.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 10px; font-weight: bold; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">${p.player_name || p.name || '-'}</td>
        <td style="padding: 6px 10px; font-family: monospace; color: #334155;">${p.player_register_number || p.register_number || '-'}</td>
        <td style="padding: 6px 10px; color: #475569;">${p.department || '-'}</td>
        <td style="padding: 6px 10px; text-align: center;"><span style="display:inline-block; font-size:10px; padding:2px 8px; border-radius:12px; background:${(p.role || '').toLowerCase().includes('sub') ? '#f1f5f9' : '#e0f2fe'}; color:${(p.role || '').toLowerCase().includes('sub') ? '#64748b' : '#0369a1'}; font-weight:700;">${p.role || 'Player'}</span></td>
      </tr>
    `).join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GASC_Receipt_${regId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .toolbar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 9999px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }
    .btn-secondary:hover { background: #475569; }
    .receipt-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 32px 36px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      border: 1px solid #cbd5e1;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .header-table td { vertical-align: middle; }
    .logo-img {
      width: 82px;
      height: 82px;
      object-fit: contain;
    }
    .qr-img {
      width: 95px;
      height: 95px;
      border: 1px solid #cbd5e1;
      padding: 4px;
      border-radius: 8px;
      background: #fff;
    }
    .title-area {
      text-align: center;
      padding: 0 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #1e40af;
      background: #eff6ff;
      padding: 6px 12px;
      border-left: 4px solid #2563eb;
      margin: 16px 0 10px 0;
      border-radius: 0 4px 4px 0;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 12.5px;
    }
    .info-grid td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
    }
    .info-grid td.label {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
      width: 22%;
    }
    .info-grid td.value {
      color: #0f172a;
      font-weight: 600;
    }
    .rules-list {
      margin: 6px 0 0 0;
      padding-left: 18px;
      font-size: 11.5px;
      color: #475569;
      line-height: 1.5;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 36px;
      text-align: center;
      font-size: 11.5px;
    }
    .sign-table td {
      vertical-align: bottom;
      padding: 0 10px;
      width: 33.33%;
    }
    .sign-line {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      font-weight: 700;
      color: #0f172a;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .receipt-container {
        border-radius: 0 !important;
        box-shadow: none !important;
        border: 1.5px solid #000000 !important;
        padding: 24px 28px !important;
        max-width: 100% !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Print Toolbar -->
  <div class="toolbar no-print">
    <div style="color: #94a3b8; font-size: 13px; font-weight: 600;">
      Official Entry Slip &bull; <span style="font-family: monospace; color: #38bdf8;">${regId}</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <a href="javascript:window.history.back()" class="btn btn-secondary">
        &larr; Back
      </a>
      <button onclick="window.print()" class="btn btn-primary">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>
        Download / Save as PDF
      </button>
    </div>
  </div>

  <div class="receipt-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 85px;">
          <img src="/images/college-logo.png" alt="GASC Emblem" class="logo-img" onerror="this.onerror=null;this.src='https://gasc-student-portal.vercel.app/images/college-logo.png'">
        </td>
        <td class="title-area">
          <div style="font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 1px; text-transform: uppercase;">Government of Tamil Nadu</div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 2px 0; text-transform: uppercase; letter-spacing: 0.3px;">Government Arts and Science College, Idappadi</div>
          <div style="font-size: 11px; color: #64748b;">(Affiliated to Periyar University, Salem | NAAC Accredited | Idappadi - 637 101, Salem Dt.)</div>
          <div style="font-size: 13px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Department of Physical Education &amp; Sports</div>
          <div style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.5px;">
            INTER-COLLEGE TOURNAMENT PARTICIPATION ENTRY RECEIPT
          </div>
        </td>
        <td style="width: 105px; text-align: center;">
          <img src="${qrUrl}" alt="QR" class="qr-img">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-top: 2px;">SCAN TO VERIFY</div>
        </td>
      </tr>
    </table>

    <!-- Reg ID & Status Strip -->
    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin-bottom: 12px;">
      <div>
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Registration ID:</span>
        <span style="font-family: monospace; font-size: 16px; font-weight: 900; color: #1d4ed8; margin-left: 6px;">${regId}</span>
      </div>
      <div>
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-right: 6px;">Status:</span>
        <span style="display: inline-block; padding: 3px 10px; border-radius: 14px; font-size: 11px; font-weight: 800; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder};">
          ${statusBadge}
        </span>
      </div>
      <div style="font-size: 11px; color: #64748b; font-weight: 600;">
        Date: <strong style="color: #0f172a;">${dateFormatted}</strong>
      </div>
    </div>

    <!-- Tournament & Event Info -->
    <div class="section-title">1. Tournament &amp; Competition Details</div>
    <table class="info-grid">
      <tr>
        <td class="label">Tournament</td>
        <td class="value" style="color: #1e40af; font-size: 14px;">${tName}</td>
        <td class="label">Event / Sport</td>
        <td class="value" style="color: #0f172a;">${cName} (${sport})</td>
      </tr>
      <tr>
        <td class="label">Event Mode</td>
        <td class="value">${isTeam ? 'Team (Squad Roster)' : 'Individual (Single Athlete)'}</td>
        <td class="label">Category / Gender</td>
        <td class="value">${reg.gender || 'Boys / Men'}</td>
      </tr>
      <tr>
        <td class="label">Venue</td>
        <td class="value" colspan="3">${venue}</td>
      </tr>
    </table>

    <!-- Institution & Participant Info -->
    <div class="section-title">2. Institution &amp; Participant Details</div>
    <table class="info-grid">
      <tr>
        <td class="label">College / Institute</td>
        <td class="value" colspan="3" style="font-size: 13.5px; font-weight: 800;">${college}</td>
      </tr>
      <tr>
        <td class="label">College Address</td>
        <td class="value" colspan="3">${address}</td>
      </tr>
      <tr>
        <td class="label">${isTeam ? 'Team / Squad Name' : 'Athlete Name'}</td>
        <td class="value" style="font-size: 13px; color: #1d4ed8;">${pName}</td>
        <td class="label">Register Number</td>
        <td class="value" style="font-family: monospace;">${regNo}</td>
      </tr>
      <tr>
        <td class="label">Department &amp; Year</td>
        <td class="value">${dept} &bull; ${year}</td>
        <td class="label">Mobile Number</td>
        <td class="value">${phone}</td>
      </tr>
      <tr>
        <td class="label">Official Email</td>
        <td class="value" colspan="3">${email}</td>
      </tr>
    </table>

    ${isTeam && playersRows ? `
      <!-- Squad Table -->
      <div class="section-title">3. Registered Team Squad Members (${players.length} Players)</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 6px 10px; width: 35px; border-bottom: 1px solid #cbd5e1;">#</th>
            <th style="padding: 6px 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Player Name</th>
            <th style="padding: 6px 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Register No</th>
            <th style="padding: 6px 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">Department</th>
            <th style="padding: 6px 10px; text-align: center; border-bottom: 1px solid #cbd5e1;">Squad Role</th>
          </tr>
        </thead>
        <tbody>
          ${playersRows}
        </tbody>
      </table>
    ` : ''}

    <!-- Rules & Instructions -->
    <div class="section-title">${isTeam && playersRows ? '4' : '3'}. Mandatory Competition Instructions</div>
    <ul class="rules-list">
      <li>All participants must produce their <strong>Original College Identity Card</strong> and this printed entry slip at the registration desk.</li>
      <li>Teams / Athletes must report to the Physical Director at the venue <strong>minimum 45 minutes before</strong> the scheduled fixture.</li>
      <li>Proper sports attire, standardized jersey, and protective gear as per federation rules are mandatory.</li>
      <li>Decisions of the Referees and the GASC Idappadi Sports Organizing Committee shall be final and binding.</li>
    </ul>

    <!-- Signatures -->
    <table class="sign-table">
      <tr>
        <td>
          <div style="height: 40px;"></div>
          <div class="sign-line">Candidate / Captain Signature</div>
        </td>
        <td>
          <div style="height: 40px;"></div>
          <div class="sign-line">
            Dr. R. ANITHA<br>
            <span style="font-size: 10px; color: #64748b; font-weight: normal;">Director of Physical Education</span>
          </div>
        </td>
        <td>
          <div style="height: 40px;"></div>
          <div class="sign-line">
            PRINCIPAL<br>
            <span style="font-size: 10px; color: #64748b; font-weight: normal;">Government Arts &amp; Science College</span>
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
      This is a system-generated computer slip issued by GASC Idappadi Sports Portal (v1.3) &bull; Ref: ${regId} &bull; Generated on ${dateFormatted}
    </div>
  </div>

  <script>
    // Automatically trigger Print / Save as PDF prompt on mobile or desktop
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
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

  if (req.method === 'DELETE') {
    try {
      const supabase = getSupabase();
      const url = req.url || '';
      const cleanPath = url.split('?')[0];
      const parts = cleanPath.split('/').filter(Boolean);
      let targetId = req.query?.id;
      if (!targetId && parts.length > 0 && parts[parts.length - 1] !== 'competitions') {
        targetId = parts[parts.length - 1];
      }
      const tournamentName = req.query?.name || (req.body && (req.body.tournamentName || req.body.name));

      if (targetId && targetId !== 'tournament') {
        try {
          await supabase.from('external_registrations').delete().eq('competition_id', targetId);
        } catch (e) {}
        try {
          await supabase.from('competition_registrations').delete().eq('competition_id', targetId);
        } catch (e) {}
        const { error } = await supabase.from('competitions').delete().eq('id', targetId);
        if (error) throw error;
        return res.json({ success: true, message: 'Competition deleted successfully.', deletedId: targetId });
      }

      if (tournamentName) {
        await supabase.from('competitions').delete().ilike('tournament_name', tournamentName);
        await supabase.from('tournaments').delete().ilike('name', tournamentName);
        return res.json({ success: true, message: `Tournament "${tournamentName}" deleted successfully.` });
      }

      return res.status(400).json({ success: false, message: 'Competition ID or Tournament name required for deletion.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ── Main Dispatcher ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
