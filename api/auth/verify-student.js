const { supabase, toCamelCase, setCorsHeaders } = require('../_utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const registerNumber = req.query.regNo || req.query.registerNumber || (req.url.split('/').pop().split('?')[0]);

    if (!registerNumber || registerNumber === 'verify-student') {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const cleanNoZeros = cleanRegNo.replace(/0(?=[0-9]+$)/, '');

    // 1. Check if user already registered a real student account
    const { data: usersFound } = await supabase
      .from('users')
      .select('id, name, register_number, email, role, status, department, year, gender, section')
      .or(`register_number.ilike.%${cleanRegNo}%,register_number.ilike.%${cleanNoZeros}%`);

    if (usersFound && usersFound.length > 0) {
      const activeStudent = usersFound.find(u => u.role === 'student');
      if (activeStudent) {
        return res.json({
          success: false,
          isRegistered: true,
          isPreEnrolled: false,
          message: `An account already exists for this Register Number (${activeStudent.register_number || cleanRegNo}). Please login instead.`
        });
      }

      const rosterUser = usersFound.find(u => u.role === 'roster' || u.role !== 'student');
      if (rosterUser) {
        if (rosterUser.status && rosterUser.status.toUpperCase() === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            isInactive: true,
            isPreEnrolled: false,
            isRegistered: false,
            message: 'Your Register Number exists in the college roster, but your student status is currently inactive. Please contact the Sports Administration.'
          });
        }

        return res.json({
          success: true,
          verified: true,
          isRegistered: false,
          isPreEnrolled: true,
          message: 'Your Register Number has been verified successfully.',
          student: toCamelCase(rosterUser)
        });
      }
    }

    // 2. Check Supabase notifications table for Real-Time Roster entry
    const { data: notifRows } = await supabase
      .from('notifications')
      .select('*')
      .eq('category', 'roster')
      .or(`title.ilike.%${cleanRegNo}%,title.ilike.%${cleanNoZeros}%`);

    if (notifRows && notifRows.length > 0) {
      const notif = notifRows[0];
      let parsed = {};
      try { parsed = JSON.parse(notif.message); } catch (e) {}

      if (parsed.status && parsed.status.toUpperCase() === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          isInactive: true,
          isPreEnrolled: false,
          isRegistered: false,
          message: 'Your Register Number exists in the college roster, but your student status is currently inactive. Please contact the Sports Administration.'
        });
      }

      return res.json({
        success: true,
        verified: true,
        isRegistered: false,
        isPreEnrolled: true,
        message: 'Your Register Number has been verified successfully.',
        student: {
          registerNumber: parsed.registerNumber || notif.title,
          name: parsed.name || notif.title,
          department: parsed.department || notif.target_type || 'Computer Science',
          year: parsed.year || notif.target_audience || 'I Year',
          section: parsed.section || 'A',
          gender: parsed.gender || notif.priority || 'Male',
          status: parsed.status || 'Active'
        }
      });
    }

    // 3. Not found in official roster -> BLOCK
    return res.status(404).json({
      success: false,
      isRegistered: false,
      isPreEnrolled: false,
      message: 'Your Register Number was not found in the official college student roster. You cannot create a Student Portal account using this Register Number. Please contact the college Sports Administration.'
    });
  } catch (err) {
    console.error('verify-student error:', err);
    return res.status(500).json({ success: false, message: 'Unable to verify your Register Number right now. Please check your internet connection and try again.' });
  }
};
