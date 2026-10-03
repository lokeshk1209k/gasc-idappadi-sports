const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get College & Sports Dept Settings
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    let { data: settingsRaw, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

    // Also get admin user profile photo
    const { data: adminUser } = await supabase
      .from('users')
      .select('name, profile_photo, email, mobile')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!settingsRaw) {
      const defaultSettings = {
        college_name: 'Government Arts and Science College, Idappadi',
        department_name: 'Department of Physical Education & Sports',
        sports_incharge_name: adminUser?.name || 'Dr. R. ANITHA',
        sports_incharge_role: 'Sports Incharge',
        sports_incharge_photo: adminUser?.profile_photo || 'images/default-avatar.png',
        email: 'sports@gascidappadi.edu.in',
        phone: '+91 94432 18765',
        address: 'Government Arts and Science College, Idappadi, Salem District - 637101, Tamil Nadu',
        office_hours: '08:30 AM - 05:30 PM (Mon - Sat)',
        auto_notifications: true
      };

      const { data: createdRaw } = await supabase
        .from('admin_settings')
        .insert(defaultSettings)
        .select()
        .single();

      settingsRaw = createdRaw;
    }

    const s = toCamelCase(settingsRaw);
    if (!s.sportsInchargePhoto && adminUser?.profile_photo) {
      s.sportsInchargePhoto = adminUser.profile_photo;
    }
    s.profilePhoto = s.sportsInchargePhoto || adminUser?.profile_photo || 'images/default-avatar.png';

    res.json({ success: true, settings: s });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update College & Sports Dept Settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    const {
      collegeName, departmentName, sportsInchargeName, sportsInchargeRole,
      email, phone, address, officeHours, autoNotifications, sportsInchargePhoto, profilePhoto
    } = req.body;

    const updates = {};
    if (collegeName) updates.college_name = collegeName.trim();
    if (departmentName) updates.department_name = departmentName.trim();
    if (sportsInchargeName) updates.sports_incharge_name = sportsInchargeName.trim();
    if (sportsInchargeRole) updates.sports_incharge_role = sportsInchargeRole.trim();
    if (email) updates.email = email.trim();
    if (phone) updates.phone = phone.trim();
    if (address) updates.address = address.trim();
    if (officeHours) updates.office_hours = officeHours.trim();
    if (autoNotifications !== undefined) updates.auto_notifications = autoNotifications;

    // Handle Profile Photo (from file upload or text URL)
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (sportsInchargePhoto && sportsInchargePhoto.trim()) {
      photoUrl = sportsInchargePhoto.trim();
    } else if (profilePhoto && profilePhoto.trim()) {
      photoUrl = profilePhoto.trim();
    }

    if (photoUrl) {
      updates.sports_incharge_photo = photoUrl;
      updates.profile_photo = photoUrl;
    }

    updates.updated_at = new Date().toISOString();

    const { data: existing } = await supabase.from('admin_settings').select('id').limit(1).single();

    let updatedRaw = null;
    if (existing) {
      const { data } = await supabase
        .from('admin_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      updatedRaw = data;
    } else {
      const { data } = await supabase
        .from('admin_settings')
        .insert(updates)
        .select()
        .single();
      updatedRaw = data;
    }

    // Update Admin user name and profile_photo if changed
    const userUpdates = {};
    if (sportsInchargeName) userUpdates.name = sportsInchargeName.trim();
    if (photoUrl) userUpdates.profile_photo = photoUrl;
    if (email) userUpdates.email = email.trim();
    if (phone) userUpdates.mobile = phone.trim();

    if (Object.keys(userUpdates).length > 0) {
      await supabase
        .from('users')
        .update(userUpdates)
        .eq('role', 'admin');
    }

    const finalSettings = toCamelCase(updatedRaw);
    if (photoUrl) {
      finalSettings.sportsInchargePhoto = photoUrl;
      finalSettings.profilePhoto = photoUrl;
    }

    res.json({
      success: true,
      message: 'Sports Department settings and Profile Photo updated successfully!',
      settings: finalSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Incharge Profile Photo directly
// @route   POST /api/settings/upload-photo
// @access  Private/Admin
exports.uploadPhoto = async (req, res) => {
  try {
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl.trim();
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: 'Please select an image file or provide a valid image URL.' });
    }

    // Update settings
    const { data: existing } = await supabase.from('admin_settings').select('id').limit(1).single();
    if (existing) {
      await supabase
        .from('admin_settings')
        .update({ sports_incharge_photo: photoUrl, profile_photo: photoUrl, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }

    // Update admin user
    await supabase
      .from('users')
      .update({ profile_photo: photoUrl })
      .eq('role', 'admin');

    res.json({
      success: true,
      message: 'Profile photo uploaded and updated successfully!',
      photoUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
