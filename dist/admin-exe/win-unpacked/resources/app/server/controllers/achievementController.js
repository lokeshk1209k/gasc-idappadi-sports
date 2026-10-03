const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get all achievements
// @route   GET /api/achievements
// @access  Public
exports.getAllAchievements = async (req, res) => {
  try {
    const { medal, sportId, year, featured } = req.query;

    let query = supabase.from('achievements').select('*, users(id, name, register_number, department, year, profile_photo), sports(id, name, icon), competitions(id, name, venue, level, date)');

    if (medal && medal !== 'All') query = query.eq('medal', medal);
    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);
    if (year && year !== 'All') query = query.eq('year', year);
    if (featured === 'true') query = query.eq('is_featured', true);

    query = query.order('created_at', { ascending: false });

    const { data: itemsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const achievements = (itemsRaw || []).map(item => {
      const converted = toCamelCase(item);
      if (item.users) converted.studentId = toCamelCase(item.users);
      if (item.sports) converted.sportId = toCamelCase(item.sports);
      if (item.competitions) converted.competitionId = toCamelCase(item.competitions);
      return converted;
    });

    res.json({
      success: true,
      count: achievements.length,
      achievements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single achievement
// @route   GET /api/achievements/:id
// @access  Public
exports.getAchievementById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: itemRaw, error } = await supabase
      .from('achievements')
      .select('*, users(*), sports(*), competitions(*)')
      .eq('id', id)
      .single();

    if (error || !itemRaw) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }

    const item = toCamelCase(itemRaw);
    if (itemRaw.users) item.studentId = toCamelCase(itemRaw.users);
    if (itemRaw.sports) item.sportId = toCamelCase(itemRaw.sports);
    if (itemRaw.competitions) item.competitionId = toCamelCase(itemRaw.competitions);

    res.json({ success: true, achievement: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create achievement
// @route   POST /api/achievements
// @access  Private/Admin
exports.createAchievement = async (req, res) => {
  try {
    const {
      studentIdentifier,
      sportId,
      competitionId,
      title,
      position,
      medal,
      year,
      date,
      description,
      isFeatured
    } = req.body;

    if (!studentIdentifier || !title) {
      return res.status(400).json({ success: false, message: 'Student and Title are required.' });
    }

    const { data: studentRaw } = await supabase
      .from('users')
      .select('*')
      .or(`register_number.ilike.${studentIdentifier.trim()},id.eq.${studentIdentifier.includes('-') ? studentIdentifier : '00000000-0000-0000-0000-000000000000'}`)
      .limit(1)
      .single();

    if (!studentRaw) {
      return res.status(404).json({ success: false, message: `Student "${studentIdentifier}" not found.` });
    }

    let sportName = '';
    if (sportId) {
      const { data: sport } = await supabase.from('sports').select('name').eq('id', sportId).single();
      if (sport) sportName = sport.name;
    }

    let compName = '';
    if (competitionId) {
      const { data: comp } = await supabase.from('competitions').select('name').eq('id', competitionId).single();
      if (comp) compName = comp.name;
    }

    let photo = '/images/achievements/default.jpg';
    let certificate = '';
    if (req.files) {
      if (req.files.photo) photo = `/uploads/${req.files.photo[0].filename}`;
      if (req.files.certificate) certificate = `/uploads/${req.files.certificate[0].filename}`;
    } else if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const newAchievement = {
      student_id: studentRaw.id,
      student_name: studentRaw.name,
      register_number: studentRaw.register_number,
      department: studentRaw.department,
      sport_id: sportId || null,
      sport_name: sportName,
      competition_id: competitionId || null,
      competition_name: compName,
      title: title.trim(),
      position: position || 'Winner / 1st Place',
      medal: medal || 'Gold',
      year: year || '2025 - 2026',
      date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: description || '',
      photo,
      certificate,
      is_featured: isFeatured !== undefined ? isFeatured === 'true' || isFeatured === true : true
    };

    const { data: createdRaw, error } = await supabase
      .from('achievements')
      .insert(newAchievement)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'Achievement added successfully to the College Wall of Fame!',
      achievement: toCamelCase(createdRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update achievement
// @route   PUT /api/achievements/:id
// @access  Private/Admin
exports.updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position, medal, year, date, description, isFeatured } = req.body;

    const updates = {};
    if (title) updates.title = title.trim();
    if (position) updates.position = position;
    if (medal) updates.medal = medal;
    if (year) updates.year = year;
    if (date) updates.date = new Date(date).toISOString().split('T')[0];
    if (description !== undefined) updates.description = description;
    if (isFeatured !== undefined) updates.is_featured = isFeatured === 'true' || isFeatured === true;

    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    }

    const { data: updatedRaw, error } = await supabase
      .from('achievements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedRaw) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }

    res.json({
      success: true,
      message: 'Achievement updated successfully!',
      achievement: toCamelCase(updatedRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private/Admin
exports.deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deletedRaw, error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !deletedRaw) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }

    res.json({ success: true, message: 'Achievement deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's own achievements
// @route   GET /api/achievements/my-achievements
// @access  Private/Student
exports.getMyAchievements = async (req, res) => {
  try {
    const { data: itemsRaw, error } = await supabase
      .from('achievements')
      .select('*, sports(id, name, icon), competitions(id, name, venue, date)')
      .eq('student_id', req.user.id)
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const achievements = (itemsRaw || []).map(item => {
      const converted = toCamelCase(item);
      if (item.sports) converted.sportId = toCamelCase(item.sports);
      if (item.competitions) converted.competitionId = toCamelCase(item.competitions);
      return converted;
    });

    res.json({
      success: true,
      count: achievements.length,
      achievements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
