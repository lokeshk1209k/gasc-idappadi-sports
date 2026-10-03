require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const parsed = new URL(SUPABASE_URL);

function execRPC(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: parsed.hostname,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 300) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Try using supabase-js client with admin privileges to run arbitrary SQL
// by inserting a special "migration" record if a migrations table exists
async function tryInsert() {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const SQL1 = `CREATE TABLE IF NOT EXISTS external_competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  sport TEXT DEFAULT 'General',
  level TEXT DEFAULT 'Inter-College',
  type TEXT DEFAULT 'Individual',
  organizer TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  district TEXT DEFAULT '',
  state TEXT DEFAULT 'Tamil Nadu',
  start_date DATE,
  end_date DATE,
  registration_start_date DATE,
  registration_deadline DATE,
  eligibility TEXT DEFAULT '',
  age_limit TEXT DEFAULT '',
  gender TEXT DEFAULT 'All',
  participation_type TEXT DEFAULT 'Individual',
  description TEXT DEFAULT '',
  announcement_summary TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  registration_url TEXT DEFAULT '',
  image TEXT DEFAULT '',
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`;

  const SQL2 = `CREATE TABLE IF NOT EXISTS sports_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  short_summary TEXT NOT NULL DEFAULT '',
  full_description TEXT DEFAULT '',
  sport TEXT DEFAULT 'General',
  category TEXT DEFAULT 'General Sports News',
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  published_date DATE DEFAULT CURRENT_DATE,
  image TEXT DEFAULT '',
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`;

  // Try via pg-meta API (Supabase's internal metadata service)
  for (const [name, sql] of [['external_competitions', SQL1], ['sports_news', SQL2]]) {
    // Try RPC
    const r = await execRPC(sql);
    if (r.status === 200 || r.status === 201) {
      console.log(`✅ Table "${name}" created via RPC`);
    } else {
      console.log(`ℹ️  RPC not available (${r.status}). Trying Supabase.from insert...`);
      
      // Check if already exists
      const { error: chk } = await admin.from(name).select('id').limit(1);
      if (!chk) {
        console.log(`✅ Table "${name}" already exists!`);
      } else {
        console.log(`❌ Table "${name}" needs manual creation.`);
        console.log('\nSQL to run in Supabase Dashboard > SQL Editor:');
        console.log('-------------------------------------------');
        console.log(sql);
        console.log('-------------------------------------------\n');
      }
    }
  }
}

tryInsert().catch(console.error).finally(() => process.exit(0));
