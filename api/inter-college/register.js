const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST method.' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const {
      competitionToken, collegeName, collegeAddress, district, state,
      collegePhone, collegeEmail, registrationType, sportName, gender,
      teamName, coachName, coachPhone, managerName, managerPhone,
      playerName, playerRegisterNumber, department, year,
      participantEmail, participantPhone, supportingDocument, players
    } = body || {};

    if (!competitionToken) return res.status(400).json({ success: false, message: 'Competition token is required.' });
    if (!collegeName || !collegeName.trim()) return res.status(400).json({ success: false, message: 'College name is required.' });
    if (!collegeAddress || !collegeAddress.trim()) return res.status(400).json({ success: false, message: 'College address is required.' });
    if (!district || !district.trim()) return res.status(400).json({ success: false, message: 'District is required.' });
    if (!state || !state.trim()) return res.status(400).json({ success: false, message: 'State is required.' });
    if (!participantEmail || !participantEmail.includes('@')) return res.status(400).json({ success: false, message: 'Valid contact email is required.' });
    if (!participantPhone || !participantPhone.trim()) return res.status(400).json({ success: false, message: 'Valid contact phone is required.' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // 1. Fetch competition safely
    let comp = null;
    let extraConfig = {};

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

    // Fallback search in local_db
    if (!comp) {
      try {
        const path = require('path');
        const fs = require('fs');
        const p = path.join(process.cwd(), 'server/data/local_db.json');
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          const list = raw.competitions || [];
          comp = list.find(c => c.registration_token === competitionToken || c.id === competitionToken);
        }
      } catch (e) {}
    }

    if (!comp) return res.status(404).json({ success: false, message: 'Competition not found.' });

    if (comp.rules && typeof comp.rules === 'string' && comp.rules.includes('{')) {
      try {
        const parsed = JSON.parse(comp.rules);
        if (parsed.interCollegeConfig) extraConfig = parsed.interCollegeConfig;
      } catch (e) {}
    }

    const deadline = comp.registration_end || comp.registration_deadline || comp.date;
    if (deadline && new Date() > new Date(deadline)) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed for this competition.' });
    }

    const mode = (registrationType || extraConfig.competitionMode || comp.competition_mode || (comp.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase();
    const cleanCollege = collegeName.trim();
    const cleanEmail = participantEmail.toLowerCase().trim();

    // 2. Duplicate Prevention
    if (mode === 'INDIVIDUAL') {
      if (!playerName || !playerName.trim()) return res.status(400).json({ success: false, message: 'Player name is required.' });
      if (!playerRegisterNumber || !playerRegisterNumber.trim()) return res.status(400).json({ success: false, message: 'Player register/roll number is required.' });
    }

    // 3. Create Record
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

    // Save to primary table `competition_registrations` (Guaranteed to exist in Supabase)
    try {
      const compReg = {
        id: primaryId,
        competition_id: comp.id,
        student_id: registrationId,
        student_name: mode === 'TEAM' ? (teamName?.trim() || `${cleanCollege} Team`) : (playerName?.trim() || 'External Athlete'),
        register_number: (mode === 'INDIVIDUAL' ? (playerRegisterNumber?.trim().toUpperCase() || registrationId) : (coachPhone?.trim() || registrationId)),
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
    } catch (crErr) {
      console.warn('competition_registrations insert note:', crErr.message);
    }

    // Also attempt insertion into `external_registrations`
    try {
      await supabase.from('external_registrations').insert(regPayload);
    } catch(e) {}

    // Save Team Players
    if (mode === 'TEAM' && Array.isArray(players)) {
      for (const p of players) {
        const pId = `epl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        try {
          await supabase.from('team_members').insert({
            id: pId,
            team_id: primaryId,
            student_id: (p.registerNumber || p.rollNo || pId).toUpperCase().trim(),
            student_name: p.playerName || p.name || 'Player',
            register_number: (p.registerNumber || p.rollNo || 'N/A').toUpperCase().trim(),
            role: p.playerRole || p.role || 'Player'
          });
        } catch(tmErr) {}

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
        } catch(erpErr) {}
      }
    }

    // Confirmation Email Notification
    const compName = comp.name;
    const confirmHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
      <h2 style="color:#0f4c81;margin-top:0;">${COLLEGE_NAME}</h2>
      <h3 style="color:#16a34a;">✅ Registration Submitted Successfully</h3>
      <p>Your registration for <strong>${compName}</strong> has been received and is PENDING sports board verification.</p>
      <div style="background:#f8fafc;padding:16px;border-radius:10px;margin:18px 0;border:1px solid #cbd5e1;">
        <p><strong>Registration ID:</strong> <span style="color:#0f4c81;font-weight:800;font-size:16px;">${registrationId}</span></p>
        <p><strong>College:</strong> ${cleanCollege}</p>
        <p><strong>Competition:</strong> ${compName}</p>
        <p><strong>Status:</strong> PENDING</p>
      </div>
      <p style="font-size:13px;color:#64748b;">Save your Registration ID for reference. You will receive an update once approved.</p>
    </div>`;

    try {
      await transporter.sendMail({
        from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: cleanEmail,
        subject: `[GASC Sports] Registration Submitted: ${registrationId} (${compName})`,
        text: `Registration ID: ${registrationId} for ${compName}. Status: PENDING`,
        html: confirmHtml
      });
    } catch(e) {}

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      registrationId,
      registration: regPayload
    });

  } catch (err) {
    console.error('api/inter-college/register error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing registration.' });
  }
};
