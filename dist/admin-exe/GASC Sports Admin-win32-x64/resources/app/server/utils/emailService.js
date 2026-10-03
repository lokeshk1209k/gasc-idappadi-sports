const nodemailer = require('nodemailer');

// Initialize Transporter
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });
  }

  return null;
};

/**
 * Send OTP Verification Email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Student Name
 * @param {string} options.registerNumber - College Register Number
 * @param {string} options.otp - 6-Digit OTP code
 * @param {number} options.expiryMinutes - Expiration time in minutes (default 10)
 */
const sendOtpEmail = async ({ to, name, registerNumber, otp, expiryMinutes = 10 }) => {
  const collegeName = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';
  const senderEmail = process.env.EMAIL_FROM || `"GASC Idappadi Sports Dept" <${process.env.EMAIL_USER || 'sports@gascidappadi.edu.in'}>`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Verification OTP</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fb; color: #1e293b;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f7fb; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${collegeName}</h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; color: #cbd5e1;">Department of Physical Education & Sports</p>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 35px 30px;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Student Email Verification</h2>
                <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                  Dear <strong>${name || 'Student Athlete'}</strong>${registerNumber ? ` (Reg No: <strong>${registerNumber}</strong>)` : ''},
                </p>
                <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                  Thank you for enrolling in the GASC Idappadi Smart Sports Portal. Please use the One-Time Password (OTP) below to verify your email address and complete your athlete registration:
                </p>

                <!-- OTP Display Box -->
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 25px;">
                  <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #0369a1; letter-spacing: 1px; display: block; margin-bottom: 8px;">Your Verification Code</span>
                  <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f4c81; font-family: 'Courier New', Courier, monospace; margin: 5px 0;">
                    ${otp}
                  </div>
                  <span style="font-size: 13px; color: #64748b; display: block; margin-top: 8px;">
                    ⏱️ Valid for <strong>${expiryMinutes} minutes</strong>
                  </span>
                </div>

                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #991b1b;">
                    <strong>Security Notice:</strong> Do not share this OTP with anyone. GASC Sports Department staff will never ask for your verification code.
                  </p>
                </div>

                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
                  If you did not initiate this registration request, please ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
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

  const textContent = `
${collegeName} - Sports Management System
Student Email Verification

Dear ${name || 'Student'}${registerNumber ? ` (${registerNumber})` : ''},

Your One-Time Password (OTP) for student athlete registration is:
${otp}

This code is valid for ${expiryMinutes} minutes.

Do not share this code with anyone.
  `.trim();

  const transporter = createTransporter();

  // If transporter is configured, attempt sending
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: senderEmail,
        to,
        subject: `[GASC Sports] ${otp} is your Student Registration OTP`,
        text: textContent,
        html: htmlContent
      });

      console.log(`[EMAIL SENT] OTP successfully dispatched to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.warn(`[EMAIL WARNING] SMTP delivery failed (${err.message}). Falling back to simulation/console log mode.`);
    }
  }

  // Fallback mode: Print to console for development testing
  console.log(`\n======================================================`);
  console.log(`✉️  [GASC SPORTS EMAIL SIMULATOR]`);
  console.log(`To: ${to} (${name || 'Student'} - ${registerNumber || 'N/A'})`);
  console.log(`Subject: [GASC Sports] Student Registration OTP`);
  console.log(`🔐 OTP CODE: >>>  ${otp}  <<< (Valid for ${expiryMinutes} mins)`);
  console.log(`======================================================\n`);

  return {
    success: true,
    mode: 'simulated',
    simulatedOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
  };
};

module.exports = {
  sendOtpEmail
};
