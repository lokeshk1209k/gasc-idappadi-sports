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
    const {
      registerNumber,
      email,
      password,
      phone,
      mobile
    } = body || {};

    if (!registerNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Register Number, Email, and Password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();
    const cleanPhone = (phone || mobile || '').trim();

    // 1. Check if user already exists in roster
    const { data: rosterUser } = await supabase
      .from('users')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    if (!rosterUser) {
      return res.status(404).json({
        success: false,
        message: 'Your Register Number was not found in the official college student roster. You cannot create a Student Portal account.'
      });
    }

    if (rosterUser.status && rosterUser.status.toUpperCase() === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your student record is currently inactive. Please contact the Sports Administration.'
      });
    }

    if (rosterUser.role === 'student' && rosterUser.password) {
      return res.status(400).json({
        success: false,
        message: `An account already exists for Register Number (${cleanRegNo}). Please login using your registered email and password.`
      });
    }

    // 2. Check if email is already used by another student
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id, role, password')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingEmail && existingEmail.role === 'student' && existingEmail.password && existingEmail.id !== rosterUser.id) {
      return res.status(400).json({
        success: false,
        message: `This email address (${cleanEmail}) is already associated with an account. Please use another email or login.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Update roster user to full student account
    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update({
        email: cleanEmail,
        password: hashedPassword,
        role: 'student',
        mobile: cleanPhone || rosterUser.mobile,
        status: 'Active',
        updated_at: new Date().toISOString()
      })
      .eq('id', rosterUser.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Update student user error:', updateErr);
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    const user = toCamelCase(updatedUser);
    delete user.password;

    const token = generateToken(user.id);

    return res.status(201).json({
      success: true,
      message: '🎉 Registration successful! Welcome to GASC Idappadi Sports Portal.',
      token,
      user
    });
  } catch (err) {
    console.error('Register handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
