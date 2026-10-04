// Vercel Serverless Function – GET /api/competitions/my-applications
// Returns mock registration history for the authenticated student
// Reads from bundled local_db.json competition_registrations table

const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'local_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return { competition_registrations: [], competitions: [] };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const studentId = req.headers['x-student-id'] || req.query.studentId || 'usr_lokesh_csc013';
    const registerNumber = req.headers['x-register-number'] || req.query.registerNumber || 'C24UG183CSC013';

    const db = loadDb();
    const allRegs = db.competition_registrations || [];
    const competitions = db.competitions || [];

    // Filter registrations for this student
    const myRegs = allRegs.filter(r =>
      (r.student_id && r.student_id === studentId) ||
      (r.register_number && r.register_number.toLowerCase() === registerNumber.toLowerCase())
    );

    const registrations = myRegs.map(r => {
      const comp = competitions.find(c => c.id === r.competition_id);
      return {
        id: r.id,
        registrationCode: r.registration_code || r.registrationCode || `REG-GASC-${r.id}`,
        competitionId: r.competition_id,
        tournamentName: (comp && (comp.tournament_name || comp.tournamentName)) || r.tournament_name || 'Tournament',
        sportName: (comp && (comp.sport_name || comp.sportName || comp.name)) || r.sport_name || 'Sport',
        status: r.status || 'Registered',
        registeredAt: r.registered_at || r.createdAt || new Date().toISOString(),
        venue: (comp && comp.venue) || r.venue || 'GASC Sports Ground',
        isTeamEvent: (comp && (comp.type || '').toLowerCase().includes('team')) || false,
        teamStatus: r.team_status || 'Not Assigned',
      };
    });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
      data: registrations,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
