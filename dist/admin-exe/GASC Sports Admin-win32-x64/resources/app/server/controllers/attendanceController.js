const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Record or update attendance for a session
// @route   POST /api/attendance/batch
// @access  Private/Admin
exports.recordBatchAttendance = async (req, res) => {
  try {
    const { practiceSessionId, records } = req.body;

    if (!practiceSessionId || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Please provide practiceSessionId and an array of records.' });
    }

    const { data: sessionRaw, error: sessionErr } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', practiceSessionId)
      .single();

    if (sessionErr || !sessionRaw) {
      return res.status(404).json({ success: false, message: 'Practice session not found.' });
    }

    const savedRecords = [];
    for (const item of records) {
      if (!item.studentId) continue;

      const payload = {
        practice_session_id: sessionRaw.id,
        student_id: item.studentId,
        status: item.status || 'Present',
        date: sessionRaw.date,
        remarks: item.remarks || '',
        recorded_by: req.user.name || 'Sports Incharge'
      };

      const { data: recordRaw, error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'practice_session_id,student_id' })
        .select()
        .single();

      if (recordRaw) {
        savedRecords.push(toCamelCase(recordRaw));
      }
    }

    // Mark session as completed
    await supabase
      .from('practice_sessions')
      .update({ status: 'Completed' })
      .eq('id', practiceSessionId);

    res.json({
      success: true,
      message: `Attendance marked successfully for ${savedRecords.length} student(s).`,
      count: savedRecords.length,
      records: savedRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance records for a specific session
// @route   GET /api/attendance/session/:id
// @access  Private
exports.getAttendanceBySession = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: sessionRaw, error: sessionErr } = await supabase
      .from('practice_sessions')
      .select('*, sports(*), teams(*)')
      .eq('id', id)
      .single();

    if (sessionErr || !sessionRaw) {
      return res.status(404).json({ success: false, message: 'Practice session not found.' });
    }

    const session = toCamelCase(sessionRaw);
    if (sessionRaw.sports) session.sportId = toCamelCase(sessionRaw.sports);
    if (sessionRaw.teams) session.teamId = toCamelCase(sessionRaw.teams);

    const { data: recordsRaw } = await supabase
      .from('attendance')
      .select('*, users(id, name, register_number, department, year, profile_photo, mobile)')
      .eq('practice_session_id', id);

    const records = (recordsRaw || []).map(r => {
      const item = toCamelCase(r);
      if (r.users) item.studentId = toCamelCase(r.users);
      return item;
    });

    res.json({
      success: true,
      session,
      count: records.length,
      attendance: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's own attendance stats
// @route   GET /api/attendance/my-stats
// @access  Private/Student
exports.getMyAttendanceStats = async (req, res) => {
  try {
    const { data: recordsRaw, error } = await supabase
      .from('attendance')
      .select('*, practice_sessions(id, title, sport_name, venue, date, start_time, end_time, coach)')
      .eq('student_id', req.user.id)
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const records = (recordsRaw || []).map(r => {
      const item = toCamelCase(r);
      if (r.practice_sessions) item.practiceSessionId = toCamelCase(r.practice_sessions);
      return item;
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const excused = records.filter(r => r.status === 'Excused').length;

    const percentage = total > 0 ? Math.round(((present + (late * 0.5)) / total) * 100) : 100;

    res.json({
      success: true,
      stats: {
        totalSessions: total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: percentage
      },
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
