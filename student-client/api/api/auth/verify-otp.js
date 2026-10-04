const crypto = require('crypto');

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
    const { email, otp, otpToken } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // Verify via HMAC Token
    if (otpToken && otpToken.includes('.')) {
      const [expectedHash, expiryTimeStr] = otpToken.split('.');
      const expiryTime = parseInt(expiryTimeStr, 10);

      if (Date.now() > expiryTime) {
        return res.status(400).json({ success: false, message: 'OTP verification code has expired. Please request a new one.' });
      }

      const calculatedHash = crypto.createHmac('sha256', OTP_SECRET)
        .update(`${cleanEmail}:${cleanOtp}:${expiryTime}`)
        .digest('hex');

      if (calculatedHash === expectedHash) {
        return res.status(200).json({ success: true, message: 'Email verified successfully!' });
      }
    }

    // Fallback: check in-memory store if running locally
    try {
      const { otpStore } = require('../../server/controllers/authController');
      if (otpStore) {
        const result = otpStore.verifyOtp(cleanEmail, cleanOtp, 'registration');
        if (result && result.success) {
          return res.status(200).json({ success: true, message: 'Email verified successfully!' });
        }
      }
    } catch (e) {}

    return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your email and enter the 6-digit code correctly.' });
  } catch (err) {
    console.error('verify-otp handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Verification error' });
  }
};
