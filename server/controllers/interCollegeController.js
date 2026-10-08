const crypto = require('crypto');
const os = require('os');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const localStore = require('../data/localStore');
const localDB = require('../database/localDB');

const OTP_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';
const COLLEGE_NAME = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';

// Mail transporter configuration using existing environment credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com',
    pass: process.env.EMAIL_PASS || 'aqrapupgrqymlhsh'
  }
});

// Helper: Mask email address for security
function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user.slice(-1)}@${domain}`;
}

// Configurable sport rules defaults
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
  discus_throw: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 },
  marathon: { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 }
};

exports.getSportRules = (sportName) => {
  if (!sportName) return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
  const clean = sportName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  for (const [key, rules] of Object.entries(DEFAULT_SPORT_RULES)) {
    if (clean.includes(key) || key.includes(clean)) return rules;
  }
  return { mode: 'INDIVIDUAL', requiredPlayers: 1, substitutes: 0, maxPlayers: 1 };
};

// Generate unique cryptographically secure registration token
exports.generateSecureToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generate unique Registration ID e.g. GASC-IC-2026-AB12CD
exports.generateRegistrationId = () => {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GASC-IC-2026-${hex}`;
};

// =========================================================================
// 1. PUBLIC: GET COMPETITION BY REGISTRATION TOKEN
// =========================================================================
exports.getCompetitionByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Invalid competition token.' });
    }

    // Try Supabase first
    let comp = null;
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('registration_token', token)
        .maybeSingle();
      if (!error && data) comp = data;
    } catch (e) {}

    // Fallback search by ID or rules metadata or localStore
    if (!comp) {
      const comps = localStore.storeInstance.getTable('competitions') || [];
      comp = comps.find(c => 
        c.registration_token === token ||
        c.registrationToken === token ||
        c.id === token
      );
    }

    // Check if token matches tournament ID or comp ID in Supabase
    if (!comp) {
      try {
        const { data } = await supabase
          .from('competitions')
          .select('*')
          .eq('id', token)
          .maybeSingle();
        if (data) comp = data;
      } catch (e) {}
    }

    if (!comp) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired competition link. Please contact GASC Sports Department.'
      });
    }

    // Compute status flags
    const deadline = comp.registration_end || comp.registration_deadline || comp.date;
    const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
    const isRegistrationEnabled = comp.external_registration_enabled !== false &&
      comp.status !== 'Registration Closed' &&
      comp.status !== 'Cancelled' &&
      comp.status !== 'Draft';

    const rules = exports.getSportRules(comp.sport_name || comp.name);
    const requiredPlayers = comp.required_players || rules.requiredPlayers;
    const substitutes = comp.substitutes !== undefined ? comp.substitutes : rules.substitutes;
    const competitionMode = comp.competition_mode || (comp.type === 'Team' ? 'TEAM' : rules.mode);

    // Sanitize competition response: NEVER expose admin passwords or student lists!
    const sanitized = {
      id: comp.id,
      name: comp.name,
      tournamentName: comp.tournament_name || comp.tournamentName || comp.name,
      sportName: comp.sport_name || comp.sportName || comp.name,
      participationType: comp.participation_type || 'INTER_COLLEGE',
      competitionMode: competitionMode.toUpperCase(),
      gender: comp.gender || 'All',
      date: comp.date,
      startTime: comp.start_time || '09:00 AM',
      endTime: comp.end_time || '05:00 PM',
      venue: comp.venue || 'GASC Idappadi Sports Ground',
      registrationStart: comp.registration_start,
      registrationEnd: deadline,
      description: comp.description || '',
      rules: comp.rules || '',
      bannerImage: comp.banner_image || comp.banner_url || '/images/sports/tournament.png',
      contactPerson: comp.contact_person || 'Dr. R. ANITHA (Physical Director)',
      contactPhone: comp.contact_phone || '+91 94432 18765',
      contactEmail: comp.contact_email || 'sportsgascidappadi@gmail.com',
      requiredPlayers: Number(requiredPlayers),
      substitutes: Number(substitutes),
      maxPlayers: Number(requiredPlayers) + Number(substitutes),
      maxColleges: comp.max_colleges || 50,
      maxTeams: comp.max_teams || 30,
      status: comp.status || 'Registration Open',
      isRegistrationOpen: isRegistrationEnabled && !isDeadlinePassed,
      isDeadlinePassed,
      registrationToken: comp.registration_token || token
    };

    return res.json({
      success: true,
      competition: sanitized
    });
  } catch (err) {
    console.error('getCompetitionByToken error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving competition details.' });
  }
};

// =========================================================================
// 2. PUBLIC: SEND EMAIL OTP FOR REGISTRATION
// =========================================================================
exports.sendOtp = async (req, res) => {
  try {
    const { email, competitionToken, collegeName, participantName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    const expiryTime = Date.now() + expiryMinutes * 60 * 1000;

    // Generate cryptographic HMAC verification token
    const hash = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${cleanEmail}:${otp}:${expiryTime}`)
      .digest('hex');
    const otpToken = `${hash}.${expiryTime}`;

    // Store in Supabase / LocalDB for fallback and rate limiting
    try {
      await supabase.from('external_otps').insert({
        id: `eotp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        otp_code: otp,
        competition_id: competitionToken || null,
        expires_at: new Date(expiryTime).toISOString(),
        verified: false
      });
    } catch (e) {
      // Store in localStore fallback
      try {
        localStore.storeInstance.insert('external_otps', {
          id: `eotp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          email: cleanEmail,
          otp_code: otp,
          competition_id: competitionToken || null,
          expires_at: new Date(expiryTime).toISOString(),
          verified: false,
          created_at: new Date().toISOString()
        });
      } catch (e2) {}
    }

    // Compose branded HTML Email
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;color:#0f172a;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:25px 10px;">
        <tr><td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
            <tr>
              <td style="background:linear-gradient(135deg,#0a192f 0%,#1e3a8a 100%);padding:30px 24px;text-align:center;color:#ffffff;">
                <div style="font-size:32px;margin-bottom:6px;">🏆</div>
                <h1 style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${COLLEGE_NAME}</h1>
                <p style="margin:4px 0 0 0;font-size:13px;color:#cbd5e1;">Department of Physical Education & Sports • Inter-College Championship</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a;font-weight:600;">Inter-College Registration OTP Verification</h2>
                <p style="margin:0 0 16px 0;font-size:14px;color:#475569;line-height:1.5;">
                  Hello ${participantName ? `<strong>${participantName}</strong>` : 'Team Representative'}${collegeName ? ` (${collegeName})` : ''},
                </p>
                <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.5;">
                  Use the following 6-digit One-Time Password (OTP) to verify your contact email and confirm your inter-college competition registration:
                </p>
                <div style="background:linear-gradient(135deg,#f0fdf4 0%,#e0f2fe 100%);border:2px dashed #0284c7;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#0369a1;letter-spacing:1px;display:block;margin-bottom:6px;">Your 6-Digit OTP</span>
                  <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0f4c81;font-family:'Courier New',monospace;margin:6px 0;">
                    ${otp}
                  </div>
                  <span style="font-size:12px;color:#64748b;display:block;margin-top:6px;">
                    ⏱️ Valid for <strong>${expiryMinutes} minutes</strong> (One-time use only)
                  </span>
                </div>
                <p style="margin:0 0 10px 0;font-size:12px;color:#94a3b8;line-height:1.4;">
                  If you did not request this registration, please disregard this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
                Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: cleanEmail,
        subject: `[GASC Sports] Inter-College Registration OTP: ${otp}`,
        text: `Your GASC Inter-College Competition registration verification code is ${otp}. Valid for 10 minutes.`,
        html,
        headers: { 'X-Priority': '1', 'Importance': 'high' }
      });
      console.log(`[EXTERNAL OTP] Dispatched code to ${cleanEmail}`);
    } catch (mailErr) {
      console.warn('Mail send error (logging fallback):', mailErr.message);
    }

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}. Check your Inbox and Spam folder.`,
      maskedEmail: maskEmail(cleanEmail),
      otpToken,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      expiryMinutes
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch verification OTP.' });
  }
};

// =========================================================================
// 3. PUBLIC: VERIFY OTP
// =========================================================================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, otpToken } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const proofToken = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${cleanEmail}:VERIFIED:${Date.now()}`)
      .digest('hex');

    // 1. Verify via HMAC stateless token
    if (otpToken && otpToken.includes('.')) {
      const [expectedHash, expiryTimeStr] = otpToken.split('.');
      const expiryTime = parseInt(expiryTimeStr, 10);

      if (Date.now() <= expiryTime) {
        const calculated = crypto.createHmac('sha256', OTP_SECRET)
          .update(`${cleanEmail}:${cleanOtp}:${expiryTime}`)
          .digest('hex');

        if (calculated === expectedHash) {
          return res.json({
            success: true,
            verified: true,
            otpProofToken: proofToken,
            message: 'OTP verified successfully!'
          });
        }
      } else {
        return res.status(400).json({ success: false, verified: false, message: 'OTP has expired. Please request a new code.' });
      }
    }

    // 2. Check in database (Supabase or localStore)
    let records = [];
    try {
      const { data } = await supabase
        .from('external_otps')
        .select('*')
        .eq('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data && data.length > 0) records = data;
    } catch (dbErr) {}

    if (records.length === 0) {
      const allOtps = localStore.storeInstance.getTable('external_otps') || [];
      records = allOtps.filter(o => (o.email || '').toLowerCase() === cleanEmail);
      records.sort((a, b) => new Date(b.created_at || b.expires_at) - new Date(a.created_at || a.expires_at));
    }

    if (records && records.length > 0) {
      for (const rec of records) {
        if (String(rec.otp_code).trim() === cleanOtp) {
          const exp = new Date(rec.expires_at).getTime();
          if (Date.now() <= exp) {
            try {
              await supabase.from('external_otps').update({ verified: true }).eq('id', rec.id);
            } catch (e) {}
            rec.verified = true;
            return res.json({
              success: true,
              verified: true,
              otpProofToken: proofToken,
              message: 'OTP verified successfully!'
            });
          }
        }
      }
    }

    return res.status(400).json({
      success: false,
      verified: false,
      message: 'Invalid OTP code. Please check your email and enter the 6-digit code correctly.'
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, verified: false, message: 'OTP verification failed.' });
  }
};

// =========================================================================
// 4. PUBLIC: SUBMIT EXTERNAL REGISTRATION
// =========================================================================
exports.submitRegistration = async (req, res) => {
  try {
    const {
      competitionToken,
      collegeName,
      collegeAddress,
      district,
      state,
      collegePhone,
      collegeEmail,
      registrationType, // 'INDIVIDUAL' or 'TEAM'
      sportName,
      gender,
      teamName,
      coachName,
      coachPhone,
      managerName,
      managerPhone,
      playerName, // for individual
      playerRegisterNumber, // for individual
      department,
      year,
      participantEmail,
      participantPhone,
      supportingDocument,
      players, // array for team
      otpVerified
    } = req.body;

    // Basic Validation
    if (!competitionToken) return res.status(400).json({ success: false, message: 'Competition token is required.' });
    if (!collegeName || !collegeName.trim()) return res.status(400).json({ success: false, message: 'College name is required.' });
    if (!collegeAddress || !collegeAddress.trim()) return res.status(400).json({ success: false, message: 'College address is required.' });
    if (!district || !district.trim()) return res.status(400).json({ success: false, message: 'District is required.' });
    if (!state || !state.trim()) return res.status(400).json({ success: false, message: 'State is required.' });
    if (!participantEmail || !participantEmail.includes('@')) return res.status(400).json({ success: false, message: 'Valid contact email is required.' });
    if (!participantPhone || !participantPhone.trim()) return res.status(400).json({ success: false, message: 'Valid contact phone number is required.' });

    // 1. Fetch and Validate Competition
    let comp = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .or(`registration_token.eq.${competitionToken},id.eq.${competitionToken}`)
        .maybeSingle();
      if (data) comp = data;
    } catch (e) {}

    if (!comp) {
      const comps = localStore.storeInstance.getTable('competitions') || [];
      comp = comps.find(c => c.registration_token === competitionToken || c.id === competitionToken);
    }

    if (!comp) {
      return res.status(404).json({ success: false, message: 'Competition not found or registration link invalid.' });
    }

    // Check deadline & status
    const deadline = comp.registration_end || comp.registration_deadline || comp.date;
    if (deadline && new Date() > new Date(deadline)) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed for this competition.' });
    }
    if (comp.external_registration_enabled === false || comp.status === 'Registration Closed') {
      return res.status(400).json({ success: false, message: 'Registration is currently closed for this competition.' });
    }

    const mode = (registrationType || comp.competition_mode || (comp.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
    const cleanCollege = collegeName.trim();
    const cleanEmail = participantEmail.toLowerCase().trim();

    // 2. Duplicate Registration Prevention
    if (mode === 'INDIVIDUAL') {
      if (!playerName || !playerName.trim()) return res.status(400).json({ success: false, message: 'Player name is required.' });
      if (!playerRegisterNumber || !playerRegisterNumber.trim()) return res.status(400).json({ success: false, message: 'Player register/roll number is required.' });

      const cleanRegNo = playerRegisterNumber.trim().toUpperCase();

      // Check existing individual registration in Supabase
      try {
        const { data: existingInd } = await supabase
          .from('external_registrations')
          .select('id, registration_id')
          .eq('competition_id', comp.id)
          .ilike('college_name', cleanCollege)
          .ilike('player_register_number', cleanRegNo)
          .maybeSingle();

        if (existingInd) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_REGISTRATION',
            message: `Player with Register Number "${cleanRegNo}" from "${cleanCollege}" has already registered for this competition.`,
            registrationId: existingInd.registration_id
          });
        }
      } catch (e) {}
    } else {
      // TEAM MODE: Duplicate Check by College + Competition + Sport + Gender
      const cleanSport = (sportName || comp.sport_name || comp.name).trim();
      const cleanGender = (gender || comp.gender || 'Boys').trim();

      try {
        const { data: existingTeam } = await supabase
          .from('external_registrations')
          .select('id, registration_id')
          .eq('competition_id', comp.id)
          .ilike('college_name', cleanCollege)
          .ilike('gender', cleanGender)
          .maybeSingle();

        if (existingTeam) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_COLLEGE_TEAM',
            message: `"${cleanCollege}" has already registered a ${cleanGender} team for this competition.`,
            registrationId: existingTeam.registration_id
          });
        }
      } catch (e) {}

      // Validate Team Players List
      const rules = exports.getSportRules(cleanSport);
      const reqPlayers = Number(comp.required_players || rules.requiredPlayers);
      const subPlayers = Number(comp.substitutes !== undefined ? comp.substitutes : rules.substitutes);
      const maxAllowed = reqPlayers + subPlayers;

      const playerList = Array.isArray(players) ? players : [];
      if (playerList.length < reqPlayers) {
        return res.status(400).json({
          success: false,
          message: `This sport requires a minimum of ${reqPlayers} playing squad members. You added ${playerList.length}.`
        });
      }
      if (playerList.length > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `Maximum allowed squad size is ${maxAllowed} players (${reqPlayers} required + ${subPlayers} substitutes).`
        });
      }
    }

    // 3. Generate Registration ID
    const registrationId = exports.generateRegistrationId();
    const primaryId = `ereg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const registrationRecord = {
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
      player_register_number: mode === 'INDIVIDUAL' ? playerRegisterNumber?.trim().toUpperCase() : null,
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

    // Save Registration to Supabase
    let savedInSupa = false;
    try {
      const { data, error } = await supabase
        .from('external_registrations')
        .insert(registrationRecord)
        .select()
        .single();
      if (!error && data) savedInSupa = true;
    } catch (e) {
      console.warn('Supabase external_registrations insert notice:', e.message);
    }

    // Always mirror to localStore & SQLite for offline resilience
    try {
      const regTable = localStore.storeInstance.getTable('external_registrations') || [];
      regTable.unshift(registrationRecord);
      localStore.storeInstance.save();
    } catch (e) {}

    try {
      localDB.run(
        `INSERT OR REPLACE INTO external_registrations (id, registration_id, competition_id, college_name, college_address, district, state, college_phone, college_email, registration_type, sport_name, gender, team_name, coach_name, coach_phone, manager_name, manager_phone, player_name, player_register_number, department, year, participant_email, participant_phone, otp_verified, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'PENDING',strftime('%s','now'),strftime('%s','now'))`,
        [primaryId, registrationId, comp.id, cleanCollege, collegeAddress, district, state, collegePhone || '', collegeEmail || '', mode, comp.sport_name || comp.name, gender || 'All', registrationRecord.team_name || '', coachName || '', coachPhone || '', managerName || '', managerPhone || '', registrationRecord.player_name || '', registrationRecord.player_register_number || '', department || '', year || '', cleanEmail, participantPhone]
      );
      localDB.saveDB();
    } catch (e) {}

    // Save Team Players if TEAM
    const createdPlayers = [];
    if (mode === 'TEAM' && Array.isArray(players) && players.length > 0) {
      for (const p of players) {
        const playerRec = {
          id: `epl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          external_registration_id: primaryId,
          player_name: p.playerName || p.name || 'Player',
          college_register_number: (p.registerNumber || p.rollNo || 'N/A').toUpperCase().trim(),
          department: p.department || 'General',
          year: p.year || 'I Year',
          gender: p.gender || gender || 'Boys',
          player_role: p.playerRole || p.role || 'Player',
          created_at: new Date().toISOString()
        };
        createdPlayers.push(playerRec);

        try {
          await supabase.from('external_registration_players').insert(playerRec);
        } catch (e) {}

        try {
          const epTable = localStore.storeInstance.getTable('external_registration_players') || [];
          epTable.push(playerRec);
        } catch (e) {}

        try {
          localDB.run(
            `INSERT OR REPLACE INTO external_registration_players (id, external_registration_id, player_name, college_register_number, department, year, gender, player_role, created_at) VALUES (?,?,?,?,?,?,?,?,strftime('%s','now'))`,
            [playerRec.id, primaryId, playerRec.player_name, playerRec.college_register_number, playerRec.department, playerRec.year, playerRec.gender, playerRec.player_role]
          );
        } catch (e) {}
      }
      try { localStore.storeInstance.save(); localDB.saveDB(); } catch (e) {}
    }

    // 4. Send Confirmation Email to Participant
    const compName = comp.name;
    const confirmHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;color:#0f172a;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:25px 10px;">
        <tr><td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
            <tr>
              <td style="background:linear-gradient(135deg,#0a192f 0%,#1e3a8a 100%);padding:30px 24px;text-align:center;color:#ffffff;">
                <div style="font-size:36px;margin-bottom:6px;">🎉</div>
                <h1 style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${COLLEGE_NAME}</h1>
                <p style="margin:4px 0 0 0;font-size:13px;color:#cbd5e1;">Inter-College Sports Championship 2026</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h2 style="margin:0 0 10px 0;font-size:18px;color:#16a34a;font-weight:700;">✅ Registration Successfully Submitted</h2>
                <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.5;">
                  Your registration for <strong>${compName}</strong> has been received by the GASC Sports Department. It is currently under verification.
                </p>

                <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:18px;margin-bottom:22px;">
                  <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#334155;">
                    <tr>
                      <td style="color:#64748b;font-weight:600;width:40%;">Registration ID:</td>
                      <td style="font-weight:800;color:#0f4c81;font-size:16px;">${registrationId}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b;font-weight:600;">Competition:</td>
                      <td style="font-weight:600;">${compName}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b;font-weight:600;">College:</td>
                      <td>${cleanCollege}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b;font-weight:600;">Category / Type:</td>
                      <td>${mode} (${gender || 'All'})</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b;font-weight:600;">Status:</td>
                      <td><span style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:6px;font-weight:700;font-size:12px;">PENDING VERIFICATION</span></td>
                    </tr>
                  </table>
                </div>

                <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;line-height:1.5;">
                  Please keep this Registration ID safe. You will receive an email once the Sports Department reviews and approves your submission.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: cleanEmail,
        subject: `[GASC Sports] Registration Submitted: ${registrationId} (${compName})`,
        text: `Your registration for ${compName} has been submitted successfully. Registration ID: ${registrationId}. Status: PENDING`,
        html: confirmHtml
      });
    } catch (mailErr) {}

    // 5. Admin Broadcast Notification
    try {
      await supabase.from('notifications').insert({
        title: `🌐 External College Registration: ${cleanCollege}`,
        message: `${cleanCollege} registered for "${compName}" (${mode}). Registration ID: ${registrationId}. Review & approve in Admin Portal.`,
        category: 'Competition',
        priority: 'High'
      });
    } catch (e) {}

    const returnedRegistration = {
      ...registrationRecord,
      players: createdPlayers
    };

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      registrationId,
      registration: returnedRegistration,
      data: returnedRegistration
    });

  } catch (err) {
    console.error('submitRegistration error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating registration record.' });
  }
};

// =========================================================================
// 5. ADMIN: GET ALL EXTERNAL REGISTRATIONS
// =========================================================================
exports.getAllRegistrations = async (req, res) => {
  try {
    const { competitionId, sport, college, status, gender } = req.query;

    let registrations = [];
    try {
      let query = supabase.from('external_registrations').select('*');
      if (competitionId && competitionId !== 'All') query = query.eq('competition_id', competitionId);
      if (status && status !== 'All') query = query.eq('status', status);
      if (gender && gender !== 'All') query = query.eq('gender', gender);
      if (sport && sport !== 'All') query = query.ilike('sport_name', `%${sport}%`);
      if (college && college !== 'All') query = query.ilike('college_name', `%${college}%`);

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (!error && data) registrations = data;
    } catch (e) {}

    // Fallback to localStore
    if (!registrations || registrations.length === 0) {
      const localList = localStore.storeInstance.getTable('external_registrations') || [];
      registrations = localList.filter(r => {
        if (competitionId && competitionId !== 'All' && r.competition_id !== competitionId) return false;
        if (status && status !== 'All' && r.status !== status) return false;
        if (gender && gender !== 'All' && r.gender !== gender) return false;
        if (sport && sport !== 'All' && !(r.sport_name || '').toLowerCase().includes(sport.toLowerCase())) return false;
        if (college && college !== 'All' && !(r.college_name || '').toLowerCase().includes(college.toLowerCase())) return false;
        return true;
      });
    }

    return res.json({
      success: true,
      count: registrations.length,
      registrations: registrations.map(toCamelCase)
    });
  } catch (err) {
    console.error('getAllRegistrations error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 6. ADMIN / PUBLIC: GET SINGLE REGISTRATION DETAILS (WITH PLAYERS)
// =========================================================================
exports.getRegistrationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let registration = null;
    let players = [];

    // Search by ID or registration_id
    try {
      const { data } = await supabase
        .from('external_registrations')
        .select('*')
        .or(`id.eq.${id},registration_id.eq.${id}`)
        .maybeSingle();
      if (data) registration = data;
    } catch (e) {}

    if (!registration) {
      const all = localStore.storeInstance.getTable('external_registrations') || [];
      registration = all.find(r => r.id === id || r.registration_id === id);
    }

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    // Fetch players
    try {
      const { data: pData } = await supabase
        .from('external_registration_players')
        .select('*')
        .eq('external_registration_id', registration.id)
        .order('created_at', { ascending: true });
      if (pData) players = pData;
    } catch (e) {}

    if (!players || players.length === 0) {
      const epTable = localStore.storeInstance.getTable('external_registration_players') || [];
      players = epTable.filter(p => p.external_registration_id === registration.id);
    }

    // Fetch parent competition details for receipt
    let comp = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', registration.competition_id)
        .maybeSingle();
      if (data) comp = data;
    } catch (e) {}

    return res.json({
      success: true,
      registration: toCamelCase(registration),
      players: players.map(toCamelCase),
      competition: comp ? toCamelCase(comp) : null
    });
  } catch (err) {
    console.error('getRegistrationDetails error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 7. ADMIN: APPROVE / REJECT / REQUEST CORRECTION
// =========================================================================
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, correctionMessage } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be PENDING, APPROVED, REJECTED, or CORRECTION_REQUIRED.' });
    }

    if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a rejection reason.' });
    }

    if (status === 'CORRECTION_REQUIRED' && (!correctionMessage || !correctionMessage.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a correction message explaining required changes.' });
    }

    const updates = {
      status,
      rejection_reason: status === 'REJECTED' ? rejectionReason.trim() : null,
      correction_message: status === 'CORRECTION_REQUIRED' ? correctionMessage.trim() : null,
      updated_at: new Date().toISOString()
    };

    let updated = null;
    try {
      const { data } = await supabase
        .from('external_registrations')
        .update(updates)
        .or(`id.eq.${id},registration_id.eq.${id}`)
        .select()
        .single();
      if (data) updated = data;
    } catch (e) {}

    // Update localStore
    const all = localStore.storeInstance.getTable('external_registrations') || [];
    const idx = all.findIndex(r => r.id === id || r.registration_id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      localStore.storeInstance.save();
      if (!updated) updated = all[idx];
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    // Send Status Update Email to participant
    if (updated.participant_email) {
      let subject = `[GASC Sports] Registration Update: ${updated.registration_id} - ${status}`;
      let bodyMsg = '';

      if (status === 'APPROVED') {
        bodyMsg = `<p style="color:#16a34a;font-weight:700;">Congratulations! Your registration has been APPROVED by the GASC Sports Board.</p><p>Your team/participant profile is now confirmed for fixture scheduling. Please arrive at the venue with college ID cards and bonafide certificates.</p>`;
      } else if (status === 'REJECTED') {
        bodyMsg = `<p style="color:#dc2626;font-weight:700;">Your registration could not be accepted.</p><p><strong>Reason:</strong> ${rejectionReason}</p>`;
      } else if (status === 'CORRECTION_REQUIRED') {
        bodyMsg = `<p style="color:#d97706;font-weight:700;">Action Required: Correction Requested.</p><p><strong>Details:</strong> ${correctionMessage}</p><p>Please contact the Sports Incharge to submit the revised documents.</p>`;
      }

      const emailHtml = `
      <div style="font-family:sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
        <h2 style="color:#0f172a;margin-top:0;">${COLLEGE_NAME}</h2>
        <h3>Registration Status: ${status}</h3>
        <p><strong>Registration ID:</strong> ${updated.registration_id}</p>
        <p><strong>College:</strong> ${updated.college_name}</p>
        <p><strong>Competition:</strong> ${updated.sport_name}</p>
        ${bodyMsg}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
        <small style="color:#64748b;">GASC Sports Board • Idappadi - 637 101, Salem</small>
      </div>`;

      try {
        await transporter.sendMail({
          from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
          to: updated.participant_email,
          subject,
          html: emailHtml
        });
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: `Registration marked as ${status} successfully!`,
      status: updated.status,
      registration: toCamelCase(updated),
      data: updated
    });
  } catch (err) {
    console.error('updateRegistrationStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 8. ADMIN: GENERATE / REGENERATE QR TOKEN
// =========================================================================
exports.regenerateQrToken = async (req, res) => {
  try {
    const { id } = req.params;
    const newToken = exports.generateSecureToken();

    let updated = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .update({ registration_token: newToken })
        .eq('id', id)
        .select()
        .single();
      if (data) updated = data;
    } catch (e) {}

    const comps = localStore.storeInstance.getTable('competitions') || [];
    const idx = comps.findIndex(c => c.id === id);
    if (idx >= 0) {
      comps[idx].registration_token = newToken;
      comps[idx].registrationToken = newToken;
      localStore.storeInstance.save();
      if (!updated) updated = comps[idx];
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Competition not found.' });

    return res.json({
      success: true,
      message: 'New QR Registration Token generated successfully! Previous QR is now invalid.',
      registrationToken: newToken
    });
  } catch (err) {
    console.error('regenerateQrToken error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 9. ADMIN: TOGGLE REGISTRATION ENABLED / DISABLED
// =========================================================================
exports.toggleRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const newStatus = enabled ? 'Registration Open' : 'Registration Closed';
    const updates = {
      external_registration_enabled: enabled,
      status: newStatus
    };

    let updated = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (data) updated = data;
    } catch (e) {}

    const comps = localStore.storeInstance.getTable('competitions') || [];
    const idx = comps.findIndex(c => c.id === id);
    if (idx >= 0) {
      comps[idx].external_registration_enabled = enabled;
      comps[idx].status = newStatus;
      localStore.storeInstance.save();
      if (!updated) updated = comps[idx];
    }

    return res.json({
      success: true,
      message: `Competition registration ${enabled ? 'ENABLED' : 'DISABLED'} successfully!`,
      status: newStatus,
      externalRegistrationEnabled: enabled
    });
  } catch (err) {
    console.error('toggleRegistration error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 10. ADMIN: GET INTER-COLLEGE DASHBOARD ANALYTICS
// =========================================================================
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Get all competitions that are INTER_COLLEGE
    let interComps = [];
    try {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .or('participation_type.eq.INTER_COLLEGE,type.eq.Inter-College');
      if (data) interComps = data;
    } catch (e) {}

    if (interComps.length === 0) {
      const allComps = localStore.storeInstance.getTable('competitions') || [];
      interComps = allComps.filter(c => 
        c.participation_type === 'INTER_COLLEGE' ||
        c.participationType === 'INTER_COLLEGE' ||
        c.type === 'Inter-College'
      );
    }

    // 2. Get all external registrations
    let allRegs = [];
    try {
      const { data } = await supabase.from('external_registrations').select('*');
      if (data) allRegs = data;
    } catch (e) {}

    if (allRegs.length === 0) {
      allRegs = localStore.storeInstance.getTable('external_registrations') || [];
    }

    // 3. Get all external players
    let allPlayers = [];
    try {
      const { data } = await supabase.from('external_registration_players').select('*');
      if (data) allPlayers = data;
    } catch (e) {}

    if (allPlayers.length === 0) {
      allPlayers = localStore.storeInstance.getTable('external_registration_players') || [];
    }

    // Unique colleges count
    const uniqueColleges = new Set(allRegs.map(r => (r.college_name || '').trim().toLowerCase()).filter(Boolean));

    // Status breakdown
    const pending = allRegs.filter(r => (r.status || 'PENDING') === 'PENDING').length;
    const approved = allRegs.filter(r => r.status === 'APPROVED').length;
    const rejected = allRegs.filter(r => r.status === 'REJECTED').length;
    const correction = allRegs.filter(r => r.status === 'CORRECTION_REQUIRED').length;

    // Team vs Individual
    const teams = allRegs.filter(r => r.registration_type === 'TEAM').length;
    const individuals = allRegs.filter(r => r.registration_type === 'INDIVIDUAL').length;

    // Total Players: individual count + team player roster count
    const totalPlayers = individuals + allPlayers.length;

    // Sport-wise counts
    const sportCounts = {};
    allRegs.forEach(r => {
      const s = r.sport_name || 'General';
      sportCounts[s] = (sportCounts[s] || 0) + 1;
    });

    // College-wise counts (Top colleges)
    const collegeCounts = {};
    allRegs.forEach(r => {
      const c = r.college_name || 'Unknown';
      collegeCounts[c] = (collegeCounts[c] || 0) + 1;
    });

    // Gender breakdown
    const genderCounts = { Boys: 0, Girls: 0, Mixed: 0 };
    allRegs.forEach(r => {
      const g = r.gender || 'Boys';
      if (genderCounts[g] !== undefined) genderCounts[g]++;
      else genderCounts.Boys++;
    });

    return res.json({
      success: true,
      analytics: {
        totalCompetitions: interComps.length,
        totalColleges: uniqueColleges.size,
        totalRegistrations: allRegs.length,
        pendingRegistrations: pending,
        approvedRegistrations: approved,
        rejectedRegistrations: rejected,
        correctionRequiredRegistrations: correction,
        totalTeams: teams,
        totalPlayers: totalPlayers,
        sportWise: sportCounts,
        collegeWise: collegeCounts,
        genderWise: genderCounts
      }
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 8. PUBLIC: GENERATE / STREAM QR CODE IMAGE
// =========================================================================
exports.getQrImage = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).send('Token required');

    let clientOrigin = req.query.baseUrl;
    if (!clientOrigin) {
      if (process.env.PUBLIC_STUDENT_PORTAL_URL) {
        clientOrigin = process.env.PUBLIC_STUDENT_PORTAL_URL;
      } else if (process.env.CLIENT_URL) {
        clientOrigin = process.env.CLIENT_URL;
      } else {
        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
          clientOrigin = `${proto}://${host}`;
        } else {
          // Default to live public production portal so mobile phones can reach it!
          clientOrigin = 'https://gasc-student-portal.vercel.app';
        }
      }
    }
    clientOrigin = clientOrigin.replace(/\/+$/, '');
    const registrationUrl = `${clientOrigin}/inter-college/register/${token}`;

    const format = req.query.format || 'png';
    const size = parseInt(req.query.size, 10) || 300;

    if (format === 'svg') {
      const svg = await QRCode.toString(registrationUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: { dark: '#0a192f', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send(svg);
    } else {
      const buffer = await QRCode.toBuffer(registrationUrl, {
        type: 'png',
        width: size,
        margin: 2,
        color: { dark: '#0a192f', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/png');
      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="GASC_InterCollege_QR_${token}.png"`);
      }
      return res.status(200).send(buffer);
    }
  } catch (err) {
    return res.status(500).send('Error generating QR: ' + err.message);
  }
};

// =========================================================================
// 8B. SYSTEM: NETWORK INFO (LAN IP & PORTAL URLS)
// =========================================================================
exports.getNetworkInfo = (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ name, address: iface.address });
        }
      }
    }
    const primaryIp = addresses.length > 0 ? addresses[0].address : '10.164.116.21';
    return res.json({
      success: true,
      localIp: primaryIp,
      port: process.env.PORT || 5000,
      publicPortalUrl: process.env.PUBLIC_STUDENT_PORTAL_URL || 'https://gasc-student-portal.vercel.app',
      addresses
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 9. PUBLIC: LIST ALL INTER-COLLEGE COMPETITIONS
// =========================================================================
exports.getPublicCompetitions = async (req, res) => {
  try {
    let comps = [];
    try {
      const { data } = await supabase.from('competitions').select('*');
      if (data) comps = data;
    } catch (e) {}

    if (comps.length === 0) {
      comps = localStore.storeInstance.getTable('competitions') || [];
    }

    const interComps = comps.filter(c => 
      c.participation_type === 'INTER_COLLEGE' || 
      c.participationType === 'INTER_COLLEGE' ||
      c.type === 'Inter-College'
    );

    return res.json({ success: true, count: interComps.length, data: interComps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 10. ADMIN: GET ALL INTER-COLLEGE DATA (COMPETITIONS, REGS, PLAYERS, TEAMS)
// =========================================================================
exports.getAdminAllData = async (req, res) => {
  try {
    let comps = [];
    let regs = [];

    try {
      const { data } = await supabase.from('competitions').select('*');
      if (data) comps = data;
    } catch (e) {}
    if (comps.length === 0) comps = localStore.storeInstance.getTable('competitions') || [];

    const interComps = comps.filter(c => 
      c.participation_type === 'INTER_COLLEGE' || 
      c.participationType === 'INTER_COLLEGE' ||
      c.type === 'Inter-College'
    );

    try {
      const { data } = await supabase.from('external_registrations').select('*').order('created_at', { ascending: false });
      if (data) regs = data;
    } catch (e) {}
    if (regs.length === 0) regs = localStore.storeInstance.getTable('external_registrations') || [];

    let allPlayers = [];
    try {
      const { data } = await supabase.from('external_registration_players').select('*');
      if (data) allPlayers = data;
    } catch (e) {}
    if (allPlayers.length === 0) allPlayers = localStore.storeInstance.getTable('external_registration_players') || [];

    regs = regs.map(r => ({
      ...r,
      players: allPlayers.filter(p => String(p.external_registration_id) === String(r.id))
    }));

    return res.json({
      success: true,
      competitions: interComps,
      registrations: regs,
      totalComps: interComps.length,
      totalRegs: regs.length,
      pendingCount: regs.filter(r => (r.status || '').toUpperCase() === 'PENDING').length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

