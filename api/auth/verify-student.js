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

    // Query official roster in users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, register_number, email, role, status, department, year, gender, section')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    if (error) {
      console.error('Verify student db error:', error);
      return res.status(500).json({ success: false, message: 'Database query error.' });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        isRegistered: false,
        isPreEnrolled: false,
        message: 'Your Register Number was not found in the official college student roster. You cannot create a Student Portal account.'
      });
    }

    if (user.status && user.status.toUpperCase() === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        isInactive: true,
        isPreEnrolled: false,
        isRegistered: false,
        message: 'Your student record is currently inactive. Please contact the Sports Administration.'
      });
    }

    if (user.role === 'student' && user.password) {
      return res.json({
        success: false,
        isRegistered: true,
        isPreEnrolled: false,
        message: `An account already exists for this Register Number (${user.register_number || cleanRegNo}). Please login using your registered email and password.`
      });
    }

    return res.json({
      success: true,
      verified: true,
      isRegistered: false,
      isPreEnrolled: true,
      message: 'Register Number verified successfully.',
      student: toCamelCase(user)
    });
  } catch (err) {
    console.error('verify-student error:', err);
    return res.status(500).json({ success: false, message: 'Unable to verify your Register Number right now.' });
  }
};
