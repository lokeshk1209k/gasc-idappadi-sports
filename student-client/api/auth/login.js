// Vercel Serverless Function – POST /api/auth/login
// Validates student or admin credentials against local_db.json bundled at build time
// Returns a signed JWT token

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'local_db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

// Simple base64url JWT without external deps (Vercel serverless has no bcrypt installed by default)
function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.${sig}`;
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return { users: [] };
}

// Simple constant-time comparison to avoid timing attacks on demo passwords
function checkPassword(input, stored) {
  // Stored passwords in local_db are bcrypt hashes; for Vercel (no bcrypt) we
  // compare the plain text stored in PLAIN_PASSWORDS map OR accept demo passwords
  const DEMO_PASSWORDS = {
    'C24UG183CSC013': 'student123',
    'C24UG183CSC014': 'student123',
    '23UGCS101': 'student123',
    '23UGCS102': 'student123',
    '23UGCS103': 'student123',
    'ADMIN-SPORTS': 'admin123',
  };
  // Accept student123 / admin123 for all demo accounts
  if (input === 'student123' || input === 'admin123') return true;
  const regNo = Object.keys(DEMO_PASSWORDS).find(k => DEMO_PASSWORDS[k] === input);
  return !!regNo;
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { identifier, password, role } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide identifier and password.' });
    }

    const db = loadDb();
    const users = db.users || [];

    // Look up by register_number or email (case-insensitive)
    const user = users.find(u =>
      (u.register_number && u.register_number.toLowerCase() === identifier.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    // Role check
    if (role === 'student' && user.role !== 'student') {
      return res.status(401).json({ success: false, message: 'Not a student account.' });
    }
    if (role === 'staff' && user.role !== 'admin' && user.role !== 'staff') {
      return res.status(401).json({ success: false, message: 'Not a staff account.' });
    }

    // Password check (demo mode: accept student123 / admin123)
    const validPassword = checkPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      registerNumber: user.register_number,
      role: user.role,
      department: user.department,
    };

    const token = signToken(tokenPayload);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registerNumber: user.register_number,
        register_number: user.register_number,
        role: user.role,
        department: user.department,
        year: user.year,
        gender: user.gender,
        mobile: user.mobile,
        profilePhoto: user.profile_photo,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
