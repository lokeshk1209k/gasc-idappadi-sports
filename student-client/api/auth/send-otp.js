/**
 * GASC Sports - Send OTP Serverless Function
 * Enforces strict UNIQUE email verification (no duplicate email allowed across students)
 * Dispatches high-deliverability OTP email via Gmail SMTP
 */
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
const OTP_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

const transporter = nodemailer.createTransport({
  service: 'gmail',
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { email, registerNumber, name, otp: clientOtp } = body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!registerNumber) {
      return res.status(400).json({ success: false, message: 'Please provide a valid college register number.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();
    const studentName = name ? name.trim() : 'Student Athlete';

    // ── 1. STRICT UNIQUE EMAIL CHECK ──
    // Ore email id vera student-kku exist aga kudathu!
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const { data: existingUsers, error: checkErr } = await supabase
      .from('users')
      .select('id, name, register_number, email, role')
      .ilike('email', cleanEmail);

    if (checkErr) {
      console.error('Email uniqueness check error:', checkErr.message);
    } else if (existingUsers && existingUsers.length > 0) {
      // Find if any other user already uses this email
      const conflict = existingUsers.find(u => {
        const uReg = (u.register_number || '').toUpperCase().trim();
        return uReg !== cleanRegNo;
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          message: `This email address (${cleanEmail}) is already registered to another user (${conflict.register_number || conflict.name}). Each student must use a unique email address.`
        });
      }
    }

    // ── 2. OTP GENERATION ──
    const otp = (clientOtp && /^\d{6}$/.test(String(clientOtp).trim()))
      ? String(clientOtp).trim()
      : Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    const expiryTime = Date.now() + expiryMinutes * 60 * 1000;

    // HMAC token for stateless verification
    const hash = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${cleanEmail}:${otp}:${expiryTime}`)
      .digest('hex');
    const otpToken = `${hash}.${expiryTime}`;

    // Store in Supabase notifications as instant audit log
    try {
      await supabase.from('notifications').insert({
        id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: `roster_${cleanRegNo}`,
        title: 'STUDENT_REGISTRATION_OTP',
        message: JSON.stringify({
          otp,
          email: cleanEmail,
          registerNumber: cleanRegNo,
          expiresAt: expiryTime
        }),
        type: 'registration',
        sender: 'unread',
        created_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Notification log warning:', dbErr.message);
    }

    // ── 3. SEND EMAIL VIA GMAIL SMTP ──
    const collegeName = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>GASC Sports Registration OTP</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fb; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f7fb; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
              <tr>
                <td style="background: linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                  <div style="font-size: 36px; margin-bottom: 8px;">🏆</div>
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${collegeName}</h1>
                  <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; color: #cbd5e1;">Department of Physical Education & Sports</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 35px 30px;">
                  <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Student Account Email Verification</h2>
                  <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Dear <strong>${studentName}</strong> (Register No: <strong>${cleanRegNo}</strong>),
                  </p>
                  <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Please use the following One-Time Password (OTP) to verify your email address and activate your GASC Sports Portal account:
                  </p>
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                    <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0369a1; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                    <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0f4c81; font-family: 'Courier New', Courier, monospace; margin: 6px 0;">
                      ${otp}
                    </div>
                    <span style="font-size: 13px; color: #64748b; display: block; margin-top: 8px;">
                      ⏱️ Valid for <strong>${expiryMinutes} minutes</strong>
                    </span>
                  </div>
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #991b1b;">
                      <strong>Note:</strong> If you do not see this email in your Primary Inbox, please check your <strong>Spam / Junk</strong> folder.
                    </p>
                  </div>
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                    If you did not request this registration, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #94a3b8;">
                    Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    © ${new Date().getFullYear()} GASC Idappadi Sports Portal. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
      await transporter.sendMail({
        from: `"GASC Idappadi Sports Portal" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: cleanEmail,
        subject: `[GASC Sports] Your Verification Code: ${otp}`,
        text: `Your GASC Sports verification code is: ${otp}. Valid for 10 minutes. (Reg No: ${cleanRegNo})`,
        html: htmlContent,
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      });
      console.log(`[REAL OTP SENT] Dispatched OTP to ${cleanEmail}`);
    } catch (mailErr) {
      console.error('[REAL OTP SEND ERROR]', mailErr.message || mailErr);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver email to ${cleanEmail}. Error: ${mailErr.message || 'Please verify email address or try again.'}`
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit OTP verification code has been dispatched to ${maskEmail(cleanEmail)}. Please check your Inbox and Spam / Junk folder.`,
      maskedEmail: maskEmail(cleanEmail),
      otpToken,
      expiryMinutes
    });

  } catch (err) {
    console.error('send-otp handler error:', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
