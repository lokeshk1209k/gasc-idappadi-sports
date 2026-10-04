/**
 * GASC Sports - Student Login
 * Self-contained serverless function
 * Supports Login with either Register Number OR Email Address
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    const { email: bodyEmail, identifier, registerNumber, password } = body || {};
    const inputIdentifier = (identifier || registerNumber || bodyEmail || '').trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Register Number / Email Address and Password.'
      });
    }

    const lowerId = inputIdentifier.toLowerCase();
    if (lowerId === 'admin' || lowerId === 'sports_incharge' || lowerId === 'admin-sports' || lowerId === 'admin@gascidappadi.edu.in') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: This portal is exclusively for Students. Admin login is prohibited here.'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // Match by either email OR register_number (case-insensitive)
    const { data: userRows, error: queryErr } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${inputIdentifier},register_number.ilike.${inputIdentifier}`);

    if (queryErr) {
      console.error('Supabase query error:', queryErr.message);
      return res.status(500).json({ success: false, message: 'Database query error.' });
    }

    if (!userRows || userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: `No student account found for "${inputIdentifier}". If you haven't set up your password yet, please click "Create Student Account".`
      });
    }

    // Prioritize active registered student account if multiple entries exist
    const userRaw = userRows.find(u => u.role === 'student' && u.password) || userRows[0];

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
        message: `Student record "${userRaw.name}" (${userRaw.register_number}) is in College Roster, but account creation is incomplete. Please click "Create Student Account" to activate.`
      });
    }

    if (userRaw.status === 'Suspended' || userRaw.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your student account is deactivated or suspended. Please contact Physical Directress.'
      });
    }

    // Verify password (supports bcrypt hash and plaintext fallback)
    let isMatch = false;
    const rawPass = String(password);
    if (userRaw.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(rawPass, userRaw.password);
      if (!isMatch && rawPass.trim() !== rawPass) {
        isMatch = await bcrypt.compare(rawPass.trim(), userRaw.password);
      }
    } else {
      isMatch = (rawPass === userRaw.password || rawPass.trim() === userRaw.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    const user = toCamelCase(userRaw);
    delete user.password;

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
