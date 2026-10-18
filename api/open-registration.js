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

  try {
    const supabase = getSupabase();

    // 1. Fetch exactly ONE tournament using the validated QR token from actual Supabase DB
    const { data: tList, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .or(`registration_token.eq.${cleanToken},id.eq.${cleanToken}`)
      .limit(5);

    if (tErr) {
      console.error('Supabase tournament query error:', tErr);
    }

    let tournament = (Array.isArray(tList) && tList.length > 0) ? tList[0] : null;

    if (!tournament && Array.isArray(tList)) {
      tournament = tList.find(t =>
        (t.registration_token && t.registration_token.toLowerCase() === lowerToken) ||
        (t.id && t.id.toLowerCase() === lowerToken)
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
    // Support: tournament.id, tournament.id without 'tour_', or tournament_name (case-insensitive)
    const tSlug = String(tournament.id || '').replace(/^tour_/, '');
    const { data: cData } = await supabase
      .from('competitions')
      .select('*')
      .or(`tournament_id.eq.${tournament.id},tournament_id.eq.${tSlug},tournament_id.eq.tour_${tSlug}`)
      .order('date', { ascending: true });

    let childComps = Array.isArray(cData) ? cData : [];

    // Fallback: If competitions were created with tournament_name
    if (childComps.length === 0 && (tournament.tournament_name || tournament.name)) {
      const tName = String(tournament.tournament_name || tournament.name).trim();
      const { data: legacyData } = await supabase
        .from('competitions')
        .select('*')
        .ilike('tournament_name', tName)
        .order('date', { ascending: true });
      if (Array.isArray(legacyData) && legacyData.length > 0) {
        childComps = legacyData;
      }
    }

    // Fallback 2: If competition name includes tournament name
    if (childComps.length === 0 && (tournament.tournament_name || tournament.name)) {
      const tName = String(tournament.tournament_name || tournament.name).trim();
      const { data: nameMatchData } = await supabase
        .from('competitions')
        .select('*')
        .ilike('name', `%${tName}%`)
        .order('date', { ascending: true });
      if (Array.isArray(nameMatchData) && nameMatchData.length > 0) {
        childComps = nameMatchData;
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
      const rawCat = c.category || c.gender || 'Mixed';
      let cat = 'Mixed';
      if (/^men$|^boys?$/i.test(rawCat)) cat = 'Men';
      else if (/^women$|^girls?$/i.test(rawCat)) cat = 'Women';
      else cat = 'Mixed';

      return {
        id: c.id,
        name: c.name,
        tournamentName: tournament.name || tournament.tournament_name,
        tournamentId: tournament.id,
        sportName: sportName,
        eventName: c.event_name || c.eventName || c.name,
        category: cat,
        gender: cat,
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
        entryFee: c.other_college_fee !== undefined ? Number(c.other_college_fee) : (c.entry_fee !== undefined ? Number(c.entry_fee) : (c.entryFee !== undefined ? Number(c.entryFee) : (tournament.other_college_fee !== undefined ? Number(tournament.other_college_fee) : (tournament.entry_fee !== undefined ? Number(tournament.entry_fee) : undefined)))),
        hasPayment: c.other_college_fee_enabled !== undefined ? Boolean(c.other_college_fee_enabled) : (c.has_payment !== undefined ? Boolean(c.has_payment) : (tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : (tournament.has_payment !== undefined ? Boolean(tournament.has_payment) : undefined))),
        isPaid: c.other_college_fee_enabled !== undefined ? Boolean(c.other_college_fee_enabled) : (c.is_paid !== undefined ? Boolean(c.is_paid) : (tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : (tournament.is_paid !== undefined ? Boolean(tournament.is_paid) : undefined))),
        ourCollegeFeeEnabled: c.our_college_fee_enabled !== undefined ? Boolean(c.our_college_fee_enabled) : (tournament.our_college_fee_enabled !== undefined ? Boolean(tournament.our_college_fee_enabled) : false),
        ourCollegeFee: c.our_college_fee !== undefined ? Number(c.our_college_fee) : (tournament.our_college_fee !== undefined ? Number(tournament.our_college_fee) : 0),
        otherCollegeFeeEnabled: c.other_college_fee_enabled !== undefined ? Boolean(c.other_college_fee_enabled) : (tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : Boolean(c.entry_fee > 0 || c.has_payment)),
        otherCollegeFee: c.other_college_fee !== undefined ? Number(c.other_college_fee) : (tournament.other_college_fee !== undefined ? Number(tournament.other_college_fee) : Number(c.entry_fee || 0)),
        upiId: c.upi_id || tournament.upi_id || '',
        gpayNumber: c.gpay_number || tournament.gpay_number || '',
        receiverName: c.receiver_name || tournament.receiver_name || '',
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
        entryFee: tournament.other_college_fee !== undefined ? Number(tournament.other_college_fee) : (tournament.entry_fee !== undefined ? Number(tournament.entry_fee) : undefined),
        hasPayment: tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : (tournament.has_payment !== undefined ? Boolean(tournament.has_payment) : undefined),
        isPaid: tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : (tournament.is_paid !== undefined ? Boolean(tournament.is_paid) : undefined),
        ourCollegeFeeEnabled: tournament.our_college_fee_enabled !== undefined ? Boolean(tournament.our_college_fee_enabled) : false,
        ourCollegeFee: Number(tournament.our_college_fee || 0),
        otherCollegeFeeEnabled: tournament.other_college_fee_enabled !== undefined ? Boolean(tournament.other_college_fee_enabled) : Boolean(tournament.has_payment || (tournament.entry_fee > 0)),
        otherCollegeFee: Number(tournament.other_college_fee || tournament.entry_fee || 0),
        upiId: tournament.upi_id || '',
        gpayNumber: tournament.gpay_number || '',
        receiverName: tournament.receiver_name || '',
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

      let tFound = null;
      try {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .or(`id.eq.${cleanTour},id.eq.${tourPrefixed},registration_token.eq.${cleanTour},registration_token.eq.${lowerTour}`)
          .maybeSingle();
        if (data) tFound = data;
      } catch (tErr) {}

      if (!tFound) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed: The tournament specified in this registration link does not exist.'
        });
      }

      if (tFound.external_registration_enabled === false || (tFound.status && tFound.status.toLowerCase().includes('disabled'))) {
        return res.status(403).json({
          success: false,
          message: 'Public registration for this tournament has been disabled by the administrator.'
        });
      }

      const belongs = (comp.tournament_id && comp.tournament_id.toLowerCase() === tFound.id.toLowerCase()) ||
                      (comp.tournament_name && comp.tournament_name.toLowerCase().trim() === (tFound.tournament_name || tFound.name || '').toLowerCase().trim());
      if (!belongs) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed: The selected competition does not belong to the tournament identified by this registration link.'
        });
      }
    }

    // 3. Backend deadline & competition status validation
    const now = new Date();
    
    // Check registration start condition (Auto Open validation)
    const regStart = comp.registration_start || comp.registrationStart;
    if (regStart) {
      const sDate = new Date(regStart);
      if (!isNaN(sDate.getTime()) && now < sDate) {
        return res.status(400).json({
          success: false,
          message: `Online registration for this competition has not opened yet. It will automatically open on ${sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
        });
      }
    }

    const deadline = comp.registration_end || comp.registration_deadline;
    if (deadline) {
      let dDate = new Date(deadline);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(deadline).trim())) {
        dDate = new Date(`${String(deadline).trim()}T23:59:59.999Z`);
      }
      if (!isNaN(dDate.getTime()) && now > dDate) {
        return res.status(400).json({ success: false, message: `Registration for this competition closed on ${dDate.toLocaleDateString('en-IN')}.` });
      }
    }
    const cStat = (comp.status || '').toLowerCase();
    if (cStat === 'closed' || cStat === 'registration closed' || cStat === 'completed' || cStat === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Registration for this competition is closed.' });
    }

    // 4. Verify Category from actual database record - NEVER trust browser value blindly
    const dbCat = comp.category || comp.gender || 'Mixed';
    let verifiedCategory = 'Mixed';
    if (/^men$|^boys?$/i.test(dbCat)) verifiedCategory = 'Men';
    else if (/^women$|^girls?$/i.test(dbCat)) verifiedCategory = 'Women';
    else verifiedCategory = 'Mixed';

    const mode = (registrationType || (comp.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
    const cleanCollege = collegeName.trim();
    const cleanEmail = participantEmail.toLowerCase().trim();

    // Verify participant/team gender compatibility with competition category
    if (mode === 'INDIVIDUAL') {
      const pGender = (body.individualGender || gender || '').toLowerCase();
      const isMale = pGender === 'male' || pGender === 'boy' || pGender === 'boys' || pGender === 'men';
      const isFemale = pGender === 'female' || pGender === 'girl' || pGender === 'girls' || pGender === 'women';
      if (verifiedCategory === 'Men' && isFemale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Female athletes cannot register for Men\'s category competitions.' });
      }
      if (verifiedCategory === 'Women' && isMale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Male athletes cannot register for Women\'s category competitions.' });
      }
    } else if (mode === 'TEAM') {
      const tGender = (body.teamGender || gender || '').toLowerCase();
      const isMale = tGender === 'male' || tGender === 'boy' || tGender === 'boys' || tGender === 'men';
      const isFemale = tGender === 'female' || tGender === 'girl' || tGender === 'girls' || tGender === 'women';
      if (verifiedCategory === 'Men' && isFemale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Female squads cannot register for Men\'s category competitions.' });
      }
      if (verifiedCategory === 'Women' && isMale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Male squads cannot register for Women\'s category competitions.' });
      }
    }

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
      gender: verifiedCategory,
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

    // ── Payment Validation & Assignment ──
    const reqFee = Number(body.feeAmount || comp.entry_fee || comp.entryFee || 0);
    const submittedUtr = (body.transactionRef || body.utrNumber || '').trim().toUpperCase();
    const submittedScreenshot = body.paymentScreenshot || null;
    const submittedConfigVersion = Number(body.paymentConfigVersion || 1);
    const submittedMethod = body.paymentMethod || (reqFee > 0 ? 'MANUAL_UPI' : 'FREE');

    if (reqFee > 0) {
      if (!submittedUtr) {
        return res.status(400).json({
          success: false,
          message: `Registration fee of ₹${reqFee} is required. Please transfer the amount via GPay / UPI and enter the 12-digit UTR reference number.`
        });
      }

      if (submittedUtr.length < 6 || submittedUtr.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UPI Transaction Reference Number (UTR). Please enter a valid reference from your UPI app.'
        });
      }

      // Check duplicate transaction_ref in Supabase
      try {
        const { data: dupSupa } = await supabase
          .from('external_registrations')
          .select('id, registration_id')
          .eq('transaction_ref', submittedUtr)
          .limit(1);
        if (dupSupa && dupSupa.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_TRANSACTION_REF',
            message: `This UPI Transaction Reference Number (${submittedUtr}) has already been submitted for another registration. Duplicate transaction references are strictly rejected.`
          });
        }
      } catch (e) {}
    }

    const initialPaymentStatus = reqFee > 0 ? 'PENDING_VERIFICATION' : 'FREE';
    const remarksPayload = {
      fee_amount: reqFee,
      payment_method: submittedMethod,
      payment_status: initialPaymentStatus,
      transaction_ref: submittedUtr || null,
      payment_screenshot: submittedScreenshot,
      payment_config_version: submittedConfigVersion,
      payment_verified_by: null,
      payment_verified_at: null,
      payment_remarks: null,
      players: Array.isArray(players) ? players : []
    };

    regPayload.fee_amount = reqFee;
    regPayload.payment_method = submittedMethod;
    regPayload.payment_status = initialPaymentStatus;
    regPayload.transaction_ref = submittedUtr || null;
    regPayload.payment_screenshot = submittedScreenshot;
    regPayload.payment_config_version = submittedConfigVersion;
    regPayload.remarks = JSON.stringify(remarksPayload);

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
        remarks: JSON.stringify(remarksPayload),
        status: 'Pending',
        registration_date: new Date().toISOString()
      };
      await supabase.from('competition_registrations').insert(compReg);
    } catch (e) {}

    try {
      await supabase.from('external_registrations').insert(regPayload);
    } catch (e) {
      // Fallback: try inserting without extended payment columns if table not yet migrated
      try {
        const fallbackPayload = { ...regPayload };
        delete fallbackPayload.fee_amount;
        delete fallbackPayload.payment_method;
        delete fallbackPayload.payment_status;
        delete fallbackPayload.transaction_ref;
        delete fallbackPayload.payment_screenshot;
        delete fallbackPayload.payment_config_version;
        await supabase.from('external_registrations').insert(fallbackPayload);
      } catch (fErr) {}
    }

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
          <img src="/images/college-logo.png" alt="GASC Emblem" class="logo-img" onerror="this.onerror=null;this.src='https://gasc-idappadi-sports.vercel.app/images/college-logo.png'">
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

  let baseUrl = req.query.baseUrl || 'https://gasc-idappadi-sports.vercel.app';
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
          external_registration_enabled: true,
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
        external_registration_enabled: true,
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

// ── CM Trophy Announcements Handler ──
async function handleCmTrophy(req, res) {
  const supabase = getSupabase();
  const OFFICIAL_CM_TROPHY_URL = 'https://tncmtrophy.sdat.in/';

  if (req.method === 'GET') {
    try {
      let { data: annRaw, error } = await supabase
        .from('cm_trophy_announcements')
        .select('*')
        .eq('status', 'Published')
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false });

      if (error || !annRaw || annRaw.length === 0) {
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('category', 'cm_trophy')
          .order('created_at', { ascending: false })
          .limit(20);

        if (notifs && notifs.length > 0) {
          annRaw = notifs.map(n => {
            let parsed = {};
            try { parsed = JSON.parse(n.message); } catch (e) { parsed = { instructions: n.message }; }
            return {
              id: parsed.announcementId || n.id,
              title: parsed.title || n.title,
              instructions: parsed.instructions || n.message,
              official_link: parsed.officialLink || OFFICIAL_CM_TROPHY_URL,
              registration_start_date: parsed.registrationStartDate || null,
              registration_end_date: parsed.registrationEndDate || null,
              category: 'Official Announcement',
              is_important: parsed.isImportant !== undefined ? parsed.isImportant : (n.priority === 'High'),
              status: 'Published',
              published_at: parsed.publishedAt || n.created_at,
              created_by: n.sender || 'Sports Department',
              created_at: n.created_at
            };
          });
        }
      }

      const list = (annRaw || []).map(a => ({
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        officialLink: a.official_link || a.officialLink || OFFICIAL_CM_TROPHY_URL,
        registrationStartDate: a.registration_start_date || a.registrationStartDate || null,
        registrationEndDate: a.registration_end_date || a.registrationEndDate || null,
        category: a.category || 'General',
        isImportant: a.is_important !== undefined ? a.is_important : Boolean(a.isImportant),
        status: a.status || 'Published',
        publishedAt: a.published_at || a.publishedAt || a.created_at,
        createdBy: a.created_by || a.createdBy || 'Dr. R. ANITHA (Physical Director)',
        createdAt: a.created_at
      }));

      return res.json({
        success: true,
        officialPortalUrl: OFFICIAL_CM_TROPHY_URL,
        count: list.length,
        announcements: list
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, instructions, officialLink, registrationStartDate, registrationEndDate, isImportant, status = 'Published' } = req.body || {};
      if (!title || !instructions) {
        return res.status(400).json({ success: false, message: 'Title and instructions required.' });
      }

      const docId = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newAnn = {
        id: docId,
        title: title.trim(),
        instructions: instructions.trim(),
        official_link: (officialLink && officialLink.trim()) || OFFICIAL_CM_TROPHY_URL,
        registration_start_date: registrationStartDate || null,
        registration_end_date: registrationEndDate || null,
        category: 'Official Announcement',
        is_important: Boolean(isImportant),
        status,
        published_at: new Date().toISOString(),
        created_by: 'Dr. R. ANITHA (Physical Director)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase.from('cm_trophy_announcements').insert(newAnn);

      const notifPayload = {
        announcementId: docId,
        title: newAnn.title,
        shortMessage: newAnn.instructions.slice(0, 160) + '...',
        instructions: newAnn.instructions,
        officialLink: newAnn.official_link,
        registrationStartDate: newAnn.registration_start_date,
        registrationEndDate: newAnn.registration_end_date,
        isImportant: newAnn.is_important,
        publishedAt: newAnn.published_at
      };

      await supabase.from('notifications').insert({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: `🏆 CM Trophy Announcement: ${newAnn.title}`,
        message: JSON.stringify(notifPayload),
        category: 'cm_trophy',
        type: 'cm_trophy_announcement',
        target_type: 'All Students',
        target_audience: 'all',
        priority: newAnn.is_important ? 'High' : 'Normal',
        sender: 'Dr. R. ANITHA (Physical Director)',
        created_at: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'CM Trophy announcement published and broadcasted to students successfully!',
        announcement: newAnn
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

// ── Payment Handlers for Serverless ──
async function fetchServerlessPaymentConfig() {
  const supabase = getSupabase();
  let config = null;

  try {
    const { data } = await supabase.from('payment_settings').select('*').eq('id', 'default').maybeSingle();
    if (data) config = data;
  } catch (e) {}

  if (!config) {
    try {
      const { data } = await supabase.from('admin_settings').select('*').eq('id', 'payment_config').maybeSingle();
      if (data && data.value) {
        config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      }
    } catch (e) {}
  }

  if (!config) {
    config = {
      id: 'default',
      receiver_name: 'Dr. R. ANITHA (Physical Director) / GASC Sports Account',
      gpay_number: '9443218765',
      upi_id: 'sportsgasc@sbi',
      qr_code_url: '',
      payment_mode: 'MANUAL_UPI',
      is_active: true,
      payment_instructions: '1. Open Google Pay, PhonePe, Paytm, or any UPI app.\n2. Scan the QR code or enter the UPI ID / GPay number.\n3. Complete the payment and note down the 12-digit UPI / UTR Transaction Reference Number.\n4. Enter the UTR number in the registration form and submit.',
      team_fee: 500,
      individual_fee: 100,
      valid_from: null,
      valid_until: null,
      config_version: 1,
      updated_by: 'Super Admin',
      updated_at: new Date().toISOString()
    };
  }

  return config;
}

async function handlePaymentSettings(req, res) {
  try {
    const config = await fetchServerlessPaymentConfig();

    let isValidWindow = true;
    const now = new Date();
    if (config.valid_from) {
      const fromDate = new Date(config.valid_from);
      if (!isNaN(fromDate.getTime()) && now < fromDate) isValidWindow = false;
    }
    if (config.valid_until) {
      const untilDate = new Date(config.valid_until);
      if (!isNaN(untilDate.getTime()) && now > untilDate) isValidWindow = false;
    }

    const isEnabled = Boolean(config.is_active) && isValidWindow;

    let qrUrl = config.qr_code_url || '';
    if (!qrUrl && config.upi_id) {
      try {
        const upiUri = `upi://pay?pa=${encodeURIComponent(config.upi_id)}&pn=${encodeURIComponent(config.receiver_name || 'GASC Sports')}&cu=INR`;
        qrUrl = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
      } catch (qrErr) {}
    }

    return res.status(200).json({
      success: true,
      settings: {
        receiverName: config.receiver_name || 'Physical Director, GASC',
        gpayNumber: config.gpay_number || '',
        upiId: config.upi_id || '',
        qrCodeUrl: qrUrl,
        instructions: config.payment_instructions || 'Scan QR or pay to GPay / UPI ID. Submit 12-digit UTR number.',
        paymentMode: config.payment_mode || 'MANUAL_UPI',
        isEnabled: isEnabled,
        teamFee: Number(config.team_fee || 500),
        individualFee: Number(config.individual_fee || 100),
        configVersion: Number(config.config_version || 1),
        validFrom: config.valid_from || null,
        validUntil: config.valid_until || null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handleAdminPaymentSettings(req, res) {
  const supabase = getSupabase();
  if (req.method === 'GET') {
    try {
      const config = await fetchServerlessPaymentConfig();
      let history = [];
      try {
        const { data } = await supabase.from('payment_settings_history').select('*').order('created_at', { ascending: false }).limit(20);
        if (data) history = data;
      } catch (e) {}

      if (history.length === 0) {
        try {
          const { data } = await supabase.from('admin_settings').select('*').eq('id', 'payment_history').maybeSingle();
          if (data && data.value) {
            history = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          }
        } catch (e) {}
      }

      let qrPreview = config.qr_code_url || '';
      if (!qrPreview && config.upi_id) {
        try {
          const upiUri = `upi://pay?pa=${encodeURIComponent(config.upi_id)}&pn=${encodeURIComponent(config.receiver_name || 'GASC Sports')}&cu=INR`;
          qrPreview = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        config: {
          id: config.id || 'default',
          receiverName: config.receiver_name,
          gpayNumber: config.gpay_number,
          upiId: config.upi_id,
          qrCodeUrl: config.qr_code_url || '',
          qrPreview,
          paymentMode: config.payment_mode || 'MANUAL_UPI',
          isActive: Boolean(config.is_active),
          instructions: config.payment_instructions,
          teamFee: Number(config.team_fee || 500),
          individualFee: Number(config.individual_fee || 100),
          validFrom: config.valid_from,
          validUntil: config.valid_until,
          configVersion: Number(config.config_version || 1),
          updatedBy: config.updated_by || 'Admin',
          updatedAt: config.updated_at
        },
        history
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } else if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = await parseRequestBody(req);
      const { receiverName, gpayNumber, upiId, qrCodeUrl, paymentMode, isActive, instructions, teamFee, individualFee, validFrom, validUntil, updatedBy } = body || {};

      if (!receiverName || !receiverName.trim()) {
        return res.status(400).json({ success: false, message: 'Payment receiver name is required.' });
      }

      const cleanPhone = (gpayNumber || '').replace(/[\s\-\+]/g, '').replace(/^91/, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GPay mobile number. Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
        });
      }

      const cleanUpi = (upiId || '').trim().toLowerCase();
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;
      if (!upiRegex.test(cleanUpi)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UPI ID format. Must follow standard UPI VPA pattern like "username@bank" or "mobile@upi". Do not enter only a phone number.'
        });
      }

      const prevConfig = await fetchServerlessPaymentConfig();
      const newVersion = (Number(prevConfig.config_version) || 1) + 1;
      const adminUser = updatedBy || 'Sports Incharge Admin';
      const nowIso = new Date().toISOString();

      const newRecord = {
        id: 'default',
        receiver_name: receiverName.trim(),
        gpay_number: cleanPhone,
        upi_id: cleanUpi,
        qr_code_url: qrCodeUrl || '',
        payment_mode: paymentMode || 'MANUAL_UPI',
        is_active: isActive !== undefined ? Boolean(isActive) : true,
        payment_instructions: instructions || 'Scan QR or pay via GPay / UPI.',
        team_fee: teamFee !== undefined ? Number(teamFee) : 500,
        individual_fee: individualFee !== undefined ? Number(individualFee) : 100,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        config_version: newVersion,
        updated_by: adminUser,
        updated_at: nowIso
      };

      try {
        await supabase.from('payment_settings').upsert(newRecord, { onConflict: 'id' });
      } catch (e) {}

      try {
        await supabase.from('admin_settings').upsert({
          id: 'payment_config',
          value: newRecord,
          updated_at: nowIso
        }, { onConflict: 'id' });
      } catch (e) {}

      const historyItem = {
        id: `psh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        config_version: newVersion,
        receiver_name: newRecord.receiver_name,
        gpay_number: newRecord.gpay_number,
        upi_id: newRecord.upi_id,
        qr_code_url: newRecord.qr_code_url,
        payment_mode: newRecord.payment_mode,
        is_active: newRecord.is_active,
        team_fee: newRecord.team_fee,
        individual_fee: newRecord.individual_fee,
        updated_by: adminUser,
        change_summary: `Updated payment details to ${newRecord.upi_id} / ${newRecord.gpay_number}`,
        created_at: nowIso
      };

      try { await supabase.from('payment_settings_history').insert(historyItem); } catch (e) {}

      try {
        let existingHistory = [];
        const { data } = await supabase.from('admin_settings').select('*').eq('id', 'payment_history').maybeSingle();
        if (data && data.value) {
          existingHistory = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        }
        existingHistory.unshift(historyItem);
        await supabase.from('admin_settings').upsert({
          id: 'payment_history',
          value: existingHistory.slice(0, 50),
          updated_at: nowIso
        });
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Payment settings successfully updated and published!',
        config: newRecord
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

async function handleVerifyPayment(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const body = await parseRequestBody(req);
    const { registrationId, paymentStatus, remarks, verifiedBy } = body || {};

    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required.' });
    }

    const adminUser = verifiedBy || 'Sports Admin';
    const nowIso = new Date().toISOString();
    const newPaymentStatus = (paymentStatus || 'VERIFIED').toUpperCase();
    const newRegStatus = newPaymentStatus === 'VERIFIED' ? 'APPROVED' : (newPaymentStatus === 'REJECTED' ? 'REJECTED' : 'PENDING');

    const { data: reg } = await supabase
      .from('external_registrations')
      .select('*')
      .or(`id.eq.${registrationId},registration_id.eq.${registrationId}`)
      .maybeSingle();

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    let existingRemarksObj = {};
    if (reg.remarks && typeof reg.remarks === 'string' && reg.remarks.startsWith('{')) {
      try { existingRemarksObj = JSON.parse(reg.remarks); } catch (e) {}
    }

    const updatedRemarksPayload = {
      ...existingRemarksObj,
      payment_status: newPaymentStatus,
      payment_verified_by: adminUser,
      payment_verified_at: nowIso,
      payment_remarks: remarks || existingRemarksObj.payment_remarks || ''
    };

    const updatePayload = {
      status: newRegStatus,
      payment_status: newPaymentStatus,
      payment_verified_by: adminUser,
      payment_verified_at: nowIso,
      payment_remarks: remarks || null,
      remarks: JSON.stringify(updatedRemarksPayload),
      updated_at: nowIso
    };

    try {
      await supabase.from('external_registrations').update(updatePayload).eq('id', reg.id);
    } catch (e) {
      try {
        await supabase.from('external_registrations').update({
          status: newRegStatus,
          remarks: JSON.stringify(updatedRemarksPayload),
          updated_at: nowIso
        }).eq('id', reg.id);
      } catch (err2) {}
    }

    // Email participant
    try {
      const targetEmail = reg.participant_email || reg.college_email;
      if (targetEmail && targetEmail.includes('@')) {
        const isVerified = newPaymentStatus === 'VERIFIED';
        await transporter.sendMail({
          from: `"${COLLEGE_NAME} Sports" <sportsgascidappadi@gmail.com>`,
          to: targetEmail,
          subject: isVerified
            ? `[GASC Sports] Payment Verified & Registration Approved: ${reg.registration_id}`
            : `[GASC Sports] Payment Update: ${reg.registration_id}`,
          text: `Your registration ${reg.registration_id} payment status has been updated to: ${newPaymentStatus}. Remarks: ${remarks || 'None'}`,
          html: `<div style="font-family:sans-serif;padding:20px;"><h3>Payment Status: ${newPaymentStatus}</h3><p>Registration: ${reg.registration_id}</p><p>Verified By: ${adminUser}</p></div>`
        });
      }
    } catch (mailErr) {}

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${newPaymentStatus} successfully.`,
      registrationId: reg.registration_id,
      paymentStatus: newPaymentStatus,
      status: newRegStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Razorpay Payment Gateway Handlers for Serverless ──
function getRazorpayEnv() {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
    isTest: keyId.startsWith('rzp_test_'),
    isLive: keyId.startsWith('rzp_live_')
  };
}

async function handlePaymentGatewayStatus(req, res) {
  const env = getRazorpayEnv();
  return res.status(200).json({
    success: true,
    provider: 'RAZORPAY',
    isConfigured: env.isConfigured,
    mode: env.isLive ? 'LIVE' : (env.isTest ? 'TEST' : 'TEST_SIMULATOR'),
    keyId: env.keyId ? `${env.keyId.substring(0, 8)}••••••••` : 'rzp_test_simulator',
    publicKey: env.keyId || 'rzp_test_simulator',
    isWebhookConfigured: Boolean(env.webhookSecret),
    merchantName: 'Government Arts and Science College, Idappadi',
    settlementNotice: 'Settlement destination is governed exclusively by the bank account KYC-verified in the Razorpay Merchant Dashboard.'
  });
}

async function handlePaymentCreateOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);
    const { competitionId, tournamentId, registrationId, registrationType, studentName, collegeName, email, phone, studentCategory } = body || {};

    if (!competitionId) {
      return res.status(400).json({ success: false, message: 'Competition ID is required to calculate trusted fee.' });
    }

    const supabase = getSupabase();

    // 1. Fetch competition from database to get trusted fee
    let comp = null;
    try {
      const { data } = await supabase.from('competitions').select('*').eq('id', competitionId).maybeSingle();
      if (data) comp = data;
    } catch (e) {}

    // Distinguish between Our College vs Other College Students
    const isOurCollege = (studentCategory === 'OUR_COLLEGE') || 
      Boolean(collegeName && (collegeName.toLowerCase().includes('idappadi') || collegeName.toLowerCase().includes('gasc')));

    let fee = 0;
    const isTeam = (registrationType || (comp && comp.competition_mode) || 'INDIVIDUAL').toUpperCase() === 'TEAM';

    if (isOurCollege) {
      if (comp && comp.our_college_fee_enabled !== undefined) {
        fee = (comp.our_college_fee_enabled === true || comp.our_college_fee_enabled === 'true' || comp.our_college_fee_enabled === 1)
          ? Math.max(0, Number(comp.our_college_fee || 0))
          : 0;
      } else {
        fee = 0; // default free for our college students
      }
    } else {
      if (comp && comp.other_college_fee_enabled !== undefined) {
        fee = (comp.other_college_fee_enabled === true || comp.other_college_fee_enabled === 'true' || comp.other_college_fee_enabled === 1)
          ? Math.max(0, Number(comp.other_college_fee || 0))
          : 0;
      } else if (comp && comp.entry_fee !== undefined && comp.entry_fee !== null && Number(comp.entry_fee) > 0) {
        fee = Number(comp.entry_fee);
      } else {
        const config = await fetchServerlessPaymentConfig();
        fee = isTeam ? Number(config.team_fee || 500) : Number(config.individual_fee || 100);
      }
    }

    if (fee <= 0) {
      return res.status(200).json({
        success: true,
        isFree: true,
        amount: 0,
        amountInRupees: 0,
        currency: 'INR',
        message: 'No registration fee required.'
      });
    }

    const env = getRazorpayEnv();
    const amountInPaise = Math.round(fee * 100);
    let orderId = '';
    let isSandbox = true;

    const isPlaceholder = (k) => !k || k.includes('placeholder') || k.includes('your_') || k.length < 12;

    if (env.keyId && env.keySecret && !isPlaceholder(env.keyId) && !isPlaceholder(env.keySecret)) {
      try {
        // Official Razorpay API Call
        const authHeader = 'Basic ' + Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: (registrationId || `REG_${Date.now()}`).substring(0, 40),
            notes: {
              competitionId: String(competitionId),
              tournamentId: String(tournamentId || ''),
              student: String(studentName || ''),
              college: String(collegeName || '')
            }
          })
        });

        const rzpData = await rzpRes.json().catch(() => ({}));
        if (!rzpRes.ok) {
          throw new Error(rzpData.error?.description || 'Razorpay order creation failed.');
        }
        orderId = rzpData.id;
        isSandbox = env.isTest;
      } catch (apiErr) {
        if (env.isTest) {
          orderId = 'order_sim_' + crypto.randomBytes(8).toString('hex');
          isSandbox = true;
        } else {
          throw apiErr;
        }
      }
    } else {
      // Simulated sandbox order when keys not yet set in environment
      orderId = 'order_sim_' + crypto.randomBytes(8).toString('hex');
      isSandbox = true;
    }

    // Record initial order in payments table
    try {
      await supabase.from('payments').insert({
        id: `pay_rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        order_id: orderId,
        registration_id: registrationId || null,
        tournament_id: tournamentId || null,
        competition_id: competitionId,
        amount: fee,
        currency: 'INR',
        provider: env.isConfigured ? 'RAZORPAY' : 'SIMULATED',
        status: 'CREATED',
        payment_mode: 'RAZORPAY',
        student_name: studentName || null,
        college_name: collegeName || null,
        contact_email: email || null,
        contact_phone: phone || null,
        created_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Could not insert payment record into Supabase:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      orderId,
      amount: amountInPaise,
      amountInRupees: fee,
      currency: 'INR',
      keyId: env.keyId || 'rzp_test_gasc_sports_simulator',
      provider: env.isConfigured ? 'RAZORPAY' : 'SIMULATED',
      isSandbox
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handlePaymentVerifyOnline(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);
    const { orderId, paymentId, signature } = body || {};

    if (!orderId || !paymentId) {
      return res.status(400).json({ success: false, message: 'Order ID and Payment ID are required.' });
    }

    const env = getRazorpayEnv();
    let isSignatureValid = false;

    if (orderId.startsWith('order_sim_')) {
      // Simulated sandbox validation
      isSignatureValid = true;
    } else if (env.keySecret) {
      const expected = crypto.createHmac('sha256', env.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      isSignatureValid = (expected === signature);
    } else {
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Cryptographic payment signature verification failed. Payment cannot be confirmed.'
      });
    }

    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    // 1. If registration payload was provided in checkout, create or update registration
    let regId = body.registrationId;
    if (!regId && (body.collegeName || body.participantEmail)) {
      // Create external registration record
      const regCode = `GASC-EXT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReg = {
        registration_id: regCode,
        tournament_id: body.tournamentId || null,
        tournament_name: body.tournamentName || 'GASC Open Tournament',
        competition_id: body.competitionId,
        sport_name: body.sportName || 'Athletics',
        event_name: body.eventName || '',
        registration_type: body.registrationType || 'INDIVIDUAL',
        college_name: body.collegeName || '',
        college_address: body.collegeAddress || '',
        district: body.district || '',
        state: body.state || 'Tamil Nadu',
        college_phone: body.collegePhone || '',
        college_email: body.collegeEmail || '',
        team_name: body.teamName || null,
        team_gender: body.teamGender || null,
        coach_name: body.coachName || null,
        coach_phone: body.coachPhone || null,
        manager_name: body.managerName || null,
        manager_phone: body.managerPhone || null,
        player_name: body.playerName || null,
        player_register_number: body.playerRollNumber || null,
        department: body.department || null,
        year: body.year || null,
        gender: body.gender || 'Boys',
        participant_email: body.participantEmail,
        participant_phone: body.participantPhone,
        status: 'APPROVED',
        payment_status: 'VERIFIED',
        entry_fee: Number(body.entryFee || 0),
        transaction_id: paymentId,
        payment_verified_at: nowIso,
        payment_verified_by: 'RAZORPAY_AUTO_GATEWAY',
        created_at: nowIso,
        updated_at: nowIso
      };

      try {
        const { data: inserted } = await supabase.from('external_registrations').insert(newReg).select().maybeSingle();
        if (inserted) regId = inserted.registration_id;
      } catch (e) {
        regId = regCode;
      }
    } else if (regId) {
      try {
        await supabase.from('external_registrations').update({
          status: 'APPROVED',
          payment_status: 'VERIFIED',
          transaction_id: paymentId,
          payment_verified_at: nowIso,
          payment_verified_by: 'RAZORPAY_AUTO_GATEWAY',
          updated_at: nowIso
        }).or(`id.eq.${regId},registration_id.eq.${regId}`);
      } catch (e) {}
    }

    // 2. Update payment record in database
    const receiptNo = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await supabase.from('payments').upsert({
        order_id: orderId,
        payment_id: paymentId,
        registration_id: regId || null,
        status: 'SUCCESS',
        receipt_number: receiptNo,
        verified_at: nowIso,
        updated_at: nowIso
      }, { onConflict: 'order_id' });
    } catch (e) {}

    // 3. Dispatch official payment confirmation email
    const studentEmail = body.participantEmail || body.email;
    if (studentEmail && studentEmail.includes('@')) {
      try {
        await transporter.sendMail({
          from: `"${COLLEGE_NAME} - Sports Department" <sportsgascidappadi@gmail.com>`,
          to: studentEmail,
          subject: `Payment Successful & Registration Confirmed: ${regId || paymentId}`,
          html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #10b981;border-radius:14px;background:#ffffff;">
            <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #f1f5f9;">
              <h2 style="color:#0f4c81;margin:0;">${COLLEGE_NAME}</h2>
              <p style="color:#059669;font-weight:bold;margin:4px 0 0;">OFFICIAL PAYMENT RECEIPT & CONFIRMED ENTRY</p>
            </div>
            <div style="padding:16px 0;font-size:14px;color:#334155;line-height:1.6;">
              <p>Dear <strong>${body.studentName || body.playerName || body.teamName || 'Participant'}</strong>,</p>
              <p>Your online payment for <strong>${body.tournamentName || 'Tournament'} - ${body.eventName || 'Competition'}</strong> has been verified and confirmed.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px;font-size:13px;">
                <tr><td style="padding:8px 12px;color:#64748b;">Registration ID:</td><td style="padding:8px 12px;font-weight:bold;color:#0f4c81;">${regId || 'Confirmed'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">Payment ID:</td><td style="padding:8px 12px;font-family:monospace;font-weight:bold;">${paymentId}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">Order ID:</td><td style="padding:8px 12px;font-family:monospace;">${orderId}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">Amount Paid:</td><td style="padding:8px 12px;font-weight:bold;color:#059669;">₹${body.entryFee || body.amountInRupees || ''} INR</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">Payment Status:</td><td style="padding:8px 12px;font-weight:bold;color:#059669;">SUCCESS (Verified)</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">Receipt Number:</td><td style="padding:8px 12px;font-weight:bold;">${receiptNo}</td></tr>
              </table>
              <p style="font-size:12px;color:#64748b;">Please present this digital confirmation or download your participant pass upon reporting to the venue.</p>
            </div>
          </div>`
        });
      } catch (mailErr) {}
    }

    return res.status(200).json({
      success: true,
      verified: true,
      paymentId,
      orderId,
      receiptNumber: receiptNo,
      registrationId: regId,
      status: 'PAID',
      message: 'Payment verified and entry confirmed successfully!'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handlePaymentWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const rawBody = await new Promise((resolve) => {
      if (typeof req.body === 'string') return resolve(req.body);
      if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
    });

    const env = getRazorpayEnv();
    const signature = req.headers['x-razorpay-signature'];

    if (env.webhookSecret && signature) {
      const expected = crypto.createHmac('sha256', env.webhookSecret).update(rawBody).digest('hex');
      if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
      }
    }

    let payload = {};
    try { payload = JSON.parse(rawBody); } catch (e) { payload = req.body || {}; }

    const event = payload.event;
    const eventId = payload.event_id || (payload.payload?.payment?.entity?.id ? `${event}_${payload.payload.payment.entity.id}` : `evt_${Date.now()}`);
    const supabase = getSupabase();

    // Idempotency check
    try {
      const { data: existing } = await supabase.from('payment_webhook_events').select('id').eq('event_id', eventId).maybeSingle();
      if (existing) {
        return res.status(200).json({ status: 'ok', message: 'Event already processed.' });
      }
      await supabase.from('payment_webhook_events').insert({
        event_id: eventId,
        event_type: event,
        provider: 'RAZORPAY',
        payload: payload,
        processed: true,
        created_at: new Date().toISOString()
      });
    } catch (e) {}

    const paymentEntity = payload.payload?.payment?.entity;
    if (paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const status = paymentEntity.status === 'captured' ? 'SUCCESS' : (paymentEntity.status === 'failed' ? 'FAILED' : 'PENDING');

      try {
        await supabase.from('payments').update({
          payment_id: paymentId,
          status,
          updated_at: new Date().toISOString()
        }).eq('order_id', orderId);
      } catch (e) {}
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handlePaymentStatus(req, res) {
  try {
    const supabase = getSupabase();
    const id = req.query.id || req.query.orderId || req.query.paymentId || req.query.registrationId;
    if (!id) return res.status(400).json({ success: false, message: 'Payment identifier required.' });

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .or(`order_id.eq.${id},payment_id.eq.${id},registration_id.eq.${id}`)
      .maybeSingle();

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });
    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handleAdminPaymentTransactions(req, res) {
  try {
    const supabase = getSupabase();
    const { status, tournamentId, competitionId, query, limit = 100 } = req.query;

    let dbQuery = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(Number(limit));
    if (status && status !== 'ALL') dbQuery = dbQuery.eq('status', status.toUpperCase());
    if (tournamentId) dbQuery = dbQuery.eq('tournament_id', tournamentId);
    if (competitionId) dbQuery = dbQuery.eq('competition_id', competitionId);

    let payments = [];
    try {
      const { data, error } = await dbQuery;
      if (!error && data) {
        payments = data;
      } else {
        // Fallback to external_registrations if payments table is pending SQL migration
        const { data: regs = [] } = await supabase.from('external_registrations').select('*').order('created_at', { ascending: false }).limit(Number(limit));
        payments = (regs || []).map(r => ({
          id: r.id,
          order_id: r.registration_id,
          payment_id: r.transaction_id || `pay_${r.registration_id}`,
          registration_id: r.registration_id,
          tournament_id: r.tournament_id,
          competition_id: r.competition_id,
          amount: Number(r.entry_fee || r.fee_amount || 0),
          currency: 'INR',
          status: (r.payment_status === 'VERIFIED' || r.payment_status === 'PAID') ? 'SUCCESS' : (r.payment_status === 'REJECTED' ? 'FAILED' : 'PENDING'),
          student_name: r.player_name || r.team_name,
          college_name: r.college_name,
          contact_email: r.participant_email,
          contact_phone: r.participant_phone,
          created_at: r.created_at
        }));
      }
    } catch (e) {
      payments = [];
    }

    let filtered = payments || [];
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.order_id && p.order_id.toLowerCase().includes(q)) ||
        (p.payment_id && p.payment_id.toLowerCase().includes(q)) ||
        (p.registration_id && p.registration_id.toLowerCase().includes(q)) ||
        (p.student_name && p.student_name.toLowerCase().includes(q)) ||
        (p.college_name && p.college_name.toLowerCase().includes(q))
      );
    }

    const summary = {
      totalTransactions: filtered.length,
      totalSuccessfulCollections: filtered.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + Number(p.amount || 0), 0),
      successfulCount: filtered.filter(p => p.status === 'SUCCESS').length,
      pendingCount: filtered.filter(p => p.status === 'PENDING' || p.status === 'CREATED').length,
      failedCount: filtered.filter(p => p.status === 'FAILED').length,
      refundedCount: filtered.filter(p => p.status === 'REFUNDED').length
    };

    return res.status(200).json({
      success: true,
      summary,
      transactions: filtered
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handleAdminPaymentRefund(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    const body = await parseRequestBody(req);
    const { paymentId, amount, reason } = body || {};

    if (!paymentId) return res.status(400).json({ success: false, message: 'Payment ID is required.' });

    const supabase = getSupabase();
    const env = getRazorpayEnv();
    const nowIso = new Date().toISOString();
    let refundId = `rfnd_${Date.now()}`;

    if (env.keyId && env.keySecret && !paymentId.startsWith('sim_')) {
      const authHeader = 'Basic ' + Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount ? Math.round(Number(amount) * 100) : undefined,
          notes: { reason: reason || 'Admin approved refund' }
        })
      });
      const rzpData = await rzpRes.json().catch(() => ({}));
      if (!rzpRes.ok) throw new Error(rzpData.error?.description || 'Razorpay refund failed.');
      refundId = rzpData.id;
    }

    try {
      await supabase.from('payments').update({
        status: 'REFUNDED',
        refund_status: 'REFUNDED',
        refund_id: refundId,
        refunded_amount: amount ? Number(amount) : null,
        refund_reason: reason || 'Authorized admin refund',
        updated_at: nowIso
      }).eq('payment_id', paymentId);
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Refund initiated and recorded successfully.',
      refundId
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Main Dispatcher ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Razorpay-Signature');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const cleanPath = url.split('?')[0].toLowerCase();

  // Payment Gateway Endpoints
  if (cleanPath.includes('/create-order') || req.query.action === 'create-order') {
    return handlePaymentCreateOrder(req, res);
  }
  if (cleanPath.includes('/verify') && !cleanPath.includes('/verify-otp') && !cleanPath.includes('/verify-payment')) {
    return handlePaymentVerifyOnline(req, res);
  }
  if (cleanPath.includes('/webhook') || req.query.action === 'webhook') {
    return handlePaymentWebhook(req, res);
  }
  if (cleanPath.includes('/admin/transactions') || req.query.action === 'admin-transactions') {
    return handleAdminPaymentTransactions(req, res);
  }
  if (cleanPath.includes('/admin/refund') || req.query.action === 'admin-refund') {
    return handleAdminPaymentRefund(req, res);
  }
  if (cleanPath.includes('/gateway-status') || req.query.action === 'gateway-status') {
    return handlePaymentGatewayStatus(req, res);
  }
  if (cleanPath.includes('/payment-status') || cleanPath.includes('/status') && cleanPath.includes('/payment')) {
    return handlePaymentStatus(req, res);
  }

  // Settings & Legacy Handlers
  if (cleanPath.includes('/payment-settings') || req.query.action === 'payment-settings') {
    if (cleanPath.includes('/admin') || req.query.admin === 'true') {
      return handleAdminPaymentSettings(req, res);
    }
    return handlePaymentSettings(req, res);
  }
  if (cleanPath.includes('/verify-payment') || req.query.action === 'verify-payment') {
    return handleVerifyPayment(req, res);
  }
  if (cleanPath.includes('/cm-trophy') || req.query.action === 'cm-trophy') {
    return handleCmTrophy(req, res);
  }
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

module.exports.handleCmTrophy = handleCmTrophy;


