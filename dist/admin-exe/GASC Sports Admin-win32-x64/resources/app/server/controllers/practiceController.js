const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const NotificationService = require('../services/notificationService');

// @desc    Get all practice sessions
// @route   GET /api/practice
// @access  Public / Private
exports.getAllPracticeSessions = async (req, res) => {
  try {
    const { sportId, status, upcoming } = req.query;

    let query = supabase.from('practice_sessions').select('*, sports(id, name, icon), teams(id, name)');

    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);
    if (status && status !== 'All') query = query.eq('status', status);

    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('date', today);
    }

    query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

    const { data: sessionsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const sessions = (sessionsRaw || []).map(s => {
      const item = toCamelCase(s);
      if (s.sports) item.sportId = toCamelCase(s.sports);
      if (s.teams) item.teamId = toCamelCase(s.teams);
      return item;
    });

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single practice session
// @route   GET /api/practice/:id
// @access  Public / Private
exports.getPracticeSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: sessionRaw, error } = await supabase
      .from('practice_sessions')
      .select('*, sports(*), teams(*)')
      .eq('id', id)
      .single();

    if (error || !sessionRaw) {
      return res.status(404).json({ success: false, message: 'Practice session not found.' });
    }

    const session = toCamelCase(sessionRaw);
    if (sessionRaw.sports) session.sportId = toCamelCase(sessionRaw.sports);
    if (sessionRaw.teams) session.teamId = toCamelCase(sessionRaw.teams);

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create practice session
// @route   POST /api/practice
// @access  Private/Admin
exports.createPracticeSession = async (req, res) => {
  try {
    const { title, sportId, teamId, date, startTime, endTime, venue, coach, focusArea } = req.body;

    if (!title || !sportId || !date || !startTime || !endTime || !venue) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const { data: sport } = await supabase
      .from('sports')
      .select('*')
      .eq('id', sportId)
      .single();

    if (!sport) {
      return res.status(400).json({ success: false, message: 'Sport not found.' });
    }

    let teamName = '';
    if (teamId) {
      const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).single();
      if (team) teamName = team.name;
    }

    const newSession = {
      title: title.trim(),
      sport_id: sport.id,
      sport_name: sport.name,
      team_id: teamId || null,
      team_name: teamName,
      date: new Date(date).toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      venue: venue.trim(),
      coach: coach || 'Physical Director',
      focus_area: focusArea || 'Conditioning & drills',
      status: 'Scheduled'
    };

    const { data: createdRaw, error } = await supabase
      .from('practice_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const session = toCamelCase(createdRaw);

    // Automated notification
    await NotificationService.notifyPracticeScheduled(
      sport.name,
      session.venue,
      session.date,
      `${session.startTime} - ${session.endTime}`
    );

    res.status(201).json({
      success: true,
      message: 'Practice session scheduled successfully and players notified!',
      session
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update practice session
// @route   PUT /api/practice/:id
// @access  Private/Admin
exports.updatePracticeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, startTime, endTime, venue, coach, focusArea, status } = req.body;

    const updates = {};
    if (title) updates.title = title.trim();
    if (date) updates.date = new Date(date).toISOString().split('T')[0];
    if (startTime) updates.start_time = startTime;
    if (endTime) updates.end_time = endTime;
    if (venue) updates.venue = venue.trim();
    if (coach) updates.coach = coach;
    if (focusArea !== undefined) updates.focus_area = focusArea;
    if (status) updates.status = status;

    const { data: updatedRaw, error } = await supabase
      .from('practice_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedRaw) {
      return res.status(404).json({ success: false, message: 'Practice session not found or update failed.' });
    }

    res.json({
      success: true,
      message: 'Practice session updated successfully!',
      session: toCamelCase(updatedRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete practice session
// @route   DELETE /api/practice/:id
// @access  Private/Admin
exports.deletePracticeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deletedRaw, error } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !deletedRaw) {
      return res.status(404).json({ success: false, message: 'Practice session not found.' });
    }

    res.json({ success: true, message: 'Practice session deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
