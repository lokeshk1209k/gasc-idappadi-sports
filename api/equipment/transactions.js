const { supabase, toCamelCase } = require('../_utils');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id, x-portal-type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
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
