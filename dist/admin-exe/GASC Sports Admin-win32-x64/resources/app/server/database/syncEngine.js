/**
 * GASC Sports Management System
 * Sync Engine - Synchronizes SQLite (local) <-> Supabase (cloud)
 * Uses sql.js (pure JavaScript SQLite - no C++ compilation needed)
 */
const crypto = require("crypto");
const uuidv4 = () => crypto.randomUUID();
const localDB = require("./localDB");

let isSyncing = false;
let isOnline = false;
let syncInterval = null;
const SYNC_INTERVAL_MS = 60000;

// ─── DB initialization (async) ───
let dbReady = false;
let dbInitPromise = null;

async function ensureDB() {
  if (dbReady && localDB.getDB()) return localDB.getDB();
  if (!dbInitPromise) dbInitPromise = localDB.initDB();
  const d = await dbInitPromise;
  dbReady = !!d;
  return d;
}

// ─── Connection Detection ───
const net = require("net");
const dns = require("dns");

function testTcpSocket(host, port = 53, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let resolved = false;
    const socket = net.connect({ host, port, timeout: timeoutMs }, () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(true); }
    });
    socket.on("error", () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(false); }
    });
    socket.on("timeout", () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(false); }
    });
  });
}

async function checkInternetConnection() {
  // 1. Primary: Ultra-fast TCP socket to Google DNS (8.8.8.8:53) - usually <100ms
  try {
    const ok1 = await testTcpSocket("8.8.8.8", 53, 1200);
    if (ok1) return true;
  } catch(e) {}

  // 2. Secondary: Fast TCP socket to Cloudflare DNS (1.1.1.1:53)
  try {
    const ok2 = await testTcpSocket("1.1.1.1", 53, 1200);
    if (ok2) return true;
  } catch(e) {}

  // 3. Fallback: DNS lookup to google.com
  const dnsOk = await new Promise((resolve) => {
    dns.lookup("google.com", (err) => {
      if (!err) return resolve(true);
      dns.lookup("cloudflare.com", (err2) => {
        resolve(!err2);
      });
    });
  });
  if (dnsOk) return true;

  // 4. Fallback: HTTP 204 ping
  try {
    const http = require("http");
    const httpOk = await new Promise((resolve) => {
      const req = http.get("http://www.gstatic.com/generate_204", { timeout: 2000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });
    if (httpOk) return true;
  } catch(e) {}

  return false;
}

async function detectOnlineStatus() {
  const internet = await checkInternetConnection();
  isOnline = internet;
  return isOnline;
}

function setIsOnline(val) {
  isOnline = !!val;
  return isOnline;
}

function getIsOnline() { return isOnline; }

// Immediately detect status on module load
detectOnlineStatus().catch(() => {});

// ─── Sync Queue ───
async function addToSyncQueue(operation, tableName, recordId, payload) {
  const d = await ensureDB();
  if (!d) return null;
  const id = uuidv4();
  localDB.run(
    `INSERT INTO sync_queue (id,operation,table_name,record_id,payload,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',strftime('%s','now'),strftime('%s','now'))`,
    [id, operation, tableName, recordId, JSON.stringify(payload)]
  );
  return id;
}

async function getPendingQueue() {
  await ensureDB();
  return localDB.queryAll(`SELECT * FROM sync_queue WHERE status IN ('pending','failed') ORDER BY created_at ASC`);
}

function getPendingCount() {
  try {
    const d = localDB.getDB();
    if (!d) return 0;
    const row = localDB.queryOne(`SELECT COUNT(*) as cnt FROM sync_queue WHERE status IN ('pending','failed')`);
    return row ? (row.cnt || 0) : 0;
  } catch(e) { return 0; }
}

function markQueueItem(id, status, errorMsg = null) {
  localDB.run(`UPDATE sync_queue SET status=?,error_message=?,updated_at=strftime('%s','now') WHERE id=?`, [status, errorMsg, id]);
}

function logSyncHistory(operation, tableName, recordId, status, errorMsg = null) {
  localDB.run(
    `INSERT INTO sync_history (id,operation,table_name,record_id,status,error_message,synced_at) VALUES (?,?,?,?,?,?,strftime('%s','now'))`,
    [uuidv4(), operation, tableName, recordId, status, errorMsg]
  );
}

// ─── Supabase table map ───
const TABLE_MAP = {
  students: "users", sports: "sports", tournaments: "tournaments",
  competitions: "competitions", registrations: "sport_registrations",
  teams: "teams", team_members: "team_members",
  equipment: "equipment", equipment_transactions: "equipment_transactions",
  achievements: "achievements", notifications: "notifications", sports_news: "sports_news"
};

// ─── Upload pending changes ───
async function uploadPendingChanges(progressCb) {
  const { supabase } = require("../config/supabase");
  const queue = await getPendingQueue();
  let success = 0, failed = 0;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (progressCb) progressCb({ current: i+1, total: queue.length, item });
    try {
      const payload = JSON.parse(item.payload);
      const supabaseTable = TABLE_MAP[item.table_name] || item.table_name;
      let error = null;
      if (["upsert","insert","update"].includes(item.operation)) {
        const r = await supabase.from(supabaseTable).upsert(payload, { onConflict: "id" });
        error = r.error;
      } else if (item.operation === "delete") {
        const r = await supabase.from(supabaseTable).delete().eq("id", item.record_id);
        error = r.error;
      }
      if (error) {
        markQueueItem(item.id, "failed", error.message);
        logSyncHistory(item.operation, item.table_name, item.record_id, "failed", error.message);
        localDB.run(`UPDATE sync_queue SET retry_count=retry_count+1 WHERE id=?`, [item.id]);
        failed++;
      } else {
        markQueueItem(item.id, "synced");
        logSyncHistory(item.operation, item.table_name, item.record_id, "synced");
        try { localDB.run(`UPDATE ${item.table_name} SET sync_status='synced' WHERE id=?`, [item.record_id]); } catch(e) {}
        success++;
      }
    } catch(err) { markQueueItem(item.id, "failed", err.message); failed++; }
  }
  return { success, failed, total: queue.length };
}

// ─── Download from Supabase ───
async function downloadFromSupabase(progressCb) {
  const { supabase } = require("../config/supabase");
  const downloads = [
    { sb: "users",        local: "students",              select: "id,name,register_number,email,department,year,section,gender,mobile,profile_photo,status,created_at", filter: { field: "role", value: "student" } },
    { sb: "sports",       local: "sports",                select: "*" },
    { sb: "tournaments",  local: "tournaments",           select: "*" },
    { sb: "competitions", local: "competitions",          select: "*" },
    { sb: "sport_registrations", local: "registrations", select: "*" },
    { sb: "teams",        local: "teams",                 select: "*" },
    { sb: "team_members", local: "team_members",          select: "*" },
    { sb: "equipment",    local: "equipment",             select: "*" },
    { sb: "equipment_transactions", local: "equipment_transactions", select: "*" },
    { sb: "achievements", local: "achievements",          select: "*" },
    { sb: "notifications",local: "notifications",         select: "*" },
  ];
  let synced = 0;
  for (let i = 0; i < downloads.length; i++) {
    const { sb, local, select, filter } = downloads[i];
    if (progressCb) progressCb({ step: local, current: i+1, total: downloads.length });
    try {
      let query = supabase.from(sb).select(select).limit(2000);
      if (filter) query = query.eq(filter.field, filter.value);
      const { data, error } = await query;
      if (error || !data) continue;
      for (const row of data) {
        try {
          if (!row.id) continue;
          // Get column list from a test query
          const existing = localDB.queryOne(`SELECT * FROM ${local} WHERE id=?`, [row.id]);
          const cleaned = { ...row };
          if (!cleaned.sync_status) cleaned.sync_status = "synced";
          localDB.upsertRecord(local, cleaned);
        } catch(e) {}
      }
      synced += data.length;
    } catch(err) { console.warn(`[SyncEngine] Download failed for ${sb}:`, err.message); }
  }
  localDB.setSetting("last_full_sync", Date.now().toString());
  return synced;
}

// ─── Full sync ───
async function runFullSync(progressCb) {
  if (isSyncing) return { skipped: true };
  isSyncing = true;
  try {
    await ensureDB();
    const online = await detectOnlineStatus();
    if (!online) { isSyncing = false; return { offline: true }; }
    if (progressCb) progressCb({ phase: "uploading" });
    const uploadResult = await uploadPendingChanges(progressCb);
    if (progressCb) progressCb({ phase: "downloading" });
    const downloadedCount = await downloadFromSupabase(progressCb);
    localDB.setSetting("last_sync", new Date().toISOString());
    isSyncing = false;
    return { success: true, uploaded: uploadResult.success, uploadFailed: uploadResult.failed, downloaded: downloadedCount };
  } catch(err) {
    isSyncing = false;
    console.error("[SyncEngine] Full sync error:", err.message);
    return { success: false, error: err.message };
  }
}

// ─── Periodic sync ───
function startPeriodicSync(onStatusChange) {
  if (syncInterval) return;
  const tick = async () => {
    try {
      const wasOnline = isOnline;
      const nowOnline = await detectOnlineStatus();
      if (onStatusChange && wasOnline !== nowOnline) onStatusChange(nowOnline);
      if (nowOnline) {
        const pending = getPendingCount();
        if (pending > 0) {
          await uploadPendingChanges();
          if (onStatusChange) onStatusChange(nowOnline);
        }
      }
    } catch(e) {
      console.warn("[SyncEngine] Periodic sync tick warning:", e.message);
    }
  };
  syncInterval = setInterval(tick, SYNC_INTERVAL_MS);
}

function stopPeriodicSync() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

// ─── Save offline record ───
async function saveOfflineRecord(tableName, record, operation = "upsert") {
  await ensureDB();
  if (!record.id) record.id = uuidv4();
  record.sync_status = "pending";
  record.updated_at = Math.floor(Date.now() / 1000);
  localDB.upsertRecord(tableName, record);
  await addToSyncQueue(operation, tableName, record.id, record);
  return record;
}

module.exports = {
  ensureDB, detectOnlineStatus, getIsOnline, setIsOnline,
  addToSyncQueue, getPendingQueue, getPendingCount, markQueueItem,
  runFullSync, downloadFromSupabase, uploadPendingChanges,
  startPeriodicSync, stopPeriodicSync, saveOfflineRecord,
  getSetting: localDB.getSetting,
  setSetting: localDB.setSetting,
  getLastSync: () => localDB.getSetting("last_sync"),
  isSyncing: () => isSyncing
};
