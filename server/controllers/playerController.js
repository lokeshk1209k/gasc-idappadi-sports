const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get all players with filters, search, pagination
// @route   GET /api/players
// @access  Public / Private
exports.getAllPlayers = async (req, res) => {
  try {
    const { search, department, year, gender, status, page = 1, limit = 50 } = req.query;

    let query = supabase.from('users').select('id, name, register_number, email, role, department, year, section, gender, mobile, profile_photo, status, created_at', { count: 'exact' });

    query = query.eq('role', 'student');

    if (department && department !== 'All') {
      if (department === 'Maths' || department === 'Mathematics') {
        query = query.in('department', ['Maths', 'Mathematics']);
      } else if (department === 'B.Com' || department === 'Commerce' || department === 'B COM') {
        query = query.in('department', ['B.Com', 'Commerce', 'B COM']);
      } else if (department === 'BBA' || department === 'Business Administration') {
        query = query.in('department', ['BBA', 'Business Administration']);
      } else if (department === 'BMA' || department === 'MBA') {
        query = query.in('department', ['BMA', 'MBA']);
      } else if (department === 'M.Com' || department === 'MCOM') {
        query = query.in('department', ['M.Com', 'MCOM']);
      } else if (department === 'MA Tamil' || department === 'M.A. Tamil') {
        query = query.in('department', ['MA Tamil', 'M.A. Tamil']);
      } else if (department === 'MA English' || department === 'M.A. English') {
        query = query.in('department', ['MA English', 'M.A. English']);
      } else if (department === 'MA Maths' || department === 'M.Sc. Mathematics') {
        query = query.in('department', ['MA Maths', 'M.Sc. Mathematics']);
      } else {
        query = query.eq('department', department);
      }
    }
    if (year && year !== 'All') query = query.eq('year', year);
    if (gender && gender !== 'All') query = query.eq('gender', gender);
    if (status && status !== 'All') query = query.eq('status', status);

    if (search) {
      query = query.or(`name.ilike.%${search.trim()}%,register_number.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: usersRaw, count, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const players = (usersRaw || []).map(toCamelCase);

    // Fetch player profiles and registered sports for these users
    if (players.length > 0) {
      const userIds = players.map(p => p.id);
      const regNos = players.map(p => p.registerNumber).filter(Boolean);

      const [profilesRes, sportsRes, compRegsRes] = await Promise.all([
        supabase.from('player_profiles').select('*').in('user_id', userIds),
        supabase.from('sports').select('id, name'),
        supabase.from('competition_registrations').select('*').in('register_number', regNos)
      ]);

      const sportMap = {};
      (sportsRes.data || []).forEach(s => { sportMap[s.id] = s; });

      const compSportMap = {};
      (compRegsRes.data || []).forEach(cr => {
        if (!compSportMap[cr.register_number]) {
          compSportMap[cr.register_number] = cr.sport_name || cr.sport;
        }
      });

      const profileMap = {};
      if (profilesRes.data) {
        profilesRes.data.forEach(p => {
          const prof = toCamelCase(p);
          if (prof.primarySport && typeof prof.primarySport === 'string' && sportMap[prof.primarySport]) {
            prof.primarySport = toCamelCase(sportMap[prof.primarySport]);
          }
          profileMap[p.user_id] = prof;
        });
      }

      players.forEach(p => {
        p.profile = profileMap[p.id] || null;
        if (!p.profile && compSportMap[p.registerNumber]) {
          p.profile = {
            primarySport: { name: compSportMap[p.registerNumber] },
            position: 'Player'
          };
        } else if (p.profile && (!p.profile.primarySport || typeof p.profile.primarySport === 'string')) {
          const fallbackSport = compSportMap[p.registerNumber] || 'Cricket';
          p.profile.primarySport = { name: fallbackSport };
        }
      });
    }

    res.json({
      success: true,
      count: players.length,
      total: count || players.length,
      page: pageNum,
      pages: Math.ceil((count || players.length) / limitNum),
      players
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single player details with history
// @route   GET /api/players/:id
// @access  Private
exports.getPlayerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: userRaw, error: userErr } = await supabase
      .from('users')
      .select('id, name, register_number, email, role, department, year, section, gender, mobile, profile_photo, status, created_at')
      .eq('id', id)
      .single();

    if (userErr || !userRaw) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    const player = toCamelCase(userRaw);

    // Profile
    const { data: profileRaw } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const profile = profileRaw ? toCamelCase(profileRaw) : null;
    if (profile && profile.primarySport) {
      const { data: sportRaw } = await supabase.from('sports').select('*').eq('id', profile.primarySport).single();
      if (sportRaw) profile.primarySport = toCamelCase(sportRaw);
    }

    // Equipment history
    const { data: eqHistoryRaw } = await supabase
      .from('equipment_transactions')
      .select('*')
      .eq('student_id', id)
      .order('issue_date', { ascending: false });

    const equipmentHistory = (eqHistoryRaw || []).map(toCamelCase);

    // Achievements
    const { data: achRaw } = await supabase
      .from('achievements')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    const achievements = (achRaw || []).map(toCamelCase);

    // Competition registrations
    const { data: compRegsRaw } = await supabase
      .from('competition_registrations')
      .select('*, competitions(*)')
      .eq('student_id', id)
      .order('registration_date', { ascending: false });

    const competitionHistory = (compRegsRaw || []).map(cr => {
      const item = toCamelCase(cr);
      if (cr.competitions) {
        item.competitionId = toCamelCase(cr.competitions);
      }
      return item;
    });

    res.json({
      success: true,
      player,
      profile,
      stats: {
        achievementsCount: achievements.length,
        competitionsCount: competitionHistory.length,
        activeEquipmentCount: equipmentHistory.filter(e => e.status === 'Issued').length
      },
      equipmentHistory,
      achievements,
      competitionHistory
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update player by Admin
// @route   PUT /api/players/:id
// @access  Private/Admin
exports.updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, year, section, gender, mobile, status, position, jerseyNumber, playingLevel, primarySport } = req.body;

    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    if (department) userUpdates.department = department.trim();
    if (year) userUpdates.year = year.trim();
    if (section) userUpdates.section = section.trim();
    if (gender) userUpdates.gender = gender.trim();
    if (mobile !== undefined) userUpdates.mobile = mobile ? mobile.trim() : null;
    if (status) userUpdates.status = status;
    userUpdates.updated_at = new Date().toISOString();

    const { data: updatedRaw, error: userErr } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', id)
      .select()
      .single();

    if (userErr || !updatedRaw) {
      return res.status(404).json({ success: false, message: 'Player not found or update failed.' });
    }

    const profileUpdates = { user_id: id };
    if (position) profileUpdates.position = position;
    if (jerseyNumber !== undefined) profileUpdates.jersey_number = Number(jerseyNumber);
    if (playingLevel) profileUpdates.playing_level = playingLevel;
    if (primarySport) profileUpdates.primary_sport = primarySport;
    profileUpdates.updated_at = new Date().toISOString();

    await supabase.from('player_profiles').upsert(profileUpdates, { onConflict: 'user_id' });

    res.json({
      success: true,
      message: 'Player updated successfully!',
      player: toCamelCase(updatedRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private/Admin
exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: userRaw, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !userRaw) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    res.json({ success: true, message: `Player "${userRaw.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
