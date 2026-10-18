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

    // Check if token matches tournament ID or comp ID or MD5 hash in Supabase/localStore
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
      let fallbackList = [...(localStore.storeInstance.getTable('competitions') || [])];
      try {
        const { data } = await supabase.from('competitions').select('*');
        if (data && Array.isArray(data)) fallbackList.push(...data);
      } catch (e) {}
      comp = fallbackList.find(c => 
        c.registration_token === token ||
        c.registrationToken === token ||
        String(c.id) === String(token) ||
        crypto.createHash('md5').update(String(c.id || c.name)).digest('hex') === token
      );
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
      if (req.body.competitionId) {
        const { data } = await supabase
          .from('competitions')
          .select('*')
          .eq('id', req.body.competitionId)
          .maybeSingle();
        if (data) comp = data;
      }
      if (!comp && competitionToken) {
        const { data } = await supabase
          .from('competitions')
          .select('*')
          .eq('registration_token', competitionToken)
          .limit(1);
        if (Array.isArray(data) && data.length > 0) comp = data[0];
      }
    } catch (e) {}

    if (!comp) {
      const comps = localStore.storeInstance.getTable('competitions') || [];
      comp = comps.find(c =>
        (req.body.competitionId && (c.id === req.body.competitionId || c._id === req.body.competitionId)) ||
        (competitionToken && (c.registration_token === competitionToken || c.id === competitionToken))
      );
    }

    if (!comp) {
      return res.status(404).json({ success: false, message: 'Competition not found or registration link invalid.' });
    }

    // Verify competition belongs to the tournament specified
    const targetTour = req.body.tournamentId || req.body.tournamentToken;
    if (targetTour) {
      const cleanTour = targetTour.trim();
      const lowerTour = cleanTour.toLowerCase();

      let tFound = null;
      try {
        if (req.body.tournamentId) {
          const { data } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', req.body.tournamentId)
            .maybeSingle();
          if (data) tFound = data;
        }
        if (!tFound) {
          const { data } = await supabase
            .from('tournaments')
            .select('*')
            .eq('registration_token', cleanTour)
            .limit(1);
          if (Array.isArray(data) && data.length > 0) tFound = data[0];
        }
      } catch (tErr) {}

      if (!tFound) {
        const localTournaments = localStore.storeInstance.getTable('tournaments') || [];
        tFound = localTournaments.find(t =>
          (req.body.tournamentId && (t.id === req.body.tournamentId || t.id.toLowerCase() === req.body.tournamentId.toLowerCase())) ||
          (t.registration_token && t.registration_token.toLowerCase() === lowerTour) ||
          (t.id && t.id.toLowerCase() === lowerTour)
        );
      }

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

    // Check registration start & deadline & status
    const now = new Date();
    const regStart = comp.registration_start || comp.registrationStart;
    if (regStart) {
      const sDate = new Date(regStart);
      if (!isNaN(sDate.getTime()) && now < sDate) {
        return res.status(400).json({
          success: false,
          message: `Online registration has not opened yet for this competition. It will open on ${sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
        });
      }
    }

    const deadline = comp.registration_end || comp.registration_deadline || comp.date;
    if (deadline) {
      let dDate = new Date(deadline);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(deadline).trim())) {
        dDate = new Date(`${String(deadline).trim()}T23:59:59.999Z`);
      }
      if (!isNaN(dDate.getTime()) && now > dDate) {
        return res.status(400).json({ success: false, message: 'Registration deadline has passed for this competition.' });
      }
    }
    if (comp.external_registration_enabled === false || comp.status === 'Registration Closed' || comp.status === 'Cancelled' || comp.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Registration is currently closed for this competition.' });
    }

    const mode = (registrationType || comp.competition_mode || (comp.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
    const cleanCollege = collegeName.trim();
    const cleanEmail = participantEmail.toLowerCase().trim();

    // Verify Category strictly from actual database record - NEVER trust browser value blindly
    const dbCat = comp.category || comp.gender || 'Mixed';
    let verifiedCategory = 'Mixed';
    if (/^men$|^boys?$/i.test(dbCat)) verifiedCategory = 'Men';
    else if (/^women$|^girls?$/i.test(dbCat)) verifiedCategory = 'Women';
    else verifiedCategory = 'Mixed';

    // Verify participant/team gender against competition category
    if (mode === 'INDIVIDUAL') {
      const pGender = (req.body.individualGender || gender || '').toLowerCase();
      const isMale = pGender === 'male' || pGender === 'boy' || pGender === 'boys' || pGender === 'men';
      const isFemale = pGender === 'female' || pGender === 'girl' || pGender === 'girls' || pGender === 'women';
      if (verifiedCategory === 'Men' && isFemale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Female athletes cannot register for Men\'s category competitions.' });
      }
      if (verifiedCategory === 'Women' && isMale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Male athletes cannot register for Women\'s category competitions.' });
      }
    } else if (mode === 'TEAM') {
      const tGender = (req.body.teamGender || gender || '').toLowerCase();
      const isMale = tGender === 'male' || tGender === 'boy' || tGender === 'boys' || tGender === 'men';
      const isFemale = tGender === 'female' || tGender === 'girl' || tGender === 'girls' || tGender === 'women';
      if (verifiedCategory === 'Men' && isFemale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Female squads cannot register for Men\'s category competitions.' });
      }
      if (verifiedCategory === 'Women' && isMale) {
        return res.status(400).json({ success: false, message: 'Eligibility restriction: Male squads cannot register for Women\'s category competitions.' });
      }
    }

    const finalRollNumber = (playerRegisterNumber || req.body.playerRollNumber || req.body.rollNo || '').trim().toUpperCase();
    // 2. Duplicate Registration Prevention
    if (mode === 'INDIVIDUAL') {
      if (!playerName || !playerName.trim()) return res.status(400).json({ success: false, message: 'Player name is required.' });
      if (!finalRollNumber) return res.status(400).json({ success: false, message: 'Player register/roll number is required.' });

      const cleanRegNo = finalRollNumber;

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

    // ── Payment Details & Validation ──
    const reqFee = Number(req.body.feeAmount || comp.entry_fee || comp.entryFee || 0);
    const submittedUtr = (req.body.transactionRef || req.body.utrNumber || '').trim().toUpperCase();
    const submittedScreenshot = req.body.paymentScreenshot || null;
    const submittedConfigVersion = Number(req.body.paymentConfigVersion || 1);
    const submittedMethod = req.body.paymentMethod || (reqFee > 0 ? 'MANUAL_UPI' : 'FREE');

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
          message: 'Invalid UPI Transaction Reference Number (UTR). Please enter a valid transaction reference from your UPI payment app.'
        });
      }

      // Prevent duplicate transaction reference numbers across registrations
      let isDuplicateUtr = false;
      try {
        const { data: dupSupa } = await supabase
          .from('external_registrations')
          .select('id, registration_id, transaction_ref')
          .eq('transaction_ref', submittedUtr)
          .limit(1);
        if (dupSupa && dupSupa.length > 0) isDuplicateUtr = true;
      } catch (e) {}

      if (!isDuplicateUtr) {
        const allRegs = localStore.storeInstance.getTable('external_registrations') || [];
        const found = allRegs.find(r => {
          if (r.transaction_ref && r.transaction_ref.toUpperCase() === submittedUtr) return true;
          if (r.remarks && typeof r.remarks === 'string' && r.remarks.includes(submittedUtr)) return true;
          return false;
        });
        if (found) isDuplicateUtr = true;
      }

      if (!isDuplicateUtr) {
        try {
          const sqliteDups = localDB.query("SELECT id, registration_id FROM external_registrations WHERE transaction_ref = ? LIMIT 1", [submittedUtr]);
          if (sqliteDups && sqliteDups.length > 0) isDuplicateUtr = true;
        } catch (e) {}
      }

      if (isDuplicateUtr) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_TRANSACTION_REF',
          message: `This UPI Transaction Reference Number (${submittedUtr}) has already been submitted for another registration. Duplicate transaction references are strictly rejected.`
        });
      }
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
      payment_remarks: null
    };

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
      gender: verifiedCategory,
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
      fee_amount: reqFee,
      payment_method: submittedMethod,
      payment_status: initialPaymentStatus,
      transaction_ref: submittedUtr || null,
      payment_screenshot: submittedScreenshot,
      payment_config_version: submittedConfigVersion,
      remarks: JSON.stringify(remarksPayload),
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
      // Fallback: insert with legacy columns if payment columns not yet in DB schema
      try {
        const legacyRecord = { ...registrationRecord };
        delete legacyRecord.fee_amount;
        delete legacyRecord.payment_method;
        delete legacyRecord.payment_status;
        delete legacyRecord.transaction_ref;
        delete legacyRecord.payment_screenshot;
        delete legacyRecord.payment_config_version;
        await supabase.from('external_registrations').insert(legacyRecord);
        savedInSupa = true;
      } catch (legacyErr) {
        console.warn('Supabase external_registrations fallback insert notice:', legacyErr.message);
      }
    }

    // Always mirror to localStore & SQLite for offline resilience
    try {
      const regTable = localStore.storeInstance.getTable('external_registrations') || [];
      regTable.unshift(registrationRecord);
      localStore.storeInstance.save();
    } catch (e) {}

    try {
      localDB.run(
        `INSERT OR REPLACE INTO external_registrations (id, registration_id, competition_id, college_name, college_address, district, state, college_phone, college_email, registration_type, sport_name, gender, team_name, coach_name, coach_phone, manager_name, manager_phone, player_name, player_register_number, department, year, participant_email, participant_phone, otp_verified, status, fee_amount, payment_method, payment_status, transaction_ref, payment_screenshot, payment_config_version, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'PENDING',?,?,?,?,?,?,strftime('%s','now'),strftime('%s','now'))`,
        [
          primaryId, registrationId, comp.id, cleanCollege, collegeAddress, district, state, collegePhone || '', collegeEmail || '', mode, comp.sport_name || comp.name, gender || 'All', registrationRecord.team_name || '', coachName || '', coachPhone || '', managerName || '', managerPhone || '', registrationRecord.player_name || '', registrationRecord.player_register_number || '', department || '', year || '', cleanEmail, participantPhone,
          reqFee, submittedMethod, initialPaymentStatus, submittedUtr || '', submittedScreenshot || '', submittedConfigVersion
        ]
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

// Helper: Enrich raw registration record with standardized payment properties
function enrichRegistrationWithPayment(r) {
  if (!r) return r;
  let paymentStatus = r.payment_status;
  let feeAmount = r.fee_amount;
  let transactionRef = r.transaction_ref;
  let paymentMethod = r.payment_method;
  let paymentScreenshot = r.payment_screenshot;
  let paymentConfigVersion = r.payment_config_version;
  let paymentVerifiedBy = r.payment_verified_by;
  let paymentVerifiedAt = r.payment_verified_at;
  let paymentRemarks = r.payment_remarks;

  if (r.remarks && typeof r.remarks === 'string' && r.remarks.startsWith('{')) {
    try {
      const parsed = JSON.parse(r.remarks);
      if (parsed && typeof parsed === 'object') {
        if (!paymentStatus && parsed.payment_status) paymentStatus = parsed.payment_status;
        if (feeAmount == null && parsed.fee_amount != null) feeAmount = parsed.fee_amount;
        if (!transactionRef && parsed.transaction_ref) transactionRef = parsed.transaction_ref;
        if (!paymentMethod && parsed.payment_method) paymentMethod = parsed.payment_method;
        if (!paymentScreenshot && parsed.payment_screenshot) paymentScreenshot = parsed.payment_screenshot;
        if (!paymentConfigVersion && parsed.payment_config_version) paymentConfigVersion = parsed.payment_config_version;
        if (!paymentVerifiedBy && parsed.payment_verified_by) paymentVerifiedBy = parsed.payment_verified_by;
        if (!paymentVerifiedAt && parsed.payment_verified_at) paymentVerifiedAt = parsed.payment_verified_at;
        if (!paymentRemarks && parsed.payment_remarks) paymentRemarks = parsed.payment_remarks;
      }
    } catch (e) {}
  }

  return {
    ...r,
    payment_status: paymentStatus || (r.status === 'CONFIRMED' || r.status === 'APPROVED' ? 'VERIFIED' : 'PENDING_VERIFICATION'),
    fee_amount: feeAmount != null ? Number(feeAmount) : 0,
    transaction_ref: transactionRef || null,
    payment_method: paymentMethod || 'MANUAL_UPI',
    payment_screenshot: paymentScreenshot || null,
    payment_config_version: Number(paymentConfigVersion || 1),
    payment_verified_by: paymentVerifiedBy || null,
    payment_verified_at: paymentVerifiedAt || null,
    payment_remarks: paymentRemarks || null
  };
}

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
      registrations: registrations.map(enrichRegistrationWithPayment).map(toCamelCase)
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

    registration = enrichRegistrationWithPayment(registration);

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

    // If APPROVED, sync team/participant into teams and team_members table for Fixtures!
    if (status === 'APPROVED') {
      try {
        const teamId = `team_ext_${updated.id}`;
        const teamName = updated.team_name || `${updated.college_name} - ${updated.player_name || updated.sport_name}`;
        const newTeamObj = {
          id: teamId,
          name: teamName,
          sport_name: updated.sport_name || 'Championship',
          department: updated.college_name || 'External College',
          gender: updated.gender || 'Boys',
          year: updated.year || 'I Year',
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert into Supabase teams
        try {
          await supabase.from('teams').upsert([newTeamObj]);
        } catch (stErr) {}

        // Insert into localStore teams
        try {
          const localTeams = localStore.storeInstance.getTable('teams') || [];
          if (!localTeams.some(t => t.id === teamId)) {
            localTeams.push(newTeamObj);
            localStore.storeInstance.save();
          }
        } catch (ltErr) {}

        // Fetch registered players and insert into team_members
        let playersToSync = [];
        try {
          const { data: pData } = await supabase
            .from('external_registration_players')
            .select('*')
            .eq('external_registration_id', updated.id);
          if (Array.isArray(pData)) playersToSync = pData;
        } catch (e) {}

        if (playersToSync.length === 0) {
          const localPlayers = localStore.storeInstance.getTable('external_registration_players') || [];
          playersToSync = localPlayers.filter(p => String(p.external_registration_id) === String(updated.id));
        }

        // If individual player
        if (playersToSync.length === 0 && updated.player_name) {
          playersToSync = [{
            player_name: updated.player_name,
            college_roll_number: updated.player_roll_number || 'N/A',
            department: updated.department || updated.college_name,
            year: updated.year || 'I Year',
            gender: updated.gender || 'Boys',
            player_role: 'Captain'
          }];
        }

        for (const pl of playersToSync) {
          const memberObj = {
            id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            team_id: teamId,
            student_name: pl.player_name,
            register_number: pl.college_roll_number || 'EXT',
            department: pl.department || updated.college_name,
            year: pl.year || 'I Year',
            position: pl.player_role || 'Player',
            created_at: new Date().toISOString()
          };
          try { await supabase.from('team_members').upsert([memberObj]); } catch (e) {}
          try {
            const localMems = localStore.storeInstance.getTable('team_members') || [];
            localMems.push(memberObj);
            localStore.storeInstance.save();
          } catch (e) {}
        }
      } catch (syncErr) {
        console.warn('Notice: Error syncing approved external team to fixtures table:', syncErr.message);
      }
    }

    // Send Status Update Email to participant
    let emailSent = false;
    let emailError = null;

    if (updated.participant_email) {
      let subject = '';
      let emailHtml = '';

      const tName = updated.tournament_name || 'GASC Inter-College Sports Meet 2026';
      const cSport = updated.sport_name || updated.event_name || 'Sports Competition';

      if (status === 'APPROVED') {
        subject = 'GASC Inter-College Registration Approved';
        emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">
          <h2 style="color:#0f172a;margin-top:0;font-size:20px;border-bottom:2px solid #16a34a;padding-bottom:10px;">${COLLEGE_NAME}</h2>
          <p style="font-size:15px;color:#334155;">Dear Participant,</p>
          <p style="font-size:15px;color:#16a34a;font-weight:700;">Your registration has been approved.</p>
          <div style="background:#f8fafc;border-left:4px solid #16a34a;padding:14px 18px;margin:18px 0;line-height:1.7;">
            <div><strong>Tournament:</strong> ${tName}</div>
            <div><strong>Competition:</strong> ${cSport}</div>
            <div><strong>College:</strong> ${updated.college_name}</div>
            <div><strong>Registration ID:</strong> <span style="font-family:monospace;font-weight:700;color:#0f172a;">${updated.registration_id}</span></div>
            <div><strong>Status:</strong> <span style="background:#dcfce7;color:#166534;font-weight:700;padding:2px 8px;border-radius:4px;">APPROVED</span></div>
          </div>
          <p style="font-size:14px;color:#334155;line-height:1.6;">
            Please attend the competition on the scheduled date and venue. Ensure all athletes carry valid collegiate identity cards and bonafide letters.
          </p>
          <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#64748b;line-height:1.5;">
            Regards,<br/>
            <strong>Department of Physical Education and Sports</strong><br/>
            Government Arts and Science College, Idappadi - 637 101, Salem District
          </div>
        </div>`;
      } else if (status === 'REJECTED') {
        subject = 'GASC Inter-College Registration Rejected';
        emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">
          <h2 style="color:#0f172a;margin-top:0;font-size:20px;border-bottom:2px solid #dc2626;padding-bottom:10px;">${COLLEGE_NAME}</h2>
          <p style="font-size:15px;color:#334155;">Dear Participant,</p>
          <p style="font-size:15px;color:#dc2626;font-weight:700;">Your registration has been reviewed and rejected.</p>
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;margin:18px 0;line-height:1.7;">
            <div><strong>Tournament:</strong> ${tName}</div>
            <div><strong>Competition:</strong> ${cSport}</div>
            <div><strong>College:</strong> ${updated.college_name}</div>
            <div><strong>Registration ID:</strong> <span style="font-family:monospace;font-weight:700;">${updated.registration_id}</span></div>
            <div><strong>Status:</strong> <span style="background:#fee2e2;color:#991b1b;font-weight:700;padding:2px 8px;border-radius:4px;">REJECTED</span></div>
            <div style="margin-top:8px;"><strong>Rejection Reason:</strong> ${rejectionReason}</div>
          </div>
          <p style="font-size:14px;color:#334155;line-height:1.6;">
            If you have any questions or require clarification, please contact the Physical Education Department at sportsgascidappadi@gmail.com or +91 94432 18765.
          </p>
          <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#64748b;line-height:1.5;">
            Regards,<br/>
            <strong>Department of Physical Education and Sports</strong><br/>
            Government Arts and Science College, Idappadi
          </div>
        </div>`;
      } else if (status === 'CORRECTION_REQUIRED') {
        subject = 'Correction Required - Inter-College Registration';
        emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">
          <h2 style="color:#0f172a;margin-top:0;font-size:20px;border-bottom:2px solid #d97706;padding-bottom:10px;">${COLLEGE_NAME}</h2>
          <p style="font-size:15px;color:#334155;">Dear Participant,</p>
          <p style="font-size:15px;color:#d97706;font-weight:700;">Action Required: Corrections are needed for your registration before it can be approved.</p>
          <div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px 18px;margin:18px 0;line-height:1.7;">
            <div><strong>Tournament:</strong> ${tName}</div>
            <div><strong>Competition:</strong> ${cSport}</div>
            <div><strong>College:</strong> ${updated.college_name}</div>
            <div><strong>Registration ID:</strong> <span style="font-family:monospace;font-weight:700;">${updated.registration_id}</span></div>
            <div style="margin-top:8px;"><strong>Correction Instructions:</strong> ${correctionMessage}</div>
          </div>
          <p style="font-size:14px;color:#334155;line-height:1.6;">
            Please submit the revised details or documents by replying to this email or contacting the Sports Incharge promptly.
          </p>
          <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#64748b;line-height:1.5;">
            Regards,<br/>
            <strong>Department of Physical Education and Sports</strong><br/>
            Government Arts and Science College, Idappadi
          </div>
        </div>`;
      }

      if (subject) {
        try {
          await transporter.sendMail({
            from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
            to: updated.participant_email,
            subject,
            html: emailHtml
          });
          emailSent = true;

          // Log to notification_logs
          try {
            await supabase.from('notification_logs').insert({
              registration_id: updated.registration_id,
              email: updated.participant_email,
              notification_type: status,
              status: 'SENT',
              sent_at: new Date().toISOString()
            });
          } catch(e) {}
        } catch (mailErr) {
          console.warn('Status update email failed:', mailErr.message);
          emailError = mailErr.message;
          try {
            await supabase.from('notification_logs').insert({
              registration_id: updated.registration_id,
              email: updated.participant_email,
              notification_type: status,
              status: 'FAILED',
              error_message: mailErr.message,
              sent_at: new Date().toISOString()
            });
          } catch(e) {}
        }
      }
    }

    return res.json({
      success: true,
      message: `Registration marked as ${status} successfully!${emailSent ? ' Status email sent to participant.' : (emailError ? ' (Email notification could not be dispatched: ' + emailError + ')' : '')}`,
      status: updated.status,
      emailSent,
      emailError,
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

    // Check if tournament
    let updatedTournament = null;
    try {
      const { data } = await supabase
        .from('tournaments')
        .update({ registration_token: newToken })
        .eq('id', id)
        .select();
      if (data && data.length > 0) {
        updatedTournament = data[0];
      } else {
        const { data: d2 } = await supabase
          .from('tournaments')
          .update({ registration_token: newToken })
          .eq('registration_token', id)
          .select();
        if (d2 && d2.length > 0) updatedTournament = d2[0];
      }
    } catch (e) {
      console.warn('regenerateQrToken tournament update error:', e.message);
    }

    const localTournaments = localStore.storeInstance.getTable('tournaments') || [];
    const tIdx = localTournaments.findIndex(t => t.id === id || t.registration_token === id);
    if (tIdx >= 0) {
      localTournaments[tIdx].registration_token = newToken;
      localTournaments[tIdx].registrationToken = newToken;
      localStore.storeInstance.save();
      if (!updatedTournament) updatedTournament = localTournaments[tIdx];
    }

    if (updatedTournament) {
      return res.json({
        success: true,
        message: 'New Tournament QR Registration Token generated successfully! Previous QR is now invalid.',
        registrationToken: newToken,
        tournament: updatedTournament
      });
    }

    // Check if competition
    let updated = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .update({ registration_token: newToken })
        .eq('id', id)
        .select();
      if (data && data.length > 0) updated = data[0];
    } catch (e) {
      console.warn('regenerateQrToken competition update error:', e.message);
    }

    const comps = localStore.storeInstance.getTable('competitions') || [];
    const idx = comps.findIndex(c => c.id === id);
    if (idx >= 0) {
      comps[idx].registration_token = newToken;
      comps[idx].registrationToken = newToken;
      localStore.storeInstance.save();
      if (!updated) updated = comps[idx];
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Tournament or competition not found.' });

    return res.json({
      success: true,
      message: 'New QR Registration Token generated successfully! Previous QR is now invalid.',
      registrationToken: newToken,
      competition: updated
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

    // Check if tournament
    let updatedTournament = null;
    try {
      const { data } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', id)
        .select();
      if (data && data.length > 0) {
        updatedTournament = data[0];
      } else {
        const { data: d2 } = await supabase
          .from('tournaments')
          .update(updates)
          .eq('registration_token', id)
          .select();
        if (d2 && d2.length > 0) updatedTournament = d2[0];
      }
    } catch (e) {
      console.warn('toggleRegistration tournament update error:', e.message);
    }

    const localTournaments = localStore.storeInstance.getTable('tournaments') || [];
    const tIdx = localTournaments.findIndex(t => t.id === id || t.registration_token === id);
    if (tIdx >= 0) {
      localTournaments[tIdx].external_registration_enabled = enabled;
      localTournaments[tIdx].status = newStatus;
      localStore.storeInstance.save();
      if (!updatedTournament) updatedTournament = localTournaments[tIdx];
    }

    if (updatedTournament) {
      return res.json({
        success: true,
        message: `Tournament registration ${enabled ? 'ENABLED' : 'DISABLED'} successfully!`,
        status: newStatus,
        externalRegistrationEnabled: enabled,
        tournament: updatedTournament
      });
    }

    // Check if competition
    let updated = null;
    try {
      const { data } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', id)
        .select();
      if (data && data.length > 0) updated = data[0];
    } catch (e) {
      console.warn('toggleRegistration competition update error:', e.message);
    }

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
      message: `Registration ${enabled ? 'ENABLED' : 'DISABLED'} successfully!`,
      status: newStatus,
      externalRegistrationEnabled: enabled,
      competition: updated
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
    if (!clientOrigin || clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1')) {
      if (process.env.PUBLIC_STUDENT_PORTAL_URL) {
        clientOrigin = process.env.PUBLIC_STUDENT_PORTAL_URL;
      } else {
        // Default to live public production portal so mobile phones can reach it anywhere!
        clientOrigin = 'https://gasc-idappadi-sports.vercel.app';
      }
    }
    clientOrigin = clientOrigin.replace(/\/+$/, '');
    const targetPath = req.query.path || `/open-registration/${token}`;
    const registrationUrl = `${clientOrigin}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;

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
      publicPortalUrl: process.env.PUBLIC_STUDENT_PORTAL_URL || 'https://gasc-idappadi-sports.vercel.app',
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
    let allComps = [];
    try {
      const { data } = await supabase.from('competitions').select('*');
      if (data && Array.isArray(data)) allComps = [...data];
    } catch (e) {}

    const localComps = localStore.storeInstance.getTable('competitions') || [];
    localComps.forEach(lc => {
      if (!allComps.some(c => String(c.id) === String(lc.id))) {
        allComps.push(lc);
      }
    });

    try {
      const sqliteComps = localDB.query('SELECT * FROM competitions');
      if (sqliteComps && Array.isArray(sqliteComps)) {
        sqliteComps.forEach(sc => {
          if (!allComps.some(c => String(c.id) === String(sc.id))) {
            allComps.push(sc);
          }
        });
      }
    } catch (e) {}

    allComps = allComps.map(c => {
      if (!c.registration_token && !c.registrationToken) {
        c.registration_token = crypto.createHash('md5').update(String(c.id || c.name)).digest('hex');
      }
      return c;
    });

    let interComps = allComps.filter(c => 
      c.participation_type === 'INTER_COLLEGE' || 
      c.participationType === 'INTER_COLLEGE' ||
      (c.type && c.type.toLowerCase().includes('inter-college'))
    );

    if (interComps.length === 0) interComps = allComps;

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
    let allComps = [];
    try {
      const { data } = await supabase.from('competitions').select('*');
      if (data && Array.isArray(data)) allComps = [...data];
    } catch (e) {}

    const localComps = localStore.storeInstance.getTable('competitions') || [];
    localComps.forEach(lc => {
      if (!allComps.some(c => String(c.id) === String(lc.id))) {
        allComps.push(lc);
      }
    });

    try {
      const sqliteComps = localDB.query('SELECT * FROM competitions');
      if (sqliteComps && Array.isArray(sqliteComps)) {
        sqliteComps.forEach(sc => {
          if (!allComps.some(c => String(c.id) === String(sc.id))) {
            allComps.push(sc);
          }
        });
      }
    } catch (e) {}

    allComps = allComps.map(c => {
      if (!c.registration_token && !c.registrationToken) {
        c.registration_token = crypto.createHash('md5').update(String(c.id || c.name)).digest('hex');
      }
      return c;
    });

    let interComps = allComps.filter(c => 
      c.participation_type === 'INTER_COLLEGE' || 
      c.participationType === 'INTER_COLLEGE' ||
      (c.type && c.type.toLowerCase().includes('inter-college'))
    );

    // If no specific inter-college tagged, provide all competitions so user never sees 0
    if (interComps.length === 0) {
      interComps = allComps;
    }

    let regs = [];
    try {
      const { data } = await supabase.from('external_registrations').select('*').order('created_at', { ascending: false });
      if (data && Array.isArray(data)) regs = [...data];
    } catch (e) {}

    const localRegs = localStore.storeInstance.getTable('external_registrations') || [];
    localRegs.forEach(lr => {
      if (!regs.some(r => String(r.id) === String(lr.id) || String(r.registration_id) === String(lr.registration_id))) {
        regs.push(lr);
      }
    });

    let allPlayers = [];
    try {
      const { data } = await supabase.from('external_registration_players').select('*');
      if (data && Array.isArray(data)) allPlayers = [...data];
    } catch (e) {}

    const localPlayers = localStore.storeInstance.getTable('external_registration_players') || [];
    localPlayers.forEach(lp => {
      if (!allPlayers.some(p => String(p.id) === String(lp.id))) {
        allPlayers.push(lp);
      }
    });

    regs = regs.map(r => enrichRegistrationWithPayment({
      ...r,
      players: allPlayers.filter(p => String(p.external_registration_id) === String(r.id))
    }));

    return res.json({
      success: true,
      competitions: interComps,
      allCompetitions: allComps,
      registrations: regs,
      totalComps: interComps.length,
      totalRegs: regs.length,
      pendingCount: regs.filter(r => (r.status || '').toUpperCase() === 'PENDING').length
    });
  } catch (err) {
    console.error('getAdminAllData error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// PUBLIC: GET ALL INTER-COLLEGE TOURNAMENTS
// =========================================================================
exports.getPublicTournaments = async (req, res) => {
  try {
    let tournaments = [];
    try {
      const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) tournaments = data;
    } catch (e) {}

    let competitions = [];
    try {
      const { data: compData } = await supabase.from('competitions').select('*');
      if (Array.isArray(compData)) competitions = compData;
    } catch (e) {}

    // Fallback to localStore
    if (tournaments.length === 0) {
      tournaments = localStore.storeInstance.getTable('tournaments') || [];
    }
    if (competitions.length === 0) {
      competitions = localStore.storeInstance.getTable('competitions') || [];
    }

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

    // Also scan competitions for any Inter-College tournaments
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

    return res.json({
      success: true,
      tournaments: list,
      count: list.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// PUBLIC: GET TOURNAMENT & ALL CHILD COMPETITIONS BY TOKEN
// =========================================================================
exports.getTournamentByToken = async (req, res) => {
  try {
    const token = req.params.token || req.query.token || req.query.id;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Tournament token is required.' });
    }

    const cleanToken = token.trim();
    const lowerToken = cleanToken.toLowerCase();

    // 1. Fetch exactly ONE tournament using the validated QR token from actual Supabase DB
    const { data: tList, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .or(`registration_token.eq.${cleanToken},id.eq.${cleanToken}`)
      .limit(5);

    let tournament = (Array.isArray(tList) && tList.length > 0) ? tList[0] : null;

    if (!tournament && Array.isArray(tList)) {
      tournament = tList.find(t =>
        (t.registration_token && t.registration_token.toLowerCase() === lowerToken) ||
        (t.id && t.id.toLowerCase() === lowerToken)
      );
    }

    // LocalStore fallback if offline
    if (!tournament) {
      const localTournaments = localStore.storeInstance.getTable('tournaments') || [];
      tournament = localTournaments.find(t =>
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

    // LocalStore fallback if offline
    if (childComps.length === 0) {
      const localComps = localStore.storeInstance.getTable('competitions') || [];
      childComps = localComps.filter(c => c.tournament_id === tournament.id || (tournament.name && c.tournament_name === tournament.name));
    }

    const mappedCompetitions = childComps.map(c => {
      let extra = {};
      if (c.rules && typeof c.rules === 'string') {
        try { extra = JSON.parse(c.rules); } catch (e) {}
      }

      const sportName = c.sport_name || c.name || 'Athletics';
      const defaultRules = exports.getSportRules(sportName);

      const mode = (extra.competitionMode || c.competition_mode || (c.type === 'Team' ? 'TEAM' : defaultRules.mode)).toUpperCase();
      const requiredPlayers = Number(extra.requiredPlayers || c.required_players || defaultRules.requiredPlayers);
      const substitutes = Number(extra.substitutes !== undefined ? extra.substitutes : (c.substitutes !== undefined ? c.substitutes : defaultRules.substitutes));
      const maxPlayers = Number(extra.maxPlayers || c.max_players || defaultRules.maxPlayers);

      // Compute status
      const now = new Date();
      let status = 'OPEN';
      const cStatus = (c.status || '').toLowerCase();
      const tStatus = (tournament.status || '').toLowerCase();

      if (tStatus === 'completed' || cStatus === 'completed') status = 'COMPLETED';
      else if (tStatus === 'cancelled' || cStatus === 'cancelled') status = 'CANCELLED';
      else if (c.registration_start && now < new Date(c.registration_start)) status = 'UPCOMING';
      else {
        const deadline = c.registration_end || c.registration_deadline || tournament.end_date || c.date;
        if (deadline && now > new Date(deadline)) status = 'CLOSED';
        else if (cStatus === 'draft' || tStatus === 'draft') status = 'UPCOMING';
        else if (cStatus === 'registration closed' || cStatus === 'closed' || tStatus === 'registration_closed') status = 'CLOSED';
        else {
          const max = c.max_participants || c.max_teams || c.max_colleges;
          const current = c.current_registrations || 0;
          if (max && current >= max) status = 'FULL';
          else status = 'OPEN';
        }
      }

      return {
        id: c.id,
        name: c.name || sportName,
        tournamentName: tournament.tournament_name || tournament.name || 'Inter-College Tournament',
        tournamentId: tournament.id,
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
        status,
        description: c.description || '',
        bannerImage: c.banner_image || tournament.banner_image || '/images/sports/tournament.png',
        rules: c.rules || tournament.rules || '',
        contactPerson: extra.contactPerson || tournament.contact_person || 'Dr. R. ANITHA (Physical Director)',
        contactPhone: extra.contactPhone || tournament.contact_phone || '+91 94432 18765',
        contactEmail: extra.contactEmail || tournament.contact_email || 'sportsgascidappadi@gmail.com',
        registrationToken: c.registration_token || c.id
      };
    });

    return res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.tournament_name || tournament.name || 'Inter-College Tournament',
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
      competitions: mappedCompetitions,
      activeCompetitionId: null
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: DELETE COMPETITION ──
exports.deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Competition ID is required.' });
    }

    // 1. Delete associated registrations
    try {
      await supabase.from('external_registrations').delete().eq('competition_id', id);
    } catch (e) {}
    try {
      await supabase.from('competition_registrations').delete().eq('competition_id', id);
    } catch (e) {}

    // 2. Delete competition in Supabase
    try {
      await supabase.from('competitions').delete().eq('id', id);
    } catch (e) {}

    // 3. Delete in localStore
    try {
      const localStore = require('../data/localStore');
      const table = localStore.storeInstance.getTable('competitions') || [];
      const remaining = table.filter(c => String(c.id) !== String(id) && String(c._id) !== String(id));
      localStore.storeInstance.db['competitions'] = remaining;
      localStore.storeInstance.save();
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Competition deleted successfully.',
      deletedId: id
    });
  } catch (err) {
    console.error('deleteCompetition error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// 10. DYNAMIC GPAY / UPI PAYMENT SETTINGS & VERIFICATION MODULE
// =========================================================================

const DEFAULT_PAYMENT_CONFIG = {
  id: 'default',
  receiver_name: 'Dr. R. ANITHA (Physical Director) / GASC Sports Account',
  gpay_number: '9443218765',
  upi_id: 'sportsgasc@sbi',
  qr_code_url: '',
  payment_mode: 'MANUAL_UPI', // 'MANUAL_UPI' | 'GATEWAY' | 'BOTH'
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

/**
 * Internal Helper: Get latest active payment configuration
 * Checks Supabase payment_settings, admin_settings fallback, local SQLite, and localStore.
 */
async function fetchCurrentPaymentConfig() {
  let config = null;

  // 1. Try Supabase payment_settings table
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (!error && data) config = data;
  } catch (e) {}

  // 2. Try Supabase admin_settings table (generic key-value fallback)
  if (!config) {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 'payment_config')
        .maybeSingle();
      if (!error && data && data.value) {
        config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      }
    } catch (e) {}
  }

  // 3. Try local SQLite
  if (!config) {
    try {
      const rows = localDB.query("SELECT * FROM payment_settings WHERE id = 'default' LIMIT 1");
      if (rows && rows.length > 0) {
        config = rows[0];
        if (config.is_active !== undefined) config.is_active = Boolean(config.is_active);
      }
    } catch (e) {}
  }

  // 4. Try localStore
  if (!config) {
    const table = localStore.storeInstance.getTable('payment_settings') || [];
    config = table.find(p => p.id === 'default');
  }

  // Fallback to default
  if (!config) {
    config = { ...DEFAULT_PAYMENT_CONFIG };
  }

  // Ensure config_version is a number
  config.config_version = Number(config.config_version || 1);
  return config;
}

/**
 * PUBLIC: Fetch current active payment details for student registration
 * Returns only public fields needed for payment.
 */
exports.getPublicPaymentSettings = async (req, res) => {
  try {
    const config = await fetchCurrentPaymentConfig();

    // Check validity window if configured
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

    // Generate dynamic QR code if custom QR is not provided
    let qrUrl = config.qr_code_url || '';
    if (!qrUrl && config.upi_id) {
      try {
        const upiUri = `upi://pay?pa=${encodeURIComponent(config.upi_id)}&pn=${encodeURIComponent(config.receiver_name || 'GASC Sports')}&cu=INR`;
        qrUrl = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
      } catch (qrErr) {
        console.warn('QRCode generation fallback:', qrErr.message);
      }
    }

    return res.json({
      success: true,
      settings: {
        receiverName: config.receiver_name || 'Physical Director, GASC',
        gpayNumber: config.gpay_number || '',
        upiId: config.upi_id || '',
        qrCodeUrl: qrUrl,
        instructions: config.payment_instructions || DEFAULT_PAYMENT_CONFIG.payment_instructions,
        paymentMode: config.payment_mode || 'MANUAL_UPI',
        isEnabled: isEnabled,
        teamFee: Number(config.team_fee || 500),
        individualFee: Number(config.individual_fee || 100),
        configVersion: config.config_version || 1,
        validFrom: config.valid_from || null,
        validUntil: config.valid_until || null
      }
    });
  } catch (err) {
    console.error('getPublicPaymentSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Get full payment settings including audit history
 */
exports.getAdminPaymentSettings = async (req, res) => {
  try {
    const config = await fetchCurrentPaymentConfig();

    // Fetch history
    let history = [];
    try {
      const { data, error } = await supabase
        .from('payment_settings_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) history = data;
    } catch (e) {}

    if (history.length === 0) {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'payment_history')
          .maybeSingle();
        if (data && data.value) {
          history = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        }
      } catch (e) {}
    }

    if (history.length === 0) {
      try {
        const rows = localDB.query('SELECT * FROM payment_settings_history ORDER BY created_at DESC LIMIT 20');
        if (rows && rows.length > 0) history = rows;
      } catch (e) {}
    }

    // Auto-generate standard QR if none exists
    let qrPreview = config.qr_code_url || '';
    if (!qrPreview && config.upi_id) {
      try {
        const upiUri = `upi://pay?pa=${encodeURIComponent(config.upi_id)}&pn=${encodeURIComponent(config.receiver_name || 'GASC Sports')}&cu=INR`;
        qrPreview = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
      } catch (e) {}
    }

    return res.json({
      success: true,
      config: {
        id: config.id || 'default',
        receiverName: config.receiver_name,
        gpayNumber: config.gpay_number,
        upiId: config.upi_id,
        qrCodeUrl: config.qr_code_url || '',
        qrPreview: qrPreview,
        paymentMode: config.payment_mode || 'MANUAL_UPI',
        isActive: Boolean(config.is_active),
        instructions: config.payment_instructions,
        teamFee: Number(config.team_fee || 500),
        individualFee: Number(config.individual_fee || 100),
        validFrom: config.valid_from,
        validUntil: config.valid_until,
        configVersion: config.config_version,
        updatedBy: config.updated_by || 'Admin',
        updatedAt: config.updated_at || config.created_at
      },
      history: history.map(toCamelCase)
    });
  } catch (err) {
    console.error('getAdminPaymentSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Save and publish new payment settings
 * Validates GPay phone number and UPI ID strictly.
 * Creates audit log and increments config_version.
 */
exports.savePaymentSettings = async (req, res) => {
  try {
    const {
      receiverName,
      gpayNumber,
      upiId,
      qrCodeUrl,
      paymentMode,
      isActive,
      instructions,
      teamFee,
      individualFee,
      validFrom,
      validUntil,
      updatedBy
    } = req.body;

    // 1. Validation
    if (!receiverName || !receiverName.trim()) {
      return res.status(400).json({ success: false, message: 'Payment receiver name is required.' });
    }

    // Clean and validate Phone number (10 digits Indian format)
    const cleanPhone = (gpayNumber || '').replace(/[\s\-\+]/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GPay mobile number. Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      });
    }

    // Validate UPI ID format: username@bank
    const cleanUpi = (upiId || '').trim().toLowerCase();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;
    if (!upiRegex.test(cleanUpi)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. Must follow standard UPI VPA pattern like "username@bank" or "mobile@upi". Do not enter only a phone number.'
      });
    }

    // 2. Fetch current config to check old values for audit
    const prevConfig = await fetchCurrentPaymentConfig();
    const newVersion = (prevConfig.config_version || 1) + 1;
    const adminUser = updatedBy || req.user?.name || req.user?.email || 'Sports Incharge Admin';
    const nowIso = new Date().toISOString();

    const newConfigRecord = {
      id: 'default',
      receiver_name: receiverName.trim(),
      gpay_number: cleanPhone,
      upi_id: cleanUpi,
      qr_code_url: qrCodeUrl || '',
      payment_mode: paymentMode || 'MANUAL_UPI',
      is_active: isActive !== undefined ? Boolean(isActive) : true,
      payment_instructions: instructions || DEFAULT_PAYMENT_CONFIG.payment_instructions,
      team_fee: teamFee !== undefined ? Number(teamFee) : 500,
      individual_fee: individualFee !== undefined ? Number(individualFee) : 100,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      config_version: newVersion,
      updated_by: adminUser,
      updated_at: nowIso
    };

    // 3. Save to Supabase payment_settings table
    try {
      await supabase
        .from('payment_settings')
        .upsert(newConfigRecord, { onConflict: 'id' });
    } catch (e) {
      console.warn('payment_settings upsert note:', e.message);
    }

    // Dual-write to Supabase admin_settings table (guaranteed fallback table)
    try {
      await supabase
        .from('admin_settings')
        .upsert({
          id: 'payment_config',
          value: newConfigRecord,
          updated_at: nowIso
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn('admin_settings payment_config upsert note:', e.message);
    }

    // 4. Save to local SQLite
    try {
      localDB.run(
        `INSERT OR REPLACE INTO payment_settings (id, receiver_name, gpay_number, upi_id, qr_code_url, payment_mode, is_active, payment_instructions, team_fee, individual_fee, valid_from, valid_until, config_version, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          newConfigRecord.id,
          newConfigRecord.receiver_name,
          newConfigRecord.gpay_number,
          newConfigRecord.upi_id,
          newConfigRecord.qr_code_url,
          newConfigRecord.payment_mode,
          newConfigRecord.is_active ? 1 : 0,
          newConfigRecord.payment_instructions,
          newConfigRecord.team_fee,
          newConfigRecord.individual_fee,
          newConfigRecord.valid_from,
          newConfigRecord.valid_until,
          newConfigRecord.config_version,
          newConfigRecord.updated_by,
          newConfigRecord.updated_at
        ]
      );
      localDB.saveDB();
    } catch (e) {}

    // 5. Save to localStore
    try {
      const table = localStore.storeInstance.getTable('payment_settings') || [];
      const idx = table.findIndex(p => p.id === 'default');
      if (idx >= 0) table[idx] = newConfigRecord;
      else table.push(newConfigRecord);
      localStore.storeInstance.save();
    } catch (e) {}

    // 6. Record Audit History
    const historyItem = {
      id: `psh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      config_version: newVersion,
      receiver_name: newConfigRecord.receiver_name,
      gpay_number: newConfigRecord.gpay_number,
      upi_id: newConfigRecord.upi_id,
      qr_code_url: newConfigRecord.qr_code_url,
      payment_mode: newConfigRecord.payment_mode,
      is_active: newConfigRecord.is_active,
      team_fee: newConfigRecord.team_fee,
      individual_fee: newConfigRecord.individual_fee,
      updated_by: adminUser,
      change_summary: `Updated payment details to ${newConfigRecord.upi_id} / ${newConfigRecord.gpay_number}`,
      created_at: nowIso
    };

    try {
      await supabase.from('payment_settings_history').insert(historyItem);
    } catch (e) {}

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

    try {
      localDB.run(
        `INSERT OR REPLACE INTO payment_settings_history (id, config_version, receiver_name, gpay_number, upi_id, qr_code_url, payment_mode, is_active, team_fee, individual_fee, updated_by, change_summary, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          historyItem.id,
          historyItem.config_version,
          historyItem.receiver_name,
          historyItem.gpay_number,
          historyItem.upi_id,
          historyItem.qr_code_url,
          historyItem.payment_mode,
          historyItem.is_active ? 1 : 0,
          historyItem.team_fee,
          historyItem.individual_fee,
          historyItem.updated_by,
          historyItem.change_summary,
          historyItem.created_at
        ]
      );
      localDB.saveDB();
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Payment settings successfully updated and published!',
      config: toCamelCase(newConfigRecord)
    });
  } catch (err) {
    console.error('savePaymentSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ADMIN: Verify and reconcile a manual UPI registration payment
 * Marks payment as VERIFIED and registration status as APPROVED/CONFIRMED.
 */
exports.verifyRegistrationPayment = async (req, res) => {
  try {
    const { registrationId, paymentStatus, remarks } = req.body;
    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required.' });
    }

    const verifiedBy = req.user?.name || req.user?.email || 'Sports Admin';
    const nowIso = new Date().toISOString();
    const newPaymentStatus = (paymentStatus || 'VERIFIED').toUpperCase();
    const newRegStatus = newPaymentStatus === 'VERIFIED' ? 'APPROVED' : (newPaymentStatus === 'REJECTED' ? 'REJECTED' : 'PENDING');

    // 1. Fetch current registration
    let reg = null;
    try {
      const { data } = await supabase
        .from('external_registrations')
        .select('*')
        .or(`id.eq.${registrationId},registration_id.eq.${registrationId}`)
        .maybeSingle();
      if (data) reg = data;
    } catch (e) {}

    if (!reg) {
      const localList = localStore.storeInstance.getTable('external_registrations') || [];
      reg = localList.find(r => r.id === registrationId || r.registration_id === registrationId);
    }

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    // Build serialized remarks payload
    let existingRemarksObj = {};
    if (reg.remarks && typeof reg.remarks === 'string' && reg.remarks.startsWith('{')) {
      try { existingRemarksObj = JSON.parse(reg.remarks); } catch (e) {}
    }

    const updatedRemarksPayload = {
      ...existingRemarksObj,
      payment_status: newPaymentStatus,
      payment_verified_by: verifiedBy,
      payment_verified_at: nowIso,
      payment_remarks: remarks || existingRemarksObj.payment_remarks || ''
    };

    const updatePayload = {
      status: newRegStatus,
      payment_status: newPaymentStatus,
      payment_verified_by: verifiedBy,
      payment_verified_at: nowIso,
      payment_remarks: remarks || null,
      remarks: JSON.stringify(updatedRemarksPayload),
      updated_at: nowIso
    };

    // Update Supabase
    try {
      await supabase
        .from('external_registrations')
        .update(updatePayload)
        .eq('id', reg.id);
    } catch (e) {
      // Fallback if specific payment columns are not created in Supabase yet
      try {
        await supabase
          .from('external_registrations')
          .update({
            status: newRegStatus,
            remarks: JSON.stringify(updatedRemarksPayload),
            updated_at: nowIso
          })
          .eq('id', reg.id);
      } catch (err2) {}
    }

    // Update localStore
    try {
      const localList = localStore.storeInstance.getTable('external_registrations') || [];
      const item = localList.find(r => r.id === reg.id || r.registration_id === reg.registration_id);
      if (item) {
        Object.assign(item, updatePayload);
        localStore.storeInstance.save();
      }
    } catch (e) {}

    // Update SQLite
    try {
      localDB.run(
        `UPDATE external_registrations SET status = ?, payment_status = ?, payment_verified_by = ?, payment_verified_at = ?, payment_remarks = ?, updated_at = strftime('%s','now') WHERE id = ? OR registration_id = ?`,
        [newRegStatus, newPaymentStatus, verifiedBy, nowIso, remarks || '', reg.id, reg.registration_id]
      );
      localDB.saveDB();
    } catch (e) {}

    // Send confirmation email to student
    try {
      const targetEmail = reg.participant_email || reg.college_email;
      if (targetEmail && targetEmail.includes('@')) {
        const isVerified = newPaymentStatus === 'VERIFIED';
        await transporter.sendMail({
          from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
          to: targetEmail,
          subject: isVerified
            ? `[GASC Sports] Payment Verified & Registration Approved: ${reg.registration_id}`
            : `[GASC Sports] Payment Update for Registration: ${reg.registration_id}`,
          text: isVerified
            ? `Your payment has been successfully verified by the sports department. Your registration ${reg.registration_id} is now APPROVED.`
            : `Payment status update for ${reg.registration_id}: ${newPaymentStatus}. Remarks: ${remarks || 'None'}`,
          html: `
            <div style="font-family:sans-serif;padding:20px;color:#0f172a;">
              <h2 style="color:${isVerified ? '#16a34a' : '#dc2626'};">${isVerified ? '✅ Payment Verified & Approved' : '⚠️ Payment Status Update'}</h2>
              <p>Registration ID: <strong>${reg.registration_id}</strong></p>
              <p>College: <strong>${reg.college_name}</strong></p>
              <p>Competition: <strong>${reg.sport_name || 'Sports Competition'}</strong></p>
              <p>Payment Status: <strong>${newPaymentStatus}</strong></p>
              <p>Verified By: <strong>${verifiedBy}</strong> on ${new Date(nowIso).toLocaleString('en-IN')}</p>
              ${remarks ? `<p>Admin Remarks: <em>${remarks}</em></p>` : ''}
              <p style="margin-top:20px;font-size:12px;color:#64748b;">Government Arts and Science College, Idappadi.</p>
            </div>
          `
        });
      }
    } catch (mailErr) {
      console.warn('verifyRegistrationPayment mail exception:', mailErr.message);
    }

    return res.json({
      success: true,
      message: `Payment status updated to ${newPaymentStatus} successfully.`,
      registrationId: reg.registration_id,
      paymentStatus: newPaymentStatus,
      status: newRegStatus
    });
  } catch (err) {
    console.error('verifyRegistrationPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
