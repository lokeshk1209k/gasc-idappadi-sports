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
    const { email, otp, otpToken } = body || {};

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // ── Check 1: Verify via HMAC Token ──
    if (otpToken && otpToken.includes('.')) {
      const [expectedHash, expiryTimeStr] = otpToken.split('.');
      const expiryTime = parseInt(expiryTimeStr, 10);

      if (Date.now() <= expiryTime) {
        const calculatedHash = crypto.createHmac('sha256', OTP_SECRET)
          .update(`${cleanEmail}:${cleanOtp}:${expiryTime}`)
          .digest('hex');

        if (calculatedHash === expectedHash) {
          return res.status(200).json({ success: true, message: 'Email verified successfully!' });
        }
      }
    }

    // ── Check 2: Verify via Supabase Notifications OTP Store ──
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });

      const { data: otpRecords } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'otp')
        .eq('sender', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(10);

      if (otpRecords && otpRecords.length > 0) {
        for (const rec of otpRecords) {
          try {
            const parsed = typeof rec.message === 'string' ? JSON.parse(rec.message) : rec.message;
            if (parsed && String(parsed.otp).trim() === cleanOtp) {
              const expiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : null;
              if (!expiresAt || Date.now() <= expiresAt) {
                // Verified successfully! Clean up used OTP record
                await supabase.from('notifications').delete().eq('id', rec.id).catch(() => {});
                return res.status(200).json({ success: true, message: 'Email verified successfully!' });
              }
            }
          } catch (pErr) {}
        }
      }
    } catch (dbErr) {
      console.warn('Database OTP fallback warning:', dbErr.message);
    }

    // If neither HMAC token nor Supabase record matched:
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP code. Please check your email and enter the 6-digit code correctly.'
    });


  } catch (err) {
    console.error('verify-otp handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Verification error' });
  }
};
