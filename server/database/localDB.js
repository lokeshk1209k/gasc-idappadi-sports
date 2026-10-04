/**
 * GASC Sports Management System
 * Local SQLite Database (sql.js - Pure JavaScript, no C++ compilation)
 * Works on ANY Windows machine without Visual Studio or build tools.
 */
const path = require("path");
const fs = require("fs");

let db = null;
let DB_PATH = null;
let SQL = null;
let saveTimer = null;

function getDbPath() {
  const appData = process.env.APPDATA || '';
  if (appData) {
    const appDataDb = path.join(appData, "gasc-idappadi-sports-management", "gasc_sports_local.db");
    if (fs.existsSync(appDataDb)) {
      return appDataDb;
    }
  }
  try {
    const electron = require("electron");
    const app = electron.app || (electron.remote && electron.remote.app);
    if (app) return path.join(app.getPath("userData"), "gasc_sports_local.db");
  } catch (e) {}
  // Fallback: project root
  return path.join(__dirname, "../../gasc_sports_local.db");
}

function initSQL() {
  if (SQL) return SQL;
  try {
    // sql.js wasm file location
    const sqlJsPath = require.resolve("sql.js");
    const sqlJsDir = path.dirname(sqlJsPath);
    SQL = require("sql.js");
    return SQL;
  } catch(e) {
    console.error("[LocalDB] sql.js load error:", e.message);
    return null;
  }
}

let dbInitPromise = null;

async function initDB() {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    try {
      if (!SQL) {
        let wasmBinary = null;
        try {
          const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
          wasmBinary = fs.readFileSync(wasmPath);
        } catch(e) {}
        const initSqlJs = require("sql.js");
        SQL = await initSqlJs(wasmBinary ? { wasmBinary } : {});
      }
      DB_PATH = getDbPath();
      // Load existing DB file if exists
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log("[LocalDB] Loaded existing SQLite DB from:", DB_PATH);
      } else {
        db = new SQL.Database();
        console.log("[LocalDB] Created new SQLite DB at:", DB_PATH);
      }
      
      // Enable WAL-like settings
      db.run("PRAGMA foreign_keys = ON;");
      createTables();
      saveDB(); // Initial save
      console.log("[LocalDB] SQLite initialized OK (sql.js - pure JS)");
      return db;
    } catch(err) {
      console.error("[LocalDB] FAILED:", err.message);
      dbInitPromise = null;
      return null;
    }
  })();
  return dbInitPromise;
}

// Initialize synchronously using cached DB if possible
function initDBSync() {
  if (db) return db;
  try {
    DB_PATH = getDbPath();
    // We need to use the async init but return a promise
    return initDB();
  } catch(e) {
    return null;
  }
}

function saveDB() {
  if (!db || !DB_PATH) return;
  try {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
      } catch(e) {
        console.error("[LocalDB] Save error:", e.message);
      }
    }, 200); // debounce saves
  } catch(e) {}
}

function createTables() {
  if (!db) return;
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      department TEXT, role TEXT DEFAULT 'admin', password_hash TEXT,
      token TEXT, token_expires_at INTEGER, last_login INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, name TEXT, register_number TEXT UNIQUE, email TEXT,
      department TEXT, year TEXT, section TEXT, gender TEXT, mobile TEXT,
      profile_photo TEXT, status TEXT DEFAULT 'Active',
      sync_status TEXT DEFAULT 'synced', synced_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS sports (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, description TEXT,
      icon_url TEXT, image_url TEXT, rules TEXT,
      min_players INTEGER, max_players INTEGER, is_active INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      start_date TEXT, end_date TEXT, venue TEXT, status TEXT DEFAULT 'Upcoming',
      organizer TEXT, sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY, tournament_id TEXT, sport_id TEXT, sport_name TEXT,
      name TEXT, category TEXT, gender TEXT, department TEXT, max_participants INTEGER,
      status TEXT DEFAULT 'Open', rules TEXT, sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, student_name TEXT,
      register_number TEXT, department TEXT, gender TEXT, competition_id TEXT,
      sport_id TEXT, sport_name TEXT, tournament_id TEXT, status TEXT DEFAULT 'Pending',
      registered_at INTEGER DEFAULT (strftime('%s','now')),
      sync_status TEXT DEFAULT 'synced',
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(student_id, competition_id)
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, name TEXT, tournament_id TEXT, competition_id TEXT,
      sport_id TEXT, sport_name TEXT, department TEXT, gender TEXT,
      status TEXT DEFAULT 'Active', sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY, team_id TEXT NOT NULL, student_id TEXT NOT NULL,
      student_name TEXT, register_number TEXT, role TEXT DEFAULT 'Player',
      sync_status TEXT DEFAULT 'synced',
      added_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(team_id, student_id)
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT,
      total_quantity INTEGER DEFAULT 0, available_quantity INTEGER DEFAULT 0,
      issued_quantity INTEGER DEFAULT 0, condition_status TEXT DEFAULT 'Good',
      location TEXT, sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS equipment_transactions (
      id TEXT PRIMARY KEY, equipment_id TEXT NOT NULL, equipment_name TEXT,
      student_id TEXT, student_name TEXT, register_number TEXT,
      transaction_type TEXT NOT NULL, quantity INTEGER DEFAULT 1,
      issued_date TEXT, issued_time TEXT, return_date TEXT,
      notes TEXT, status TEXT DEFAULT 'Active',
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY, student_id TEXT, student_name TEXT, register_number TEXT,
      sport_id TEXT, sport_name TEXT, competition_id TEXT, tournament_id TEXT,
      position TEXT, medal TEXT, result TEXT, notes TEXT, achievement_date TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, title TEXT, message TEXT, type TEXT,
      target_audience TEXT DEFAULT 'all', is_read INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS sports_news (
      id TEXT PRIMARY KEY, title TEXT, content TEXT, image_url TEXT,
      author TEXT, category TEXT, sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY, operation TEXT NOT NULL, table_name TEXT NOT NULL,
      record_id TEXT NOT NULL, payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending', retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS sync_history (
      id TEXT PRIMARY KEY, operation TEXT, table_name TEXT,
      record_id TEXT, status TEXT, error_message TEXT,
      synced_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY, value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  seedFromLocalStore(db);
  saveDB();
}

function seedFromLocalStore(d) {
  try {
    const res = d.exec("SELECT COUNT(*) as cnt FROM sports");
    const count = (res && res[0] && res[0].values && res[0].values[0] && res[0].values[0][0]) || 0;
    if (count > 0) return;

    const storePath = path.join(__dirname, "../data/local_db.json");
    if (!fs.existsSync(storePath)) return;
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));

    if (store.sports && store.sports.length > 0) {
      for (const s of store.sports) {
        d.run("INSERT OR REPLACE INTO sports (id, name, category, description, icon_url, image_url, is_active, sync_status) VALUES (?,?,?,?,?,?,?,'synced')",
          [s.id, s.name, s.category || '', s.description || '', s.icon || '', s.image || '', 1]);
      }
    }

    if (store.users && store.users.length > 0) {
      for (const u of store.users) {
        if (u.role === 'student') {
          d.run("INSERT OR REPLACE INTO students (id, name, register_number, email, department, year, section, gender, mobile, profile_photo, status, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'synced')",
            [u.id, u.name, u.register_number, u.email || '', u.department || '', u.year || '', u.section || '', u.gender || '', u.mobile || '', u.profile_photo || '/images/default-avatar.png', u.status || 'Active']);
        }
      }
    }

    if (store.competitions && store.competitions.length > 0) {
      for (const c of store.competitions) {
        d.run("INSERT OR REPLACE INTO competitions (id, tournament_id, sport_id, sport_name, name, category, gender, department, max_participants, status, sync_status) VALUES (?,?,?,?,?,?,?,?,?,'Open','synced')",
          [c.id, c.tournament_id || 'tourn_01', c.sport_id || 'sp_cricket', c.sport_name || '', c.name, c.category || 'General', c.gender || 'Mixed', c.department || 'All', c.max_participants || 50]);
      }
    }

    if (store.equipment && store.equipment.length > 0) {
      for (const e of store.equipment) {
        d.run("INSERT OR REPLACE INTO equipment (id, name, category, total_quantity, available_quantity, issued_quantity, condition_status, location, sync_status) VALUES (?,?,?,?,?,?,?,'Sports Room','synced')",
          [e.id, e.name, e.category || '', e.total_quantity || 10, e.available_quantity || 10, e.issued_quantity || 0, e.condition_status || 'Good']);
      }
    }
    console.log("[LocalDB] Seeded SQLite database from local_db.json successfully!");
  } catch(e) {
    console.warn("[LocalDB] Seed notice:", e.message);
  }
}

function getDB() { return db; }

function closeDB() {
  if (db) {
    saveDB();
    // Force immediate save
    clearTimeout(saveTimer);
    try {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch(e) {}
    db.close();
    db = null;
    console.log("[LocalDB] Database closed and saved.");
  }
}

// ─── sql.js helper: run query and return rows as objects ───
function queryAll(sql, params = []) {
  if (!db) return [];
  try {
    const cleanParams = params.map(p => {
      if (p === null || p === undefined) return null;
      if (typeof p === 'object') return JSON.stringify(p);
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
    const stmt = db.prepare(sql);
    stmt.bind(cleanParams);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch(e) {
    console.error("[LocalDB] queryAll error:", e.message, "SQL:", sql);
    return [];
  }
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

const tableColumnsCache = {};

function getTableColumns(tableName) {
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];
  try {
    const cols = queryAll(`PRAGMA table_info(${tableName})`);
    const colSet = new Set(cols.map(c => c.name));
    tableColumnsCache[tableName] = colSet;
    return colSet;
  } catch(e) {
    return null;
  }
}

function run(sql, params = []) {
  if (!db) return;
  try {
    const cleanParams = params.map(p => {
      if (p === null || p === undefined) return null;
      if (typeof p === 'object') return JSON.stringify(p);
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
    db.run(sql, cleanParams);
    saveDB();
  } catch(e) {
    console.error("[LocalDB] run error:", e.message, "SQL:", sql);
  }
}

// ─── Settings ───
function getSetting(key) {
  const row = queryOne("SELECT value FROM app_settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

function setSetting(key, value) {
  run(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, strftime('%s','now'))
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    [key, String(value)]);
}

// ─── Generic CRUD ───
function upsertRecord(tableName, record) {
  if (!db || !record || !record.id) return null;
  const colSet = getTableColumns(tableName);
  const keys = Object.keys(record).filter(k => !colSet || colSet.has(k));
  if (keys.length === 0) return null;

  const placeholders = keys.map(() => "?").join(",");
  const updates = keys.filter(k => k !== "id").map(k => `${k}=excluded.${k}`).join(",");
  const vals = keys.map(k => {
    const v = record[k];
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });

  run(`INSERT INTO ${tableName} (${keys.join(",")}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`, vals);
  return record;
}

function getAll(tableName, where = "", params = []) {
  const w = where ? `WHERE ${where}` : "";
  return queryAll(`SELECT * FROM ${tableName} ${w} ORDER BY created_at DESC`, params);
}

function getById(tableName, id) {
  return queryOne(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
}

function deleteById(tableName, id) {
  run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
}

module.exports = {
  initDB, initDBSync, getDB, closeDB, saveDB,
  getSetting, setSetting,
  upsertRecord, getAll, getById, deleteById,
  queryAll, queryOne, run,
  get dbPath() { return DB_PATH; }
};
