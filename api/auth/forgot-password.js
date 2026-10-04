const { supabase, transporter, maskEmail, setCorsHeaders } = require('../_utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    const { identifier } = req.body || {};

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered Email or College Register Number.'
      });
    }

    const cleanId = identifier.trim();

    // Query user by register_number OR email where role is student (or admin)
    let user = null;
    if (cleanId.includes('@')) {
      const { data } = await supabase
        .from('users')
        .select('id, name, register_number, email, role')
        .ilike('email', cleanId.toLowerCase())
        .maybeSingle();
      user = data;
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, name, register_number, email, role')
        .ilike('register_number', cleanId.toUpperCase())
        .maybeSingle();
      user = data;

      if (!user) {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('id, name, register_number, email, role')
          .ilike('email', cleanId.toLowerCase())
          .maybeSingle();
        user = fallbackUser;
      }
    }

    if (!user || !user.email) {
      return res.status(404).json({
        success: false,
        message: `No active account found for identifier "${cleanId}". Please check your Register Number or Register first.`
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Store OTP in Supabase notifications table for verification across serverless instances
    const notifId = `otp_reset_${user.id}_${Date.now()}`;
    await supabase.from('notifications').insert({
      id: notifId,
      user_id: user.id,
      title: 'PASSWORD_RESET_OTP',
      message: JSON.stringify({
        email: user.email.toLowerCase(),
        otp: otpCode,
        expiresAt: expiryTime,
        registerNumber: user.register_number
      }),
      type: 'security',
      is_read: false,
      created_at: new Date().toISOString()
    });

    const collegeName = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>GASC Sports Password Reset OTP</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b1120; color: #f1f5f9;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0b1120; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;">
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🔑</div>
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${collegeName}</h1>
                  <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; color: #cbd5e1;">Password Reset Verification</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 35px 30px; color: #e2e8f0;">
                  <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #f8fafc; font-weight: 600;">Reset Your Password</h2>
                  <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                    Hello <strong>${user.name}</strong> (${user.register_number || 'Student'}),
                  </p>
                  <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                    We received a request to reset your password for the GASC Idappadi Sports Portal. Use the 6-digit OTP below to proceed:
                  </p>
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                    <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #60a5fa; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your Reset Code</span>
                    <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; margin: 5px 0;">
                      ${otpCode}
                    </div>
                    <span style="font-size: 13px; color: #94a3b8; display: block; margin-top: 8px;">
                      ⏱️ Valid for <strong>${expiryMinutes} minutes</strong>
                    </span>
                  </div>
                  <div style="background-color: #450a0a; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fca5a5;">
                      <strong>Security Notice:</strong> If you did not make this request, someone may have entered your register number by mistake. You can safely ignore this email.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    © ${new Date().getFullYear()} GASC Idappadi Sports Portal • All rights reserved.
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

    // Send email via nodemailer
    try {
      await transporter.sendMail({
        from: `"GASC Idappadi Sports Dept" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: user.email,
        subject: `[GASC Sports] ${otpCode} is your Password Reset OTP`,
        text: `Your password reset OTP is ${otpCode}. It expires in 10 minutes.`,
        html: htmlContent
      });
      console.log(`[RESET OTP SENT] Dispatched to ${user.email} for ${user.register_number}`);
    } catch (mailErr) {
      console.warn('[RESET OTP MAIL WARNING]', mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Password reset OTP has been dispatched to ${maskEmail(user.email)}.`,
      email: user.email,
      maskedEmail: maskEmail(user.email)
    });
  } catch (err) {
    console.error('forgot-password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
