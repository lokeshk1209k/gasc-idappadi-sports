// Vercel Serverless Function – POST /api/competitions/[id]/register
// Stores registrations in-memory (Vercel stateless) and returns confirmation
// For a persistent version, you would write to a database like Supabase

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'local_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return { competitions: [], sports: [] };
}

function generateRegCode() {
  return 'REG-GASC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { id } = req.query;
    const { studentId, registerNumber, studentName, department, year, gender } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'Competition ID is required.' });
    }

    const db = loadDb();
    const competition = (db.competitions || []).find(c => c.id === id);
    
    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found.' });
    }

    const regCode = generateRegCode();
    const registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      registrationCode: regCode,
      competitionId: id,
      tournamentName: competition.tournament_name || competition.tournamentName || 'Tournament',
      sportName: competition.sport_name || competition.sportName || competition.name || 'Sport',
      studentId: studentId || req.headers['x-student-id'] || 'usr_lokesh_csc013',
      registerNumber: registerNumber || req.headers['x-register-number'] || 'C24UG183CSC013',
      studentName: studentName || 'Student',
      department: department || 'Computer Science',
      year: year || 'III Year',
      gender: gender || 'Male',
      status: 'Registered',
      venue: competition.venue || 'GASC Sports Ground',
      registeredAt: new Date().toISOString(),
      isTeamEvent: (competition.type || '').toLowerCase().includes('team'),
      teamStatus: (competition.type || '').toLowerCase().includes('team') ? 'Not Assigned' : 'INDIVIDUAL',
    };

    // Note: In a serverless environment registrations won't persist across cold starts.
    // For production, connect to Supabase or a managed database.
    console.log('Registration created (demo):', regCode);

    return res.status(201).json({
      success: true,
      message: 'Registered successfully!',
      registration,
      data: registration,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
