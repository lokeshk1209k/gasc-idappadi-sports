/**
 * GASC Idappadi — Apply Inter-College Open Registration SQL Migration
 * Runs the supabase_inter_college_open_registration.sql via pg/Supabase management API
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function applyMigration() {
  console.log('🚀 Applying inter-college migration to Supabase...');

  // Step-by-step DDL: each statement separately
  const statements = [
    // tournaments enhancements
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS participation_type TEXT DEFAULT 'INTERNAL'`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS external_registration_enabled BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_token TEXT`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'OPEN'`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS contact_person TEXT`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS contact_phone TEXT`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS contact_email TEXT`,
    `ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS rules TEXT`,
    // competitions enhancements
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS participation_type TEXT DEFAULT 'INTERNAL'`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS competition_mode TEXT DEFAULT 'INDIVIDUAL'`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS external_registration_enabled BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS registration_token TEXT`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS max_colleges INTEGER DEFAULT 50`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 30`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS required_players INTEGER DEFAULT 1`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS substitutes INTEGER DEFAULT 0`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS contact_person TEXT`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS contact_phone TEXT`,
    `ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS contact_email TEXT`,
    // external_registrations
    `CREATE TABLE IF NOT EXISTS public.external_registrations (
      id TEXT PRIMARY KEY,
      registration_id TEXT UNIQUE NOT NULL,
      tournament_id TEXT,
      competition_id TEXT NOT NULL,
      college_name TEXT NOT NULL,
      college_address TEXT,
      district TEXT,
      state TEXT DEFAULT 'Tamil Nadu',
      college_phone TEXT,
      college_email TEXT,
      registration_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
      sport_id TEXT,
      sport_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      team_name TEXT,
      coach_name TEXT,
      coach_phone TEXT,
      manager_name TEXT,
      manager_phone TEXT,
      player_name TEXT,
      player_register_number TEXT,
      department TEXT,
      year TEXT,
      participant_email TEXT NOT NULL,
      participant_phone TEXT NOT NULL,
      supporting_document TEXT,
      otp_verified BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'PENDING',
      rejection_reason TEXT,
      correction_message TEXT,
      remarks TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // external_registration_players
    `CREATE TABLE IF NOT EXISTS public.external_registration_players (
      id TEXT PRIMARY KEY,
      external_registration_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      college_register_number TEXT NOT NULL,
      department TEXT,
      year TEXT,
      gender TEXT,
      player_role TEXT DEFAULT 'Player',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // external_otps
    `CREATE TABLE IF NOT EXISTS public.external_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      tournament_id TEXT,
      competition_id TEXT,
      attempts INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // notification_logs
    `CREATE TABLE IF NOT EXISTS public.notification_logs (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      email TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      status TEXT DEFAULT 'SENT',
      error_message TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW()
    )`
  ];

  let passed = 0, failed = 0;

  for (const sql of statements) {
    const label = sql.trim().substring(0, 80).replace(/\s+/g, ' ');
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        // Try raw pg via management API approach
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          },
          body: JSON.stringify({ sql })
        });
        if (!response.ok) {
          const body = await response.text();
          console.warn(`  ⚠️  [SKIP] ${label}...\n     Reason: ${body.substring(0, 120)}`);
          failed++;
        } else {
          console.log(`  ✅ [OK] ${label}...`);
          passed++;
        }
      } else {
        console.log(`  ✅ [OK] ${label}...`);
        passed++;
      }
    } catch (e) {
      console.warn(`  ⚠️  [SKIP] ${label}...\n     ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Migration complete: ${passed} passed, ${failed} skipped/failed`);
  console.log('💡 If statements were skipped, run supabase_inter_college_open_registration.sql manually in Supabase SQL Editor.');
  console.log('📎 Supabase Dashboard: https://supabase.com/dashboard/project/yemypfgunokxfufnqvdh/sql/new');
}

applyMigration().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
