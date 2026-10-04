/**
 * GASC Sports API Utilities
 * Lazy-loaded for optimal Vercel cold-start performance
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const DEFAULT_SRK = Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();
const DEFAULT_ANON = Buffer.from('c2JfcHVibGlzaGFibGVfMThmam55a3MwUzRZX1VuaVFnaTlwZ19JeXh3dXNfVQ==', 'base64').toString();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SRK;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || DEFAULT_ANON;
const JWT_SECRET = process.env.JWT_SECRET || 'gasc_idappadi_sports_super_secret_jwt_key_2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user.slice(-1)}@${domain}`;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function generateToken(id) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '365d' });
}

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const newObj = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
}

// Lazy getter for bcrypt
function getBcrypt() {
  return require('bcryptjs');
}

// Lazy getter for transporter
function getTransporter() {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com',
      pass: process.env.EMAIL_PASS || Buffer.from('YXFyYXB1cGdycXltbGhzaA==', 'base64').toString()
    }
  });
}

module.exports = {
  supabase,
  get transporter() { return getTransporter(); },
  get bcrypt() { return getBcrypt(); },
  maskEmail,
  setCorsHeaders,
  generateToken,
  toCamelCase,
  JWT_SECRET
};
