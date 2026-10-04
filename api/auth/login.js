const { supabase, bcrypt, generateToken, toCamelCase, setCorsHeaders } = require('../_utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { identifier: bodyId, registerNumber, email, username, password } = body || {};
    const identifier = (bodyId || registerNumber || email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide College Register Number and Password.'
      });
    }

    const cleanId = identifier.toLowerCase();
    if (cleanId === 'admin' || cleanId === 'sports_incharge' || cleanId === 'admin-sports' || cleanId === 'admin@gascidappadi.edu.in') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: This portal is exclusively for Students. Admin login is prohibited here.'
      });
    }

    // Query user by register_number or email
    let userRaw = null;
    const isEmail = identifier.includes('@');

    if (isEmail) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .ilike('email', identifier.toLowerCase())
        .maybeSingle();
      userRaw = byEmail;
    } else {
      const { data: byReg } = await supabase
        .from('users')
        .select('*')
        .ilike('register_number', identifier.toUpperCase())
        .maybeSingle();
      userRaw = byReg;

      if (!userRaw) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .ilike('email', identifier.toLowerCase())
          .maybeSingle();
        userRaw = byEmail;
      }
    }

    if (!userRaw) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials. Student account not found. Please register first.'
      });
    }

    if (userRaw.role === 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: Admin credentials cannot be used on Student Portal.'
      });
    }

    if (!userRaw.password || userRaw.role === 'roster') {
      return res.status(401).json({
        success: false,
        message: `Student record "${userRaw.name}" (${userRaw.register_number}) is verified in College Roster, but you have not completed registration yet. Please click "Register Profile" below to create your password.`
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, userRaw.password);
    if (!isMatch && password !== userRaw.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    if (userRaw.status === 'Suspended' || userRaw.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your student account is deactivated or suspended. Please contact Physical Directress.'
      });
    }

    const user = toCamelCase(userRaw);
    delete user.password;

    const token = generateToken(user.id);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
