const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables dynamically from all standard locations
[
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'resources/app/.env')
].forEach(envPath => {
  dotenv.config({ path: envPath });
});

const getSupabaseUrl = () => (process.env.SUPABASE_URL || '').trim();
const getSupabaseKey = () => (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

let supabase = null;

function initSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (url && key && url.startsWith('http')) {
    try {
      supabase = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          enabled: false
        }
      });
      console.log('⚡ Supabase Client initialized successfully!');
      return supabase;
    } catch (error) {
      console.error('⚠️ Supabase Initialization Error:', error.message);
      return null;
    }
  } else {
    console.log('ℹ️ Supabase credentials not set in .env.');
    return null;
  }
}

// Initial attempt
initSupabaseClient();

const isSupabaseConfigured = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!supabase && url && key && url.startsWith('http')) {
    initSupabaseClient();
  }
  return !!(url && key && url.startsWith('http') && supabase);
};

module.exports = {
  get supabase() {
    if (!supabase) initSupabaseClient();
    return supabase;
  },
  isSupabaseConfigured,
  get supabaseUrl() { return getSupabaseUrl(); },
  get supabaseKey() { return getSupabaseKey(); }
};
