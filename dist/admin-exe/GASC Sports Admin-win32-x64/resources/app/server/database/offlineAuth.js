/**
 * GASC Sports Admin - Offline Authentication Module (sql.js version)
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const localDB = require("./localDB");
const crypto = require("crypto");
const uuidv4 = () => crypto.randomUUID();

const JWT_SECRET = process.env.JWT_SECRET || "gasc_idappadi_sports_secret_jwt_key_2026";
const TOKEN_EXPIRY = "365d";

async function ensureDB() {
  if (localDB.getDB()) return localDB.getDB();
  return await localDB.initDB();
}

async function cacheAdminSession(adminUser, plainPassword, token) {
  await ensureDB();
  try {
    let passwordHash = null;
    if (plainPassword) passwordHash = bcrypt.hashSync(plainPassword, 10);
    const tokenExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    localDB.run(`
      INSERT INTO admin_sessions (id,email,name,department,role,password_hash,token,token_expires_at,last_login,updated_at)
      VALUES (?,?,?,?,?,?,?,?,strftime('%s','now'),strftime('%s','now'))
      ON CONFLICT(email) DO UPDATE SET
        name=excluded.name, department=excluded.department,
        password_hash=COALESCE(excluded.password_hash,password_hash),
        token=excluded.token, token_expires_at=excluded.token_expires_at,
        last_login=excluded.last_login, updated_at=excluded.updated_at
    `, [
      adminUser.id || uuidv4(), adminUser.email, adminUser.name,
      adminUser.department || "Physical Education & Sports",
      adminUser.role || "admin", passwordHash, token, tokenExpiry
    ]);
    console.log("[OfflineAuth] Admin session cached:", adminUser.email);
  } catch(err) { console.error("[OfflineAuth] Cache error:", err.message); }
}

async function offlineLogin(emailOrUsername, password) {
  await ensureDB();
  try {
    let session = localDB.queryOne(`SELECT * FROM admin_sessions WHERE email=? OR email LIKE ?`, [emailOrUsername, `%${emailOrUsername}%`]);
    if (!session && emailOrUsername === "admin") {
      session = localDB.queryOne(`SELECT * FROM admin_sessions WHERE role='admin' ORDER BY last_login DESC LIMIT 1`);
    }
    if (!session) return { success: false, message: "No cached credentials found. Please login online first." };
    if (!session.password_hash) return { success: false, message: "No offline credentials stored. Please login online at least once." };
    const valid = bcrypt.compareSync(password, session.password_hash);
    if (!valid) return { success: false, message: "Incorrect password." };
    const token = jwt.sign({ id: session.id, email: session.email, name: session.name, role: session.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    localDB.run(`UPDATE admin_sessions SET token=?,last_login=strftime('%s','now') WHERE email=?`, [token, session.email]);
    return { success: true, offline: true, token, user: { id: session.id, name: session.name, email: session.email, role: session.role, department: session.department } };
  } catch(err) { return { success: false, message: "Offline login error: " + err.message }; }
}

function verifyTokenOffline(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch(err) { return { valid: false, error: err.message }; }
}

async function hasCachedAdminSession() {
  await ensureDB();
  const row = localDB.queryOne(`SELECT COUNT(*) as cnt FROM admin_sessions WHERE role='admin'`);
  return row && row.cnt > 0;
}

module.exports = { cacheAdminSession, offlineLogin, verifyTokenOffline, hasCachedAdminSession };
