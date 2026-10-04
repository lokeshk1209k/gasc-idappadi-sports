/**
 * GASC Sports - Lookup Student for Equipment Issue
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
    const regNo = (req.query && (req.query.regNo || req.query.registerNumber)) || '';
    if (!regNo) {
      return res.status(400).json({ success: false, message: 'Register number is required.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const cleanReg = regNo.toUpperCase();

    // 1. Check users table
    const { data: userRaw } = await supabase
      .from('users')
      .select('*')
      .or(`register_number.ilike.%${cleanReg}%,id.eq.${cleanReg}`)
      .neq('role', 'admin')
      .limit(1)
      .maybeSingle();

    let student = userRaw ? toCamelCase(userRaw) : null;

    // 2. Check college_student_roster
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

    // 3. Find active issues from notifications
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
  } catch (err) {
    console.error('lookup-student error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
