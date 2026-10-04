/**
 * GASC Sports - Equipment Universal API Router
 * Handles all equipment operations on Vercel:
 * - GET  /api/equipment                      -> List all equipment
 * - GET  /api/equipment?action=lookup-student -> Lookup student & their active issues
 * - POST /api/equipment?action=issue          -> Issue equipment to student
 * - POST /api/equipment?action=return         -> Return equipment
 * - GET  /api/equipment?action=transactions   -> List all transactions
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id, x-portal-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  const rawUrl = req.url || '';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const query = req.query || {};
  const action = (query.action || parsedUrl.searchParams.get('action') || (rawUrl.includes('lookup-student') ? 'lookup-student' : '')).toLowerCase();

  try {
    // ──────── ACTION: LOOKUP STUDENT ────────
    if (action === 'lookup-student' || rawUrl.includes('lookup-student')) {
      const regNo = (query.regNo || query.registerNumber || parsedUrl.searchParams.get('regNo') || parsedUrl.searchParams.get('registerNumber') || '').trim();
      if (!regNo) {
        return res.status(400).json({ success: false, message: 'Register number is required.' });
      }

      const cleanReg = regNo.toUpperCase();

      // Check users table
      const { data: userRaw } = await supabase
        .from('users')
        .select('*')
        .or(`register_number.ilike.%${cleanReg}%,id.eq.${cleanReg}`)
        .neq('role', 'admin')
        .limit(1)
        .maybeSingle();

      let student = userRaw ? toCamelCase(userRaw) : null;

      // Check college_student_roster
      if (!student) {
        const { data: rosterRaw } = await supabase
          .from('college_student_roster')
          .select('*')
          .ilike('register_number', `%${cleanReg}%`)
          .limit(1)
          .maybeSingle();

        if (rosterRaw) {
          student = {
            id: `ros_${rosterRaw.id || rosterRaw.register_number}`,
            name: rosterRaw.name,
            registerNumber: rosterRaw.register_number,
            department: rosterRaw.department,
            year: rosterRaw.year,
            profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
            mobile: '',
            status: 'Active'
          };
        }
      }

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      // Find active issues
      const { data: notifRows } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'equipment')
        .order('created_at', { ascending: false });

      const activeIssues = [];
      const regCheck = (student.registerNumber || cleanReg).toLowerCase();

      if (notifRows) {
        for (const row of notifRows) {
          try {
            const t = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
            if (t && t.status === 'Issued') {
              const tReg = (t.registerNumber || t.register_number || row.sender || '').toLowerCase();
              if (tReg === regCheck || tReg.includes(regCheck) || regCheck.includes(tReg)) {
                activeIssues.push(toCamelCase(t));
              }
            }
          } catch (e) {}
        }
      }

      return res.status(200).json({
        success: true,
        student: {
          ...student,
          activeIssuesCount: activeIssues.length,
          activeIssues
        }
      });
    }

    // ──────── ACTION: ISSUE EQUIPMENT ────────
    if (action === 'issue' || rawUrl.includes('issue') || (req.method === 'POST' && req.body && req.body.studentIdentifier)) {
      const { studentIdentifier, equipmentId, quantity, expectedReturnDate, purpose, remarks } = req.body || {};
      if (!studentIdentifier || !equipmentId || !quantity || !expectedReturnDate) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
      }

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
      }

      // 1. Fetch equipment from Supabase
      const { data: eqItem, error: eqErr } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', equipmentId)
        .maybeSingle();

      if (eqErr || !eqItem) {
        return res.status(404).json({ success: false, message: 'Equipment not found.' });
      }

      const avail = (eqItem.available_quantity !== undefined) ? eqItem.available_quantity : (eqItem.availableQuantity || 0);
      if (avail < qty) {
        return res.status(400).json({ success: false, message: `Insufficient equipment available. Requested: ${qty}, Available: ${avail}` });
      }

      // 2. Resolve Student
      const cleanIdent = String(studentIdentifier).trim().toUpperCase();
      let student = null;

      const { data: uData } = await supabase
        .from('users')
        .select('*')
        .or(`register_number.ilike.%${cleanIdent}%,id.eq.${cleanIdent}`)
        .limit(1)
        .maybeSingle();

      if (uData) {
        student = {
          id: uData.id,
          name: uData.name,
          registerNumber: uData.register_number || cleanIdent,
          department: uData.department || '',
          year: uData.year || ''
        };
      } else {
        const { data: rData } = await supabase
          .from('college_student_roster')
          .select('*')
          .ilike('register_number', `%${cleanIdent}%`)
          .limit(1)
          .maybeSingle();

        if (rData) {
          student = {
            id: `ros_${rData.register_number || rData.id}`,
            name: rData.name,
            registerNumber: rData.register_number,
            department: rData.department || '',
            year: rData.year || ''
          };
        }
      }

      if (!student) {
        student = {
          id: `ros_${cleanIdent}`,
          name: cleanIdent,
          registerNumber: cleanIdent,
          department: 'General',
          year: 'Student'
        };
      }

      // 3. Update stock in Supabase
      const newIssued = (eqItem.issued_quantity || 0) + qty;
      const newAvail = Math.max(0, (eqItem.total_quantity || 0) - newIssued);
      let eqStatus = 'In Stock';
      if (newAvail === 0) eqStatus = 'Out of Stock';
      else if (newAvail <= (eqItem.minimum_stock || 5)) eqStatus = 'Low Stock';

      await supabase
        .from('equipment')
        .update({
          issued_quantity: newIssued,
          available_quantity: newAvail,
          status: eqStatus
        })
        .eq('id', equipmentId);

      // 4. Create transaction
      const now = new Date();
      const issueDateStr = now.toISOString();
      const issueTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const txRecord = {
        id: txId,
        studentId: student.id,
        student_id: student.id,
        studentName: student.name,
        student_name: student.name,
        registerNumber: student.registerNumber,
        register_number: student.registerNumber,
        equipmentId: equipmentId,
        equipment_id: equipmentId,
        equipmentName: eqItem.name,
        equipment_name: eqItem.name,
        quantity: qty,
        issueDate: issueDateStr,
        issue_date: issueDateStr,
        issueTime: issueTimeStr,
        issue_time: issueTimeStr,
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        expected_return_date: new Date(expectedReturnDate).toISOString(),
        status: 'Issued',
        returnCondition: 'Pending',
        return_condition: 'Pending',
        purpose: purpose || 'College Practice / Match',
        remarks: remarks || '',
        issuedBy: 'Physical Education Dept',
        issued_by: 'Physical Education Dept',
        createdAt: issueDateStr,
        created_at: issueDateStr,
        updatedAt: issueDateStr,
        updated_at: issueDateStr
      };

      // 5. Store in Supabase notifications as primary cloud event
      await supabase.from('notifications').upsert({
        id: txId,
        title: 'EQUIPMENT_ISSUE',
        category: 'equipment',
        type: 'equipment_transaction',
        sender: student.registerNumber,
        target_type: 'Specific Student',
        target_audience: student.registerNumber,
        priority: 'Normal',
        message: JSON.stringify(txRecord),
        created_at: issueDateStr
      });

      return res.status(200).json({
        success: true,
        message: `Equipment ${eqItem.name} successfully issued to ${student.name} (${student.registerNumber})`,
        transaction: txRecord
      });
    }

    // ──────── ACTION: RETURN EQUIPMENT ────────
    if (action === 'return' || rawUrl.includes('return') || (req.method === 'POST' && req.body && req.body.transactionId)) {
      const { transactionId, returnCondition, damageDescription, fineAmount, remarks } = req.body || {};
      if (!transactionId) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
      }

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

      // Update stock
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

      // Update notification
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
    }

    // ──────── ACTION: TRANSACTIONS ────────
    if (action === 'transactions' || rawUrl.includes('transactions')) {
      const { data: notifRows, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'equipment')
        .order('created_at', { ascending: false });

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
    }

    // ──────── DEFAULT: GET ALL EQUIPMENT ────────
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const items = (data || []).map(toCamelCase);
    return res.status(200).json({
      success: true,
      count: items.length,
      equipment: items
    });
  } catch (err) {
    console.error('Universal equipment handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
