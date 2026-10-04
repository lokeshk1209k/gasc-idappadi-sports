/**
 * GASC Sports - Verify Student Register Number
 * Self-contained serverless function — no heavy dependency on _utils
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const out = {};
  for (const k of Object.keys(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    out[ck] = obj[k];
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse register number from query
    const registerNumber = (req.query && (req.query.regNo || req.query.registerNumber)) || '';

    if (!registerNumber || registerNumber === 'verify-student') {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();

    // Create fresh Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // Query official roster in users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, register_number, email, role, status, department, year, gender, section, password')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    if (error) {
      console.error('Verify student db error:', error.message);
      return res.status(500).json({ success: false, message: 'Database query error. Please try again.' });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        isRegistered: false,
        isPreEnrolled: false,
        message: 'Your Register Number was not found in the official college student roster. You cannot create a Student Portal account.'
      });
    }

    if (user.status && user.status.toUpperCase() === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        isInactive: true,
        isPreEnrolled: false,
        isRegistered: false,
        message: 'Your student record is currently inactive. Please contact the Sports Administration.'
      });
    }

    if (user.role === 'student' && user.password) {
      return res.json({
        success: false,
        isRegistered: true,
        isPreEnrolled: false,
        message: `An account already exists for this Register Number (${user.register_number || cleanRegNo}). Please login using your registered email and password.`
      });
    }

    // Strip password before sending
    const { password: _pw, ...safeUser } = user;
    return res.json({
      success: true,
      verified: true,
      isRegistered: false,
      isPreEnrolled: true,
      message: 'Register Number verified successfully.',
      student: toCamelCase(safeUser)
    });

  } catch (err) {
    console.error('verify-student error:', err.message || err);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify your Register Number right now. Please try again.'
    });
  }
};
