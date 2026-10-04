#!/usr/bin/env node
/**
 * prepare-vercel-data.js
 * ──────────────────────
 * Runs BEFORE `vite build` to copy the latest local_db.json into
 * the student-client/api/data/ directory so that Vercel serverless
 * functions can read up-to-date tournament and competition data.
 *
 * Usage: node prepare-vercel-data.js
 * (automatically called by `npm run build` in student-client/package.json)
 */

const fs = require('fs');
const path = require('path');

// ── Source: Live admin database ───────────────────────────────────────────────
const SOURCE_PATHS = [
  // Primary: shared scratch DB (where admin writes)
  path.resolve(__dirname, '..', 'server', 'data', 'local_db.json'),
  // Fallback: project root
  path.resolve(__dirname, '..', 'local_db.json'),
];

// ── Destination: inside api/data/ (read by serverless functions) ───────────────
const DEST_DIR = path.resolve(__dirname, 'api', 'data');
const DEST_FILE = path.join(DEST_DIR, 'local_db.json');

// Also copy to public/ so the SPA can read static data as fallback
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PUBLIC_FILE = path.join(PUBLIC_DIR, 'competitions.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${dir}`);
  }
}

function copyDbFile() {
  ensureDir(DEST_DIR);
  ensureDir(PUBLIC_DIR);

  let sourceFile = null;
  for (const p of SOURCE_PATHS) {
    if (fs.existsSync(p)) {
      sourceFile = p;
      break;
    }
  }

  if (!sourceFile) {
    console.warn('⚠️  No local_db.json found. Vercel API will use empty data.');
    // Write empty placeholder
    const empty = { users: [], competitions: [], tournaments: [], sports: [], notifications: [], teams: [], team_members: [], competition_registrations: [] };
    fs.writeFileSync(DEST_FILE, JSON.stringify(empty, null, 2));
    fs.writeFileSync(PUBLIC_FILE, JSON.stringify({ competitions: [], tournaments: [] }, null, 2));
    return;
  }

  // Read and parse db
  const db = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

  // Strip sensitive data (passwords) before bundling
  const sanitizedDb = {
    ...db,
    users: (db.users || []).map(u => ({
      ...u,
      password: undefined, // remove hashed passwords from client bundle
    })),
  };

  // Write full sanitized DB for serverless functions
  fs.writeFileSync(DEST_FILE, JSON.stringify(sanitizedDb, null, 2));
  console.log(`✅ Copied local_db.json → api/data/local_db.json (${(db.competitions||[]).length} competitions, ${(db.tournaments||[]).length} tournaments)`);

  // Write lightweight competitions.json for SPA static fallback
  const competitionsJson = {
    generatedAt: new Date().toISOString(),
    competitions: (db.competitions || []).map(c => ({
      id: c.id,
      name: c.name,
      tournamentName: c.tournament_name || c.tournamentName || 'Tournament',
      tournament_name: c.tournament_name || c.tournamentName || 'Tournament',
      sportName: c.sport_name || c.sportName || c.name || 'Sport',
      sport_name: c.sport_name || c.sportName || c.name || 'Sport',
      type: c.type || 'Individual',
      venue: c.venue || 'GASC Sports Ground',
      date: c.date,
      registrationEnd: c.registration_end || c.registrationEnd,
      maxParticipants: c.max_participants || c.maxParticipants || 50,
      currentRegistrations: c.current_registrations || c.currentRegistrations || 0,
      status: c.status || 'Registration Open',
      description: c.description || '',
      bannerImage: '/images/sports/tournament.png',
    })),
    tournaments: (db.tournaments || []).map(t => ({
      id: t.id,
      name: t.name || t.tournament_name,
      tournamentName: t.tournament_name || t.name,
      description: t.description || `Official ${t.name} Tournament.`,
      venue: t.venue || 'GASC Sports Ground',
      date: t.date,
      registrationEnd: t.registration_end || t.registrationEnd,
      status: t.status || 'Registration Open',
      bannerImage: t.banner_image || t.bannerImage || '/images/sports/tournament.png',
    })),
  };

  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(competitionsJson, null, 2));
  console.log(`✅ Generated public/competitions.json (SPA static fallback)`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Source: ${sourceFile}`);
  console.log(`   - Competitions: ${(db.competitions || []).length}`);
  console.log(`   - Tournaments: ${(db.tournaments || []).length}`);
  console.log(`   - Users: ${(db.users || []).length} (passwords stripped)`);
  console.log(`   - Registrations: ${(db.competition_registrations || []).length}`);
}

try {
  console.log('\n🚀 Preparing Vercel data...\n');
  copyDbFile();
  console.log('\n✨ Data preparation complete. Running vite build next...\n');
} catch (err) {
  console.error('❌ Error preparing Vercel data:', err.message);
  process.exit(1);
}
