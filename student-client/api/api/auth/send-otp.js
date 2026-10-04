const nodemailer = require('nodemailer');
const crypto = require('crypto');

const OTP_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false,
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
  // Set CORS headers
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
    const { email, registerNumber, name } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!registerNumber) {
      return res.status(400).json({ success: false, message: 'Please provide a valid college register number.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();
    const studentName = name ? name.trim() : 'Student Athlete';

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    const expiryTime = Date.now() + expiryMinutes * 60 * 1000;

    // Generate cryptographic HMAC token so ANY serverless instance can verify without state
    const hash = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${cleanEmail}:${otp}:${expiryTime}`)
      .digest('hex');
    const otpToken = `${hash}.${expiryTime}`;

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
                  <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${collegeName}</h1>
                  <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; color: #cbd5e1;">Department of Physical Education & Sports</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 35px 30px;">
                  <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Student Email Verification</h2>
                  <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Dear <strong>${studentName}</strong> (Reg No: <strong>${cleanRegNo}</strong>),
                  </p>
                  <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Thank you for enrolling in the GASC Idappadi Sports Portal. Please use the One-Time Password (OTP) below to verify your email and complete your registration:
                  </p>
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                    <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #0369a1; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your Verification Code</span>
                    <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f4c81; font-family: 'Courier New', Courier, monospace; margin: 5px 0;">
                      ${otp}
                    </div>
                    <span style="font-size: 13px; color: #64748b; display: block; margin-top: 8px;">
                      ⏱️ Valid for <strong>${expiryMinutes} minutes</strong>
                    </span>
                  </div>
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #991b1b;">
                      <strong>Security Notice:</strong> Do not share this OTP with anyone. College sports staff will never ask for your code.
                    </p>
                  </div>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
                    If you did not initiate this request, you can safely ignore this email.
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

    // Dispatch email
    try {
      await transporter.sendMail({
        from: `"GASC Idappadi Sports Dept" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
        to: cleanEmail,
        subject: `[GASC Sports] ${otp} is your Registration Verification Code`,
        text: `Your GASC Sports OTP is: ${otp}. Valid for 10 minutes.`,
        html: htmlContent
      });
      console.log(`[REAL OTP SENT] Dispatched OTP to ${cleanEmail}`);
    } catch (mailErr) {
      console.error('[REAL OTP SEND ERROR]', mailErr);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver email to ${cleanEmail}. Please check email address or network.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit OTP verification code has been dispatched to ${maskEmail(cleanEmail)}. Please check your inbox and spam folder.`,
      maskedEmail: maskEmail(cleanEmail),
      otpToken,
      expiryMinutes
    });
  } catch (err) {
    console.error('send-otp handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
