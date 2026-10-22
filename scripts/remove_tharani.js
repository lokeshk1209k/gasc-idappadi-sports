const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { supabase } = require('../server/config/supabase');

(async () => {
  console.log('--- STARTING COMPLETE REMOVAL OF THARANI (C24UG183CSC048) ---');

  // 1. Clean local_db.json
  const localDbPath = path.join(__dirname, 'server/data/local_db.json');
  if (fs.existsSync(localDbPath)) {
    const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    let totalRemoved = 0;
    for (const [table, rows] of Object.entries(db)) {
      if (Array.isArray(rows)) {
        const before = rows.length;
        db[table] = rows.filter(r => {
          const str = JSON.stringify(r).toLowerCase();
          return !str.includes('c24ug183csc048') && !str.includes('tharani');
        });
        const diff = before - db[table].length;
        if (diff > 0) {
          console.log(`Removed ${diff} record(s) from table ${table} in local_db.json`);
          totalRemoved += diff;
        }
      }
    }
    fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log('Updated local_db.json successfully.');
  }

  // 2. Clean all roster.json files
  const rosterFiles = [
    path.join(__dirname, 'client/public/roster.json'),
    path.join(__dirname, 'student-client/public/roster.json'),
    path.join(__dirname, 'student-client/dist/roster.json'),
    path.join(__dirname, 'public/roster.json'),
    path.join(__dirname, 'dist/roster.json')
  ];
  for (const rf of rosterFiles) {
    if (fs.existsSync(rf)) {
      try {
        const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
        const list = Array.isArray(data) ? data : (data.roster || []);
        const before = list.length;
        const filtered = list.filter(r => {
          const str = JSON.stringify(r).toLowerCase();
          return !str.includes('c24ug183csc048') && !str.includes('tharani');
        });
        if (Array.isArray(data)) {
          fs.writeFileSync(rf, JSON.stringify(filtered, null, 2), 'utf8');
        } else {
          data.roster = filtered;
          data.count = filtered.length;
          fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8');
        }
        console.log(`Cleaned ${rf}: ${before} -> ${filtered.length}`);
      } catch(e) {
        console.error('Error cleaning roster file:', rf, e.message);
      }
    }
  }

  // 3. Clean SQLite databases
  const SQL = await initSqlJs();
  const sqlitePaths = [
    path.join(__dirname, 'gasc_sports_local.db'),
    path.join(process.env.APPDATA || '', 'gasc-idappadi-sports-management', 'gasc_sports_local.db')
  ];
  for (const sp of sqlitePaths) {
    if (fs.existsSync(sp)) {
      try {
        const dbBuf = fs.readFileSync(sp);
        const sdb = new SQL.Database(dbBuf);
        const tables = ['students', 'registrations', 'teams', 'team_members', 'equipment_transactions', 'achievements', 'sync_queue', 'sync_history'];
        for (const t of tables) {
          try {
            sdb.run(`DELETE FROM ${t} WHERE register_number = 'C24UG183CSC048' OR name LIKE '%tharani%'`);
          } catch(e) {}
        }
        const data = sdb.export();
        fs.writeFileSync(sp, Buffer.from(data));
        console.log('Cleaned SQLite file:', sp);
      } catch(e) {
        console.error('Error cleaning SQLite:', sp, e.message);
      }
    }
  }

  // 4. Clean Supabase Cloud DB
  if (supabase) {
    console.log('Cleaning Supabase Cloud Database...');
    try {
      await supabase.from('notifications').delete().ilike('title', '%C24UG183CSC048%');
      await supabase.from('notifications').delete().ilike('message', '%tharani%');
      await supabase.from('notifications').delete().ilike('message', '%C24UG183CSC048%');
      console.log('Deleted notifications from Supabase.');
    } catch(e) {
      console.warn('Supabase notif delete warning:', e.message);
    }
    try {
      await supabase.from('users').delete().ilike('register_number', 'C24UG183CSC048');
      await supabase.from('users').delete().ilike('name', '%tharani%');
      console.log('Deleted user records from Supabase.');
    } catch(e) {
      console.warn('Supabase users delete warning:', e.message);
    }
    try {
      await supabase.from('college_student_roster').delete().ilike('register_number', 'C24UG183CSC048');
    } catch(e) {}
    try {
      await supabase.from('students').delete().ilike('register_number', 'C24UG183CSC048');
    } catch(e) {}
  }

  // 5. Clean D: drive local_db.json files if accessible
  const dPaths = [
    'D:/GASC-Admin-Build/GASC Sports Admin-win32-x64/resources/app/server/data/local_db.json',
    'D:/GASC-Sports-Admin-Portable/GASC Sports Admin-win32-x64/resources/app/server/data/local_db.json',
    'D:/GASC-Sports-Admin-Portable/GASC-Sports-Admin-Portable/resources/app/server/data/local_db.json',
    'D:/GASC-Sports-Admin-v1.4/GASC Sports Admin-win32-x64/resources/app/server/data/local_db.json'
  ];
  for (const dp of dPaths) {
    if (fs.existsSync(dp)) {
      try {
        const dJson = JSON.parse(fs.readFileSync(dp, 'utf8'));
        for (const [table, rows] of Object.entries(dJson)) {
          if (Array.isArray(rows)) {
            dJson[table] = rows.filter(r => {
              const str = JSON.stringify(r).toLowerCase();
              return !str.includes('c24ug183csc048') && !str.includes('tharani');
            });
          }
        }
        fs.writeFileSync(dp, JSON.stringify(dJson, null, 2), 'utf8');
        console.log('Cleaned D: drive file:', dp);
      } catch(e) {
        console.warn('Could not update', dp, e.message);
      }
    }
  }

  console.log('--- THARANI COMPLETELY REMOVED FROM ALL DATABASES ---');
})();
