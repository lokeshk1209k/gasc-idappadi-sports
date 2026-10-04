// Vercel Serverless Function – GET /api/notifications
// Returns notifications for the authenticated student from bundled local_db.json

const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'local_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return { notifications: [] };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-id, x-register-number');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const db = loadDb();
    const notifications = (db.notifications || []).slice(0, 20).map(n => ({
      id: n.id,
      title: n.title || 'Notification',
      message: n.message || n.body || '',
      type: n.type || 'info',
      isRead: n.is_read || n.isRead || false,
      createdAt: n.created_at || n.createdAt || new Date().toISOString(),
      targetRole: n.target_role || n.targetRole || 'all',
    }));

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
      data: notifications,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
