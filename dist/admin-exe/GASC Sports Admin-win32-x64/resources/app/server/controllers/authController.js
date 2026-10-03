const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, toSnakeCase, toCamelCase } = require('../utils/supabaseHelper');
const otpStore = require('../utils/otpStore');
const { sendOtpEmail } = require('../utils/emailService');

// Generate JWT Token (Persistent 365 days for seamless uninterrupted session)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'gasc_idappadi_sports_secret_jwt_key_2026', {
    expiresIn: '365d'
  });
};

// Helper to mask email
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
};

// @desc    Verify student register number in college roster
// @route   GET /api/auth/verify-student/:registerNumber
// @access  Public
exports.verifyStudent = async (req, res) => {
  try {
    const { registerNumber } = req.params;
    if (!registerNumber) {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();

    // 1. Check if user already registered an account
    const { data: userExists } = await supabase
      .from('users')
      .select('id, name')
      .ilike('register_number', cleanRegNo)
      .single();

    if (userExists) {
      return res.status(400).json({
        success: false,
        isRegistered: true,
        message: `Student "${userExists.name}" (${cleanRegNo}) has already registered an account. Please proceed to Login.`
      });
    }

    // 2. Check if student is pre-enrolled in college roster
    const { data: rosterStudent } = await supabase
      .from('college_student_roster')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .single();

    if (rosterStudent) {
      return res.json({
        success: true,
        isRegistered: false,
        isPreEnrolled: true,
        message: `Official GASC Record Verified: ${rosterStudent.name} (${rosterStudent.department} - ${rosterStudent.year})`,
        student: toCamelCase(rosterStudent)
      });
    }

    // 3. For any valid GASC register number format (at least 4 characters)
    if (cleanRegNo.length >= 4) {
      return res.json({
        success: true,
        isRegistered: false,
        isPreEnrolled: false,
        message: `Register Number (${cleanRegNo}) verified. Please fill in your basic student details.`,
        student: {
          registerNumber: cleanRegNo
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please enter a valid College Register Number.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send OTP to Student Email for Registration
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendRegistrationOtp = async (req, res) => {
  try {
    const { email, registerNumber, name } = req.body;

    if (!email || !registerNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both college register number and valid email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();

    // 1. Check if already registered
    const { data: regExists } = await supabase
      .from('users')
      .select('id')
      .ilike('register_number', cleanRegNo)
      .single();

    if (regExists) {
      return res.status(400).json({
        success: false,
        message: `Student (${cleanRegNo}) has already registered. Please proceed to Login.`
      });
    }

    // 2. Check if email is already in use
    const { data: emailExists } = await supabase
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .single();

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already in use by an active account.'
      });
    }

    // 3. Optional college roster lookup
    const { data: rosterStudent } = await supabase
      .from('college_student_roster')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .single();

    const recipientName = (rosterStudent && rosterStudent.name) || name || 'Student Athlete';

    // 4. Generate 6-digit OTP & store
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    otpStore.saveOtp(cleanEmail, otpCode, cleanRegNo, 'registration', expiryMinutes);

    // 5. Send OTP Email
    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      name: recipientName,
      registerNumber: cleanRegNo,
      otp: otpCode,
      expiryMinutes
    });

    console.log(`\n🔑 [REGISTRATION OTP] Email: ${cleanEmail} | Reg: ${cleanRegNo} | Code: ${otpCode} | Sent: ${emailResult.success ? 'Yes' : 'Simulated (logged)'}\n`);

    return res.json({
      success: true,
      message: emailResult.success
        ? `A 6-digit OTP verification code has been dispatched to ${maskEmail(cleanEmail)}. Please check your inbox and spam folder.`
        : `Verification OTP generated for ${cleanRegNo}.`,
      maskedEmail: maskEmail(cleanEmail),
      expiryMinutes,
      isSimulated: !emailResult.success
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Registration OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const result = otpStore.verifyOtp(cleanEmail, otp, 'registration');

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: 'Email OTP verified successfully! You can now complete your registration.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register Student Player
// @route   POST /api/auth/register
// @access  Public
exports.registerStudent = async (req, res) => {
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
      mobile,
      otp
    } = req.body;

    if (!name || !registerNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, Register Number, Email, and Password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();

    // Verify OTP if provided
    if (otp) {
      const verifyRes = otpStore.verifyOtp(cleanEmail, otp, 'registration');
      if (!verifyRes.success) {
        return res.status(400).json({
          success: false,
          message: verifyRes.message || 'Invalid or expired OTP verification code.'
        });
      }
    }

    // Check if user already exists
    const { data: existingReg } = await supabase
      .from('users')
      .select('id')
      .ilike('register_number', cleanRegNo)
      .maybeSingle();

    if (existingReg) {
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

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `This email address (${cleanEmail}) is already in use by an active account. Please Login.`
      });
    }

    // Check college roster if pre-enrolled
    const { data: rosterStudent } = await supabase
      .from('college_student_roster')
      .select('*')
      .ilike('register_number', cleanRegNo)
      .single();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into Supabase
    const { data: userRaw, error: userErr } = await supabase
      .from('users')
      .insert({
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
        status: 'Active'
      })
      .select()
      .single();

    if (userErr) {
      return res.status(400).json({ success: false, message: userErr.message });
    }

    const user = toCamelCase(userRaw);

    // Create default PlayerProfile in Supabase
    await supabase.from('player_profiles').insert({
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
      bio: `Enrolled student athlete at GASC Idappadi (${user.department} - ${user.year}).`
    });

    // Update roster record to marked registered if in roster
    if (rosterStudent) {
      await supabase
        .from('college_student_roster')
        .update({ is_registered: true, registered_user_id: user.id })
        .eq('id', rosterStudent.id);
    }

    // Clean up OTP
    otpStore.deleteOtp(cleanEmail, 'registration');

    const token = generateToken(user.id);
    delete user.password;

    res.status(201).json({
      success: true,
      message: '🎉 Registration successful! Welcome to GASC Idappadi Sports Portal.',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send Password Reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.sendPasswordResetOtp = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered Email or College Register Number.'
      });
    }

    const cleanIdentifier = identifier.trim();

    // Query user by email or register_number
    let { data: userRaw } = await supabase
      .from('users')
      .select('*')
      .ilike('register_number', cleanIdentifier)
      .maybeSingle();

    if (!userRaw) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanIdentifier)
        .maybeSingle();
      userRaw = userByEmail;
    }

    if (!userRaw) {
      return res.status(404).json({
        success: false,
        message: 'No registered student or staff account found with this identifier.'
      });
    }

    const user = toCamelCase(userRaw);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 10;
    otpStore.saveOtp(user.email, otpCode, user.registerNumber, 'password_reset', expiryMinutes);

    const emailResult = await sendOtpEmail({
      to: user.email,
      name: user.name,
      registerNumber: user.registerNumber || 'Student',
      otp: otpCode,
      expiryMinutes,
      isPasswordReset: true
    });

    console.log(`\n🔑 [PASSWORD RESET OTP] Email: ${user.email} | Reg: ${user.registerNumber} | Code: ${otpCode}\n`);

    res.json({
      success: true,
      message: `Password reset OTP has been sent to ${maskEmail(user.email)}.`,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Password Reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const result = otpStore.verifyOtp(cleanEmail, otp, 'password_reset');

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'OTP verified successfully! You may now set a new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const verifyRes = otpStore.verifyOtp(cleanEmail, otp, 'password_reset');
    if (!verifyRes.success) {
      return res.status(400).json(verifyRes);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .ilike('email', cleanEmail)
      .select()
      .single();

    if (error || !updatedUser) {
      return res.status(400).json({ success: false, message: 'Failed to update password.' });
    }

    otpStore.deleteOtp(cleanEmail, 'password_reset');

    res.json({
      success: true,
      message: 'Password has been updated successfully! Please login with your new password.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student Portal Login (Students Only)
// @route   POST /api/auth/student-login
// @access  Public
exports.studentLogin = async (req, res) => {
  try {
    const { registerNumber, email, identifier: bodyId, username, password } = req.body;
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
    const { data: userRaw, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${identifier},register_number.ilike.${identifier}`)
      .limit(1)
      .single();

    if (error || !userRaw) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials. Student account not found.'
      });
    }

    // Strict Role Verification: MUST be student
    if (userRaw.role !== 'student') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: This portal is exclusively for Students. Admin login is prohibited here.'
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

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register New Sports Incharge / Admin Account
// @route   POST /api/auth/admin-register
// @access  Public
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, department, designation, mobile, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Incharge Full Name, Official Email, and Password.'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if an admin with this email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account with email "${cleanEmail}" already exists. Please login using your existing password.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = `usr_admin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newAdmin = {
      id: adminId,
      name: cleanName,
      register_number: 'ADMIN-SPORTS',
      email: cleanEmail,
      password: hashedPassword,
      role: 'admin',
      department: (department || 'Physical Education & Sports').trim(),
      year: 'Faculty',
      section: 'A',
      gender: gender || 'Female',
      mobile: mobile ? mobile.trim() : '+91 94432 18765',
      profile_photo: 'images/incharge-portrait.jpg',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdRaw, error } = await supabase
      .from('users')
      .insert(newAdmin)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const user = toCamelCase(createdRaw || newAdmin);
    delete user.password;

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: `Sports Incharge account registered successfully! Welcome, ${user.name}.`,
      token,
      user
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin / Sports Incharge Portal Login (Admin Only)
// @route   POST /api/auth/admin-login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, identifier: bodyId, email, registerNumber, password } = req.body;
    const identifier = (bodyId || username || registerNumber || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Admin ID and Password.'
      });
    }

    let userRaw = null;
    const cleanId = identifier.toLowerCase();

    // 1. Check admin special keywords or query users
    if (cleanId === 'admin' || cleanId === 'sports_incharge' || cleanId === 'admin-sports') {
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .limit(1)
        .single();
      userRaw = adminUser;
    } else {
      const { data: matchedUser } = await supabase
        .from('users')
        .select('*')
        .or(`email.ilike.%${cleanId}%,name.ilike.%${cleanId}%,register_number.ilike.%${cleanId}%`)
        .limit(1)
        .single();
      userRaw = matchedUser;
    }

    if (!userRaw) {
      // Robust Fallback: Check environment master admin credentials (.env)
      const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
      const envAdminPass = process.env.ADMIN_PASSWORD || 'admin123';

      if (cleanId === envAdminUser && password === envAdminPass) {
        const fallbackAdmin = {
          id: 'admin_master_01',
          name: 'Dr. R. ANITHA',
          registerNumber: 'ADMIN',
          email: 'sportsgascidappadi@gmail.com',
          role: 'admin',
          department: 'Physical Education & Sports',
          designation: 'Physical Directress & Sports Incharge',
          status: 'Active'
        };
        const token = generateToken(fallbackAdmin.id);
        return res.json({
          success: true,
          message: `Welcome, ${fallbackAdmin.name}!`,
          token,
          user: fallbackAdmin
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials. Admin account not found.'
      });
    }

    // Strict Role Verification: MUST be admin
    if (userRaw.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL',
        message: 'Access denied: Sports Incharge / Admin credentials required. Student accounts cannot login here.'
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
        message: 'Admin account is deactivated.'
      });
    }

    const user = toCamelCase(userRaw);
    delete user.password;

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token,
      user
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    General Login User (Admin or Student - Legacy Compatibility)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, registerNumber, email, identifier: bodyId, password } = req.body;
    const identifier = (bodyId || username || registerNumber || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide login credentials and password.'
      });
    }

    // 1. Check if Admin special username (e.g., 'admin', 'sports_incharge', 'ADMIN-SPORTS')
    let userRaw = null;
    const cleanId = identifier.toLowerCase();
    if (cleanId === 'admin' || cleanId === 'sports_incharge' || cleanId === 'admin-sports' || cleanId === 'admin@gascidappadi.edu.in') {
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .limit(1)
        .single();
      userRaw = adminUser;
    }

    // 2. If not found by admin keyword, query by register_number or email
    if (!userRaw) {
      const { data: matchedUser } = await supabase
        .from('users')
        .select('*')
        .or(`email.ilike.${identifier},register_number.ilike.${identifier}`)
        .limit(1)
        .single();
      userRaw = matchedUser;
    }

    if (!userRaw) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials. User not found.'
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
        message: 'Account is deactivated or suspended. Please contact Physical Director.'
      });
    }

    const user = toCamelCase(userRaw);
    delete user.password;

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current Logged-in User & Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.user;

    // Fetch player profile if student
    let playerProfile = null;
    if (user.role === 'student') {
      const { data: profileRaw } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileRaw) {
        playerProfile = toCamelCase(profileRaw);
        if (playerProfile.primarySport) {
          const { data: sportRaw } = await supabase
            .from('sports')
            .select('*')
            .eq('id', playerProfile.primarySport)
            .single();
          if (sportRaw) {
            playerProfile.primarySportDetails = toCamelCase(sportRaw);
          }
        }
      }
    }

    res.json({
      success: true,
      user,
      playerProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Profile Details
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, mobile, department, year, section, gender, profilePhoto } = req.body;
    const userId = req.user.id;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (mobile !== undefined) updateFields.mobile = mobile ? mobile.trim() : null;
    if (department) updateFields.department = department.trim();
    if (year) updateFields.year = year.trim();
    if (section) updateFields.section = section.trim();
    if (gender) updateFields.gender = gender.trim();
    if (profilePhoto) updateFields.profile_photo = profilePhoto;
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedRaw, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const updatedUser = toCamelCase(updatedRaw);
    delete updatedUser.password;

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.'
      });
    }

    const { data: userRaw } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (!userRaw) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRaw.password);
    if (!isMatch && currentPassword !== userRaw.password) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabase.from('users').update({ password: hashedPassword }).eq('id', userId);

    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, department, year, search } = req.query;

    let query = supabase.from('users').select('id, name, register_number, email, role, department, year, section, gender, mobile, profile_photo, status, created_at');

    if (role && role !== 'All') query = query.eq('role', role);
    if (department && department !== 'All') query = query.eq('department', department);
    if (year && year !== 'All') query = query.eq('year', year);
    if (search) {
      query = query.or(`name.ilike.%${search.trim()}%,register_number.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: usersRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const users = (usersRaw || []).map(toCamelCase);

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete User
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: userRaw, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !userRaw) {
      return res.status(404).json({ success: false, message: 'User not found or already deleted.' });
    }

    res.json({ success: true, message: `User "${userRaw.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get or generate session token for student portal
// @route   ALL /api/auth/session-token
// @access  Public
exports.getSessionToken = async (req, res) => {
  try {
    const localStore = require('../data/localStore');
    const bcrypt = require('bcryptjs');

    const regNo = (
      (req.body && req.body.registerNumber) ||
      req.query.registerNumber ||
      'C24UG183CSC013'
    ).trim().toUpperCase();

    let { data: userRaw } = await supabase
      .from('users')
      .select('*')
      .or(`register_number.ilike.%${regNo}%,id.eq.${regNo},name.ilike.%${regNo}%`)
      .limit(1)
      .maybeSingle();

    if (!userRaw) {
      userRaw = localStore.storeInstance.getTable('users').find(u => 
        (u.register_number && u.register_number.toUpperCase() === regNo) ||
        String(u.id) === String(regNo)
      );
    }

    let student = userRaw;
    if (!student) {
      const roster = localStore.storeInstance.getTable('college_student_roster') || [];
      const ros = roster.find(r => r.register_number.toUpperCase() === regNo) || roster[0];

      const newStudent = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: ros ? ros.name : 'Arun Kumar S',
        register_number: ros ? ros.register_number : regNo,
        email: `${(ros ? ros.register_number : regNo).toLowerCase()}@gascidappadi.edu.in`,
        password: bcrypt.hashSync('student123', 10),
        role: 'student',
        department: ros ? ros.department : 'Computer Science',
        year: ros ? ros.year : 'II Year',
        section: ros ? ros.section : 'A',
        gender: ros ? (ros.gender || 'Male') : 'Male',
        mobile: ros ? ros.mobile : '+91 98421 54321',
        profile_photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
        status: 'Active',
        created_at: new Date().toISOString()
      };

      await supabase.from('users').insert(newStudent);
      const uTable = localStore.storeInstance.getTable('users');
      if (!uTable.some(u => u.register_number === newStudent.register_number)) {
        uTable.push(newStudent);
        localStore.storeInstance.save();
      }
      student = newStudent;
    }

    const token = generateToken(student.id);
    const user = toCamelCase(student);
    delete user.password;

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Offline Login - uses locally cached admin credentials
// @route   POST /api/auth/offline-login
// @access  Public
// ─────────────────────────────────────────────
exports.offlineAdminLogin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email || '';
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Credentials are required.' });
    }
    const offlineAuth = require('../database/offlineAuth');
    const result = offlineAuth.offlineLogin(identifier, password);
    if (result.success) {
      return res.json({ ...result, message: 'Offline login successful. Changes will sync when internet returns.' });
    }
    return res.status(401).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// Admin Login (with credential caching for offline use)
// @route   POST /api/auth/admin-login
// @access  Public
// ─────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const identifier = username || email || '';
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email and password are required.' });
    }

    // Master admin fallback
    const isMasterAdmin = identifier === 'admin' && password === 'admin123';
    if (isMasterAdmin) {
      const user = { id: 'admin_master_01', name: 'Dr. R. ANITHA', email: 'admin@gascidappadi.edu.in', role: 'admin', department: 'Physical Education & Sports', status: 'Active' };
      const token = generateToken(user.id);
      // Cache for offline
      try {
        const offlineAuth = require('../database/offlineAuth');
        offlineAuth.cacheAdminSession(user, password, token);
      } catch (e) {}
      return res.json({ success: true, token, user, message: 'Welcome, Sports Incharge!' });
    }

    // Supabase lookup
    let user = null;
    try {
      const { data: byEmail } = await supabase.from('users').select('*').ilike('email', identifier.includes('@') ? identifier : `%${identifier}%`).eq('role', 'admin').limit(1).maybeSingle();
      user = byEmail;
      if (!user) {
        const { data: byName } = await supabase.from('users').select('*').ilike('name', `%${identifier}%`).eq('role', 'admin').limit(1).maybeSingle();
        user = byName;
      }
    } catch (e) {}

    // LocalStore fallback
    if (!user) {
      try {
        const localStore = require('../data/localStore');
        const allUsers = localStore.storeInstance.getTable('users') || [];
        user = allUsers.find(u => u.role === 'admin' && (u.email === identifier || u.name === identifier || identifier === 'admin'));
      } catch (e) {}
    }

    if (!user) {
      // Try offline login
      try {
        const offlineAuth = require('../database/offlineAuth');
        const offlineResult = offlineAuth.offlineLogin(identifier, password);
        if (offlineResult.success) return res.json(offlineResult);
      } catch (e) {}
      return res.status(401).json({ success: false, message: 'Admin account not found. Please register first.' });
    }

    const isValidPwd = await bcrypt.compare(password, user.password || user.password_hash || '');
    if (!isValidPwd) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    const token = generateToken(user.id);
    const userCamel = toCamelCase(user);
    delete userCamel.password;
    delete userCamel.passwordHash;

    // Cache credentials for offline login
    try {
      const offlineAuth = require('../database/offlineAuth');
      offlineAuth.cacheAdminSession(userCamel, password, token);
    } catch (e) {}

    return res.json({ success: true, token, user: userCamel, message: `Welcome, ${userCamel.name}!` });
  } catch (err) {
    // Try offline login as final fallback
    try {
      const { username, email, password } = req.body;
      const offlineAuth = require('../database/offlineAuth');
      const result = offlineAuth.offlineLogin(username || email, password);
      if (result.success) return res.json({ ...result, message: 'Logged in using offline credentials.' });
    } catch (e) {}
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// Admin Register (with credential caching for offline)
// @route   POST /api/auth/admin-register
// @access  Public
// ─────────────────────────────────────────────
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const crypto = require('crypto');
    const uuidv4 = () => crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      role: 'admin',
      department: department || 'Physical Education & Sports',
      status: 'Active',
      created_at: new Date().toISOString()
    };

    // Try Supabase
    try {
      const { error } = await supabase.from('users').insert(newAdmin);
      if (error && !error.message.includes('duplicate')) throw error;
    } catch (e) {
      console.warn('[AdminRegister] Supabase insert warn:', e.message);
    }

    // Also save to localStore
    try {
      const localStore = require('../data/localStore');
      const users = localStore.storeInstance.getTable('users') || [];
      if (!users.find(u => u.email === newAdmin.email)) {
        users.push(newAdmin);
        localStore.storeInstance.save();
      }
    } catch (e) {}

    const token = generateToken(newAdmin.id);
    const userOut = { ...newAdmin }; delete userOut.password;

    // Cache for offline
    try {
      const offlineAuth = require('../database/offlineAuth');
      offlineAuth.cacheAdminSession(userOut, password, token);
    } catch (e) {}

    return res.json({ success: true, token, user: userOut, message: `Sports Incharge account registered successfully! Welcome, ${name}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// Sync Status API
// @route   GET /api/auth/sync-status
// @access  Public
// ─────────────────────────────────────────────
exports.getSyncStatus = async (req, res) => {
  try {
    const syncEngine = require('../database/syncEngine');
    const pending = syncEngine.getPendingCount();
    const lastSync = syncEngine.getLastSync();
    const isOnline = syncEngine.getIsOnline();
    return res.json({ success: true, isOnline, pending, lastSync });
  } catch (e) {
    return res.json({ success: true, isOnline: false, pending: 0, lastSync: null });
  }
};
