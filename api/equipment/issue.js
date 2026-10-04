/**
 * GASC Sports - Issue Equipment
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-register-number, x-student-id, x-portal-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentIdentifier, equipmentId, quantity, expectedReturnDate, purpose, remarks } = req.body || {};
    if (!studentIdentifier || !equipmentId || !quantity || !expectedReturnDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

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

    // Check users table
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
      // Check college_student_roster
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
  } catch (err) {
    console.error('api/equipment/issue error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
