// Vercel Serverless Function – POST /api/competitions/register (and rewritten from /api/competitions/:id/register)
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function findDataFile() {
  const candidates = [
    path.join(__dirname, '..', 'data', 'local_db.json'),
    path.join(__dirname, 'data', 'local_db.json'),
    path.join(__dirname, '..', '..', 'data', 'local_db.json'),
    path.join(process.cwd(), 'api', 'data', 'local_db.json'),
    path.join(process.cwd(), 'student-client', 'api', 'data', 'local_db.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function loadDb() {
  try {
    const dataFile = findDataFile();
    if (dataFile && fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (e) {
    console.error('loadDb error:', e);
  }
  return { competitions: [], tournaments: [], sports: [] };
}

function generateRegCode() {
  return 'REG-GASC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    const compId = req.query.id || (req.body && (req.body.competitionId || req.body.id));
    const { studentId, registerNumber, studentName, department, year, gender, mobile, email, remarks } = req.body || {};

    const db = loadDb();
    const competition = (db.competitions || []).find(c => c.id === compId || String(c.id) === String(compId));

    const regCode = generateRegCode();
    const registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      registrationCode: regCode,
      competitionId: compId || 'comp_default',
      tournamentName: (competition && (competition.tournament_name || competition.tournamentName)) || 'Official Tournament',
      sportName: (competition && (competition.sport_name || competition.sportName || competition.name)) || 'Sport Discipline',
      studentId: studentId || req.headers['x-student-id'] || 'usr_lokesh_csc013',
      registerNumber: registerNumber || req.headers['x-register-number'] || 'C24UG183CSC013',
      studentName: studentName || 'Lokesh Krishnan',
      department: department || 'Computer Science',
      year: year || 'III Year',
      gender: gender || 'Male',
      mobile: mobile || '',
      email: email || '',
      remarks: remarks || 'Confirmed via Student 1-Click Registration',
      status: 'Registered',
      venue: (competition && competition.venue) || 'GASC Sports Ground',
      registeredAt: new Date().toISOString(),
      isTeamEvent: competition ? (competition.type || '').toLowerCase().includes('team') : false,
      teamStatus: competition && (competition.type || '').toLowerCase().includes('team') ? 'Not Assigned' : 'INDIVIDUAL',
    };

    return res.status(200).json({
      success: true,
      message: 'Registered successfully!',
      registration,
      data: registration,
      registrationCode: regCode,
    });
  } catch (err) {
    console.error('Registration handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
};
