const { supabase, bcrypt, setCorsHeaders } = require('../_utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP code, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // 1. Find user in Supabase
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, register_number')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // 2. Look up latest valid OTP from Supabase notifications table
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, message, created_at')
      .eq('user_id', user.id)
      .eq('title', 'PASSWORD_RESET_OTP')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    let isOtpValid = false;
    let matchedNotifId = null;

    if (notifs && notifs.length > 0) {
      for (const n of notifs) {
        try {
          const parsed = JSON.parse(n.message);
          if (parsed.otp === cleanOtp) {
            const expires = new Date(parsed.expiresAt).getTime();
            if (Date.now() <= expires) {
              isOtpValid = true;
              matchedNotifId = n.id;
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code. Please check your email or request a new code.'
      });
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update user's password in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ success: false, message: 'Failed to update password: ' + updateError.message });
    }

    // 5. Invalidate the used OTP notification
    if (matchedNotifId) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', matchedNotifId);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
