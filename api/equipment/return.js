/**
 * GASC Sports - Return Equipment
 * Self-contained serverless function
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id, x-portal-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { transactionId, returnCondition, damageDescription, fineAmount, remarks } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // 1. Fetch transaction from notifications
    const { data: row } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    let tx = null;
    if (row && row.message) {
      try {
        tx = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
      } catch (e) {}
    }

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const returnNow = new Date();
    const returnDateStr = returnNow.toISOString();
    const returnTimeStr = returnNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    let newStatus = 'Returned';
    if (returnCondition === 'Damaged') newStatus = 'Damaged';
    else if (returnCondition === 'Lost') newStatus = 'Lost';

    tx.status = newStatus;
    tx.returnDate = returnDateStr;
    tx.return_date = returnDateStr;
    tx.returnTime = returnTimeStr;
    tx.return_time = returnTimeStr;
    tx.returnCondition = returnCondition || 'Good';
    tx.return_condition = returnCondition || 'Good';
    tx.damageDescription = damageDescription || '';
    tx.damage_description = damageDescription || '';
    tx.fineAmount = parseFloat(fineAmount) || 0;
    tx.fine_amount = parseFloat(fineAmount) || 0;
    tx.remarks = remarks ? `${tx.remarks || ''} | ${remarks}` : (tx.remarks || '');
    tx.updatedAt = returnDateStr;
    tx.updated_at = returnDateStr;

    // 2. Update stock on equipment
    const eqId = tx.equipmentId || tx.equipment_id;
    if (eqId) {
      const { data: eqItem } = await supabase.from('equipment').select('*').eq('id', eqId).maybeSingle();
      if (eqItem) {
        const qty = tx.quantity || 1;
        const newIssued = Math.max(0, (eqItem.issued_quantity || 0) - qty);
        const newAvail = Math.max(0, (eqItem.total_quantity || 0) - newIssued);
        await supabase.from('equipment').update({
          issued_quantity: newIssued,
          available_quantity: newAvail
        }).eq('id', eqId);
      }
    }

    // 3. Update notification in Supabase
    await supabase.from('notifications').upsert({
      id: transactionId,
      title: 'EQUIPMENT_RETURNED',
      category: 'equipment',
      type: 'equipment_transaction',
      sender: tx.registerNumber || tx.register_number,
      target_type: 'Specific Student',
      target_audience: tx.registerNumber || tx.register_number,
      priority: 'Normal',
      message: JSON.stringify(tx),
      created_at: row.created_at || returnDateStr
    });

    return res.status(200).json({
      success: true,
      message: 'Equipment returned successfully.',
      transaction: tx
    });
  } catch (err) {
    console.error('api/equipment/return error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
