/**
 * GASC Sports - My Equipment Serverless Endpoint
 * Returns issued and returned equipment for the logged-in student
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const regNo = (
      req.query.registerNumber ||
      req.query.studentId ||
      req.headers['x-register-number'] ||
      req.headers['x-student-id'] ||
      ''
    ).trim();

    if (!regNo) {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // Query transactions from Supabase notifications store
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('category', 'equipment')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase equipment query error:', error.message);
    }

    const transactions = [];
    const cleanReg = regNo.toLowerCase();

    if (rows && rows.length > 0) {
      for (const r of rows) {
        try {
          const t = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
          if (!t) continue;
          const sender = (r.sender || '').toLowerCase();
          const target = (r.target_audience || '').toLowerCase();
          const tReg = (t.registerNumber || t.regNo || t.register_number || '').toLowerCase();
          const tStudentId = (t.studentId || '').toString().toLowerCase();

          if (
            sender === cleanReg ||
            target.includes(cleanReg) ||
            tReg === cleanReg ||
            tStudentId === cleanReg
          ) {
            transactions.push(t);
          }
        } catch (e) {}
      }
    }

    const now = new Date();
    const activeIssued = [];
    const history = [];

    transactions.forEach(t => {
      const item = toCamelCase(t);
      const isPastExpected = item.status === 'Issued' && new Date(item.expectedReturnDate) < now;
      item.isOverdue = isPastExpected;
      if (isPastExpected) {
        const diffMs = now.getTime() - new Date(item.expectedReturnDate).getTime();
        item.daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        item.daysOverdue = 0;
      }

      if (item.status === 'Issued') {
        activeIssued.push(item);
      } else {
        history.push(item);
      }
    });

    const stats = {
      currentlyIssued: activeIssued.length,
      returned: history.length,
      overdue: activeIssued.filter(i => i.isOverdue).length
    };

    return res.status(200).json({
      success: true,
      count: transactions.length,
      activeIssued,
      history,
      stats
    });
  } catch (err) {
    console.error('my-equipment handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
