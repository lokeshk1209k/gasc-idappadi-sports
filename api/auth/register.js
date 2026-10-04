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
    const {
      name,
      registerNumber,
      email,
      password,
      department,
      year,
      section,
      gender,
      dob,
      mobile
    } = req.body || {};

    if (!name || !registerNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, Register Number, Email, and Password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();

    // Check if an account already exists with this register number
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    if (existingUser && existingUser.role === 'student' && existingUser.password) {
      return res.status(400).json({
        success: false,
        message: `An account already exists with Register Number (${cleanRegNo}). Please Login.`
      });
    }

    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingEmail && (!existingUser || String(existingEmail.id) !== String(existingUser.id))) {
      return res.status(400).json({
        success: false,
        message: `This email address (${cleanEmail}) is already in use. Please Login.`
      });
    }

    // Check college roster for pre-enrolled details
    const { data: rosterStudent } = await supabase
      .from('college_student_roster')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = existingUser ? existingUser.id : `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    let userRaw = null;
    if (existingUser) {
      // Upgrade existing roster entry to full student account
      const { data: updatedUser, error: updateErr } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: 'student',
          department: department || existingUser.department || (rosterStudent && rosterStudent.department) || 'Computer Science',
          year: year || existingUser.year || (rosterStudent && rosterStudent.year) || 'I Year',
          section: section || existingUser.section || (rosterStudent && rosterStudent.section) || 'A',
          gender: gender || existingUser.gender || (rosterStudent && rosterStudent.gender) || 'Male',
          dob: dob || existingUser.dob || null,
          mobile: mobile ? mobile.trim() : existingUser.mobile,
          profile_photo: existingUser.profile_photo || '/images/default-avatar.png',
          status: 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(400).json({ success: false, message: updateErr.message });
      }
      userRaw = updatedUser;
    } else {
      // Insert brand new student user
      const { data: insertedUser, error: userErr } = await supabase
        .from('users')
        .insert({
          id: userId,
          name: name.trim(),
          register_number: cleanRegNo,
          email: cleanEmail,
          password: hashedPassword,
          role: 'student',
          department: department || (rosterStudent && rosterStudent.department) || 'Computer Science',
          year: year || (rosterStudent && rosterStudent.year) || 'I Year',
          section: section || (rosterStudent && rosterStudent.section) || 'A',
          gender: gender || (rosterStudent && rosterStudent.gender) || 'Male',
          dob: dob || null,
          mobile: mobile ? mobile.trim() : null,
          profile_photo: '/images/default-avatar.png',
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userErr) {
        return res.status(400).json({ success: false, message: userErr.message });
      }
      userRaw = insertedUser;
    }

    const user = toCamelCase(userRaw);

    // Create default player profile
    try {
      await supabase.from('player_profiles').insert({
        id: `prof_${userId}`,
        user_id: user.id,
        position: 'All Rounder',
        jersey_number: 7,
        playing_level: 'College Level',
        experience: '1 Year',
        matches_played: 0,
        matches_won: 0,
        matches_lost: 0,
        score_points: 0,
        awards_count: 0,
        competitions_participated: 0,
        bio: `Enrolled student athlete at GASC Idappadi (${user.department} - ${user.year}).`,
        created_at: new Date().toISOString()
      });
    } catch (e) {}

    // Update roster record
    if (rosterStudent) {
      try {
        await supabase
          .from('college_student_roster')
          .update({ is_registered: true, registered_user_id: user.id })
          .eq('id', rosterStudent.id);
      } catch (e) {}
    }

    const token = generateToken(user.id);
    delete user.password;

    return res.status(201).json({
      success: true,
      message: '🎉 Registration successful! Welcome to GASC Idappadi Sports Portal.',
      token,
      user
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
