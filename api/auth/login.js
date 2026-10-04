/**
 * GASC Sports - Student Login
 * Self-contained serverless function
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
const JWT_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { email: bodyEmail, identifier, password } = body || {};
    const email = (bodyEmail || identifier || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered Email Address and Password.'
      });
    }

    if (email === 'admin' || email === 'sports_incharge' || email === 'admin-sports' || email === 'admin@gascidappadi.edu.in') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: This portal is exclusively for Students. Admin login is prohibited here.'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const { data: userRaw, error: queryErr } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (queryErr) {
      console.error('Supabase query error:', queryErr.message);
      return res.status(500).json({ success: false, message: 'Database query error.' });
    }

    if (!userRaw) {
      return res.status(401).json({
        success: false,
        message: 'No student account found with this email address. Please click "Create Student Account" to register.'
      });
    }

    if (userRaw.role === 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: Admin credentials cannot be used on Student Portal.'
      });
    }

    if (!userRaw.password || userRaw.role === 'roster') {
      return res.status(401).json({
        success: false,
        message: `Student record "${userRaw.name}" (${userRaw.register_number}) is in College Roster, but registration is incomplete. Please click "Create Student Account" to set your password.`
      });
    }

    if (userRaw.status === 'Suspended' || userRaw.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your student account is deactivated or suspended. Please contact Physical Directress.'
      });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    let isMatch = false;
    if (userRaw.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, userRaw.password);
    } else {
      isMatch = (password === userRaw.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    const user = toCamelCase(userRaw);
    delete user.password;

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '365d' });

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user
    });
  } catch (err) {
    console.error('Login handler error:', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
