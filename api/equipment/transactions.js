/**
 * GASC Sports - Equipment Transactions
 * Self-contained serverless function
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const out = {};
  for (const k of Object.keys(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    out[ck] = obj[k];
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id, x-portal-type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const { data: notifRows, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('category', 'equipment')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    }

    const transactions = [];
    if (notifRows) {
      for (const row of notifRows) {
        try {
          const t = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
          if (t && t.id) {
            transactions.push(toCamelCase(t));
          }
        } catch (e) {}
      }
    }

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error('transactions error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
