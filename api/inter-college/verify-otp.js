const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
const OTP_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

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
    const { email, otp, otpToken } = body || {};

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // 1. HMAC check
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

    // 2. Database record check
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      const { data: records } = await supabase
        .from('external_otps')
        .select('*')
        .eq('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(5);

      if (records && records.length > 0) {
        for (const rec of records) {
          if (String(rec.otp_code).trim() === cleanOtp) {
            const exp = new Date(rec.expires_at).getTime();
            if (Date.now() <= exp) {
              await supabase.from('external_otps').update({ verified: true }).eq('id', rec.id).catch(() => {});
              return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
            }
          }
        }
      }
    } catch(e) {}

    return res.status(400).json({
      success: false,
      message: 'Invalid OTP code. Please check your email and enter the 6-digit code correctly.'
    });

  } catch (err) {
    console.error('api/inter-college/verify-otp error:', err);
    return res.status(500).json({ success: false, message: 'Verification error' });
  }
};
