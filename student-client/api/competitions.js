// Vercel Serverless Function – GET /api/competitions
// Reads from local_db.json which is copied at build time by prepare-vercel-data.js
// Falls back to embedded static data if file is missing

const path = require('path');
const fs = require('fs');

// The data file is copied into the api/data directory during build
const DATA_FILE = path.join(__dirname, 'data', 'local_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read local_db.json:', e.message);
  }
  return { competitions: [], tournaments: [], sports: [], users: [] };
}

module.exports = function handler(req, res) {
  // CORS headers so the Vercel-hosted frontend can call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = loadDb();
    const compsRaw = db.competitions || [];
    const tournamentsRaw = db.tournaments || [];

    // Normalise competitions to camelCase
    const competitions = compsRaw.map(c => ({
      id: c.id,
      name: c.name,
      tournamentName: c.tournament_name || c.tournamentName || 'Collegiate Tournament',
      tournament_name: c.tournament_name || c.tournamentName || 'Collegiate Tournament',
      sportName: c.sport_name || c.sportName || c.name || 'General',
      sport_name: c.sport_name || c.sportName || c.name || 'General',
      type: c.type || 'Individual',
      level: c.level || 'College',
      venue: c.venue || 'GASC Idappadi Sports Ground',
      date: c.date || new Date().toISOString(),
      startTime: c.start_time || c.startTime || '09:00 AM',
      endTime: c.end_time || c.endTime || '05:00 PM',
      registrationEnd: c.registration_end || c.registrationEnd || new Date().toISOString(),
      maxParticipants: Number(c.max_participants || c.maxParticipants) || 50,
      currentRegistrations: Number(c.current_registrations || c.currentRegistrations) || 0,
      status: c.status || 'Registration Open',
      description: c.description || '',
      bannerImage: '/images/sports/tournament.png',
      organizer: c.organizer || 'GASC Idappadi Sports Board',
      eligibility: c.eligibility || 'All enrolled UG and PG students',
    }));

    // Normalise tournaments
    const tournaments = tournamentsRaw.map(t => ({
      id: t.id,
      name: t.name || t.tournament_name,
      tournament_name: t.tournament_name || t.name,
      tournamentName: t.tournament_name || t.name,
      description: t.description || `Official ${t.name} Tournament.`,
      venue: t.venue || 'GASC Idappadi Sports Ground',
      date: t.date || new Date().toISOString(),
      registrationEnd: t.registration_end || t.registrationEnd || new Date().toISOString(),
      type: t.type || 'Inter-Department',
      status: t.status || 'Registration Open',
      bannerImage: t.banner_image || t.bannerImage || '/images/sports/tournament.png',
      createdAt: t.created_at || new Date().toISOString(),
    }));

    return res.status(200).json({
      success: true,
      count: competitions.length,
      competitions,
      tournaments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
