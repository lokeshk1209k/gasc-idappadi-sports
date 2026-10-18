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
  // 1. Check for bundled preloaded database in app directory (portable mode)
  try {
    const localProjectDb = path.join(__dirname, "../../gasc_sports_local.db");
    if (fs.existsSync(localProjectDb)) {
      try {
        fs.accessSync(localProjectDb, fs.constants.W_OK);
        return localProjectDb;
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Check resources/app path in Electron packaged environment
  try {
    if (process.resourcesPath) {
      const resDb = path.join(process.resourcesPath, "app", "gasc_sports_local.db");
      if (fs.existsSync(resDb)) {
        try {
          fs.accessSync(resDb, fs.constants.W_OK);
          return resDb;
        } catch (e) {}
      }
    }
  } catch (e) {}

  // 3. UserData / AppData fallback
  try {
    const electron = require("electron");
    const app = electron.app || (electron.remote && electron.remote.app);
    if (app) {
      const userDb = path.join(app.getPath("userData"), "gasc_sports_local.db");
      return userDb;
    }
  } catch (e) {}

  const appData = process.env.APPDATA || '';
  if (appData) {
    const legacyDb = path.join(appData, "gasc-idappadi-sports-management", "gasc_sports_local.db");
    if (fs.existsSync(legacyDb)) return legacyDb;
    return path.join(appData, "GASC Sports Admin", "gasc_sports_local.db");
  }

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
      
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
      }

      // If DB file does not exist at DB_PATH, seed it from any available bundled database
      if (!fs.existsSync(DB_PATH)) {
        const candidateBundles = [
          path.join(__dirname, "../../gasc_sports_local.db"),
          path.join(process.resourcesPath || '', "app", "gasc_sports_local.db"),
          path.join(process.cwd(), "gasc_sports_local.db"),
          path.join(process.cwd(), "resources", "app", "gasc_sports_local.db")
        ];
        for (const candidate of candidateBundles) {
          if (candidate && fs.existsSync(candidate)) {
            try {
              fs.copyFileSync(candidate, DB_PATH);
              console.log("[LocalDB] Seeded fresh DB from template:", candidate);
              break;
            } catch (e) {}
          }
        }
      }

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
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
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
    CREATE TABLE IF NOT EXISTS external_registrations (
      id TEXT PRIMARY KEY, registration_id TEXT UNIQUE NOT NULL, competition_id TEXT NOT NULL,
      college_name TEXT NOT NULL, college_address TEXT, district TEXT, state TEXT,
      college_phone TEXT, college_email TEXT, registration_type TEXT DEFAULT 'INDIVIDUAL',
      sport_id TEXT, sport_name TEXT NOT NULL, gender TEXT NOT NULL,
      team_name TEXT, coach_name TEXT, coach_phone TEXT, manager_name TEXT, manager_phone TEXT,
      player_name TEXT, player_register_number TEXT, department TEXT, year TEXT,
      participant_email TEXT NOT NULL, participant_phone TEXT NOT NULL, supporting_document TEXT,
      otp_verified INTEGER DEFAULT 0, status TEXT DEFAULT 'PENDING',
      fee_amount REAL DEFAULT 0, payment_method TEXT DEFAULT 'MANUAL_UPI',
      payment_status TEXT DEFAULT 'PENDING_VERIFICATION', transaction_ref TEXT,
      payment_screenshot TEXT, payment_config_version INTEGER DEFAULT 1,
      payment_config_receiver TEXT, payment_config_upi_id TEXT,
      payment_verified_by TEXT, payment_verified_at INTEGER, payment_remarks TEXT,
      rejection_reason TEXT, correction_message TEXT, remarks TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS external_registration_players (
      id TEXT PRIMARY KEY, external_registration_id TEXT NOT NULL,
      player_name TEXT NOT NULL, college_register_number TEXT NOT NULL,
      department TEXT, year TEXT, gender TEXT, player_role TEXT DEFAULT 'Player',
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS external_otps (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, otp_code TEXT NOT NULL,
      competition_id TEXT, attempts INTEGER DEFAULT 0, expires_at INTEGER,
      verified INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS payment_settings (
      id TEXT PRIMARY KEY, receiver_name TEXT NOT NULL,
      gpay_number TEXT NOT NULL, upi_id TEXT NOT NULL, qr_image_url TEXT,
      payment_instructions TEXT, payment_mode TEXT DEFAULT 'MANUAL_UPI',
      is_enabled INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1,
      valid_from TEXT, valid_until TEXT, version INTEGER DEFAULT 1,
      updated_by TEXT DEFAULT 'Admin',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS payment_settings_history (
      id TEXT PRIMARY KEY, setting_id TEXT, version INTEGER,
      receiver_name TEXT, gpay_number TEXT, upi_id TEXT, qr_image_url TEXT,
      payment_mode TEXT, is_enabled INTEGER, change_summary TEXT,
      changed_by TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, registration_id TEXT, registration_code TEXT,
      tournament_id TEXT, tournament_name TEXT, competition_id TEXT, competition_name TEXT,
      provider TEXT DEFAULT 'RAZORPAY', provider_order_id TEXT, provider_payment_id TEXT,
      provider_signature TEXT, amount REAL DEFAULT 0, amount_paise INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'INR', status TEXT DEFAULT 'CREATED',
      payer_name TEXT, payer_email TEXT, payer_phone TEXT, college_name TEXT,
      registration_type TEXT DEFAULT 'INDIVIDUAL', payment_method TEXT, payment_method_detail TEXT,
      fee_breakdown TEXT, error_code TEXT, error_description TEXT,
      refund_id TEXT, refund_status TEXT, refund_amount REAL DEFAULT 0, refund_reason TEXT,
      refunded_at TEXT, refunded_by TEXT, verified_at TEXT,
      raw_order_payload TEXT, raw_payment_payload TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL, provider TEXT DEFAULT 'RAZORPAY',
      provider_order_id TEXT, provider_payment_id TEXT, payload TEXT,
      processed INTEGER DEFAULT 1, processing_error TEXT,
      received_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);

  // Safe migrations for separate registration fees, per-tournament receiver fields, and tournament/competition metadata
  const safeColumns = [
    { table: 'tournaments', col: 'tournament_name TEXT' },
    { table: 'tournaments', col: 'registration_token TEXT' },
    { table: 'tournaments', col: 'entry_fee REAL DEFAULT 0' },
    { table: 'tournaments', col: 'banner_image TEXT' },
    { table: 'tournaments', col: 'banner_url TEXT' },
    { table: 'tournaments', col: 'image_url TEXT' },
    { table: 'tournaments', col: 'type TEXT' },
    { table: 'tournaments', col: 'participation_type TEXT DEFAULT "INTER_COLLEGE"' },
    { table: 'tournaments', col: 'external_registration_enabled INTEGER DEFAULT 1' },
    { table: 'tournaments', col: 'registration_deadline TEXT' },
    { table: 'tournaments', col: 'contact_person TEXT' },
    { table: 'tournaments', col: 'contact_phone TEXT' },
    { table: 'tournaments', col: 'contact_email TEXT' },
    { table: 'tournaments', col: 'rules TEXT' },
    { table: 'tournaments', col: 'our_college_fee_enabled INTEGER DEFAULT 0' },
    { table: 'tournaments', col: 'our_college_fee REAL DEFAULT 0' },
    { table: 'tournaments', col: 'other_college_fee_enabled INTEGER DEFAULT 0' },
    { table: 'tournaments', col: 'other_college_fee REAL DEFAULT 0' },
    { table: 'tournaments', col: 'upi_id TEXT' },
    { table: 'tournaments', col: 'gpay_number TEXT' },
    { table: 'tournaments', col: 'receiver_name TEXT' },

    { table: 'competitions', col: 'tournament_name TEXT' },
    { table: 'competitions', col: 'registration_token TEXT' },
    { table: 'competitions', col: 'entry_fee REAL DEFAULT 0' },
    { table: 'competitions', col: 'banner_image TEXT' },
    { table: 'competitions', col: 'banner_url TEXT' },
    { table: 'competitions', col: 'type TEXT' },
    { table: 'competitions', col: 'level TEXT' },
    { table: 'competitions', col: 'participation_type TEXT DEFAULT "INTER_COLLEGE"' },
    { table: 'competitions', col: 'competition_mode TEXT DEFAULT "INDIVIDUAL"' },
    { table: 'competitions', col: 'external_registration_enabled INTEGER DEFAULT 1' },
    { table: 'competitions', col: 'start_time TEXT' },
    { table: 'competitions', col: 'end_time TEXT' },
    { table: 'competitions', col: 'registration_start TEXT' },
    { table: 'competitions', col: 'registration_end TEXT' },
    { table: 'competitions', col: 'registration_deadline TEXT' },
    { table: 'competitions', col: 'organizer TEXT' },
    { table: 'competitions', col: 'eligibility TEXT' },
    { table: 'competitions', col: 'contact_person TEXT' },
    { table: 'competitions', col: 'contact_phone TEXT' },
    { table: 'competitions', col: 'contact_email TEXT' },
    { table: 'competitions', col: 'our_college_fee_enabled INTEGER DEFAULT 0' },
    { table: 'competitions', col: 'our_college_fee REAL DEFAULT 0' },
    { table: 'competitions', col: 'other_college_fee_enabled INTEGER DEFAULT 0' },
    { table: 'competitions', col: 'other_college_fee REAL DEFAULT 0' },
    { table: 'competitions', col: 'upi_id TEXT' },
    { table: 'competitions', col: 'gpay_number TEXT' },
    { table: 'competitions', col: 'receiver_name TEXT' },

    { table: 'registrations', col: 'student_category TEXT DEFAULT "OUR_COLLEGE"' },
    { table: 'registrations', col: 'fee_amount REAL DEFAULT 0' },
    { table: 'registrations', col: 'payment_status TEXT DEFAULT "FREE"' },
    { table: 'registrations', col: 'transaction_ref TEXT' },
    { table: 'registrations', col: 'payment_id TEXT' },
    { table: 'registrations', col: 'order_id TEXT' }
  ];
  for (const { table, col } of safeColumns) {
    try { db.run(`ALTER TABLE ${table} ADD COLUMN ${col}`); } catch(e) {}
  }

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
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
