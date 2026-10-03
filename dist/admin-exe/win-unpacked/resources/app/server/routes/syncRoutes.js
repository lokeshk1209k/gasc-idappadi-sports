/**
 * GASC Sports - Sync API Routes
 * Endpoints for the frontend to control and monitor sync
 */
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// Get sync status
router.get("/status", async (req, res) => {
  try {
    const syncEngine = require("../database/syncEngine");
    res.json({
      success: true,
      isOnline: syncEngine.getIsOnline(),
      pendingCount: syncEngine.getPendingCount(),
      isSyncing: syncEngine.isSyncing(),
      lastSync: syncEngine.getLastSync()
    });
  } catch (e) { res.json({ success: true, isOnline: false, pendingCount: 0, lastSync: null }); }
});

// Trigger manual sync
router.post("/now", verifyToken, async (req, res) => {
  try {
    const syncEngine = require("../database/syncEngine");
    const result = await syncEngine.runFullSync();
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get pending queue
router.get("/queue", verifyToken, async (req, res) => {
  try {
    const syncEngine = require("../database/syncEngine");
    const queue = syncEngine.getPendingQueue();
    res.json({ success: true, queue, count: queue.length });
  } catch (e) { res.status(500).json({ success: false, queue: [] }); }
});

// Get sync history
router.get("/history", verifyToken, async (req, res) => {
  try {
    const localDB = require("../database/localDB");
    const d = localDB.getDB();
    if (!d) return res.json({ success: true, history: [] });
    const history = d.prepare("SELECT * FROM sync_history ORDER BY synced_at DESC LIMIT 100").all();
    res.json({ success: true, history });
  } catch (e) { res.json({ success: true, history: [] }); }
});

// Get offline analytics from SQLite
router.get("/offline-analytics", async (req, res) => {
  try {
    const localDB = require("../database/localDB");
    const d = localDB.getDB();
    if (!d) return res.json({ success: false, message: "Local DB not available" });
    const total = d.prepare("SELECT COUNT(*) as cnt FROM registrations").get().cnt;
    const bySport = d.prepare("SELECT sport_name, COUNT(*) as cnt FROM registrations GROUP BY sport_name").all();
    const byDept = d.prepare("SELECT department, COUNT(*) as cnt FROM registrations GROUP BY department").all();
    const byGender = d.prepare("SELECT gender, COUNT(*) as cnt FROM registrations GROUP BY gender").all();
    const byDeptSport = d.prepare("SELECT department, sport_name, COUNT(*) as cnt FROM registrations GROUP BY department, sport_name").all();
    res.json({ success: true, total, bySport, byDept, byGender, byDeptSport });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Get offline students
router.get("/offline-students", async (req, res) => {
  try {
    const localDB = require("../database/localDB");
    const d = localDB.getDB();
    if (!d) return res.json({ success: false, students: [] });
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const students = d.prepare("SELECT * FROM students WHERE name LIKE ? OR register_number LIKE ? ORDER BY name LIMIT 200").all(search, search);
    res.json({ success: true, students, offline: true });
  } catch (e) { res.status(500).json({ success: false, students: [] }); }
});

// Get offline equipment
router.get("/offline-equipment", async (req, res) => {
  try {
    const localDB = require("../database/localDB");
    const d = localDB.getDB();
    if (!d) return res.json({ success: false, equipment: [] });
    const equipment = d.prepare("SELECT * FROM equipment ORDER BY name").all();
    res.json({ success: true, equipment, offline: true });
  } catch (e) { res.status(500).json({ success: false, equipment: [] }); }
});

// Get offline teams
router.get("/offline-teams", async (req, res) => {
  try {
    const localDB = require("../database/localDB");
    const d = localDB.getDB();
    if (!d) return res.json({ success: false, teams: [] });
    const teams = d.prepare("SELECT * FROM teams ORDER BY created_at DESC").all();
    for (const team of teams) {
      team.members = d.prepare("SELECT * FROM team_members WHERE team_id=?").all(team.id);
    }
    res.json({ success: true, teams, offline: true });
  } catch (e) { res.status(500).json({ success: false, teams: [] }); }
});

module.exports = router;
