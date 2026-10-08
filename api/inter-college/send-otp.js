const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

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

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user.slice(-1)}@${domain}`;
}

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

    // Store in Supabase
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      await supabase.from('external_otps').insert({
        id: `eotp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        otp_code: otp,
        competition_id: competitionToken || null,
        expires_at: new Date(expiryTime).toISOString(),
        verified: false
      });
    } catch(e) {}

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
        html
      });
    } catch(mErr) {
      console.warn('Mail send warning:', mErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}. Check your Inbox and Spam folder.`,
      maskedEmail: maskEmail(cleanEmail),
      otpToken,
      expiryMinutes
    });

  } catch (err) {
    console.error('api/inter-college/send-otp error:', err);
    return res.status(500).json({ success: false, message: 'Server error sending verification OTP.' });
  }
};
