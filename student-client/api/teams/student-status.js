// Vercel Serverless Function – GET /api/teams/student-status
// Returns team assignment status for a specific student

const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'local_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return { teams: [], team_members: [] };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const studentId = req.headers['x-student-id'] || req.query.studentId || '';
    const registerNumber = req.headers['x-register-number'] || req.query.registerNumber || '';

    const db = loadDb();
    const teams = db.teams || [];
    const teamMembers = db.team_members || [];

    // Find all team memberships for this student
    const myMemberships = teamMembers.filter(m =>
      (m.student_id && m.student_id === studentId) ||
      (m.register_number && m.register_number.toLowerCase() === registerNumber.toLowerCase())
    );

    const teamStatusMap = {};
    myMemberships.forEach(m => {
      const team = teams.find(t => t.id === m.team_id);
      if (team) {
        const key = `${team.tournament_name || team.tournamentName}_${team.sport_name || team.sportName}`.toLowerCase();
        teamStatusMap[team.competition_id || key] = {
          teamId: team.id,
          teamName: team.name || team.team_name,
          competitionId: team.competition_id,
          tournamentName: team.tournament_name || team.tournamentName,
          sportName: team.sport_name || team.sportName,
          department: team.department,
          gender: team.gender,
          captainName: team.captain_name,
          status: 'TEAM CREATED',
          members: (teamMembers.filter(tm => tm.team_id === team.id) || []).map(tm => ({
            id: tm.id,
            name: tm.student_name || tm.name,
            registerNumber: tm.register_number,
            role: tm.role || 'Member',
          })),
        };
      }
    });

    return res.status(200).json({
      success: true,
      teamStatusMap,
      data: teamStatusMap,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
