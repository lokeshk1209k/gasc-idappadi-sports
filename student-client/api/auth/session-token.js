// Vercel Serverless Function – POST /api/auth/session-token
// Issues an auto-login session token for the default demo student
// Used by CompetitionsPage to silently authenticate without a login form

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'local_db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

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

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { registerNumber } = req.body || {};
    const db = loadDb();
    const users = db.users || [];

    const rn = (registerNumber || 'C24UG183CSC013').trim();
    const user = users.find(u => u.register_number && u.register_number.toLowerCase() === rn.toLowerCase())
      || users.find(u => u.role === 'student')
      || {
        id: 'usr_lokesh_csc013',
        name: 'Lokesh Krishnan',
        register_number: 'C24UG183CSC013',
        email: 'c24ug183csc013@gascidappadi.edu.in',
        role: 'student',
        department: 'Computer Science',
        year: 'III Year',
        gender: 'Male',
      };

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      registerNumber: user.register_number,
      role: user.role,
    });

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
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
