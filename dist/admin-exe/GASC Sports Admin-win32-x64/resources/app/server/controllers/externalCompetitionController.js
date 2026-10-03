const { supabase, toCamelCase } = require('../utils/supabaseHelper');
const localStore = require('../services/localFallbackStore');

// Helper: validate HTTP/HTTPS URL
const isValidUrl = (url) => {
  if (!url) return true; // optional fields ok
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
};

// Helper: compute deadline status
const computeDeadlineStatus = (regDeadline, startDate, endDate) => {
  const now = new Date();
  const deadline = regDeadline ? new Date(regDeadline) : null;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (end && now > end) return 'Completed';
  if (!deadline) return 'Registration Open';
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Registration Closed';
  if (diffDays <= 3) return 'Registration Closing Soon';
  return 'Registration Open';
};

// Helper to check if error is table-missing error
const isTableMissing = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find the table');
};

// @desc  Get all published external competitions (students) or all (admin)
// @route GET /api/external-competitions
// @access Public (published only) / Admin (all)
exports.getAll = async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { sport, level, type, status, search, featured } = req.query;

  try {
    let query = supabase.from('external_competitions').select('*');

    if (!isAdmin) {
      query = query.in('status', ['Published', 'Registration Open', 'Registration Closed']);
    }
    if (sport && sport !== 'All') query = query.ilike('sport', `%${sport}%`);
    if (level && level !== 'All') query = query.eq('level', level);
    if (type && type !== 'All') query = query.eq('type', type);
    if (status && status !== 'All') query = query.eq('status', status);
    if (featured === 'true') query = query.eq('featured', true);
    if (search) {
      query = query.or(`title.ilike.%${search}%,organizer.ilike.%${search}%,venue.ilike.%${search}%,sport.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: raw, error } = await query;
    if (error) {
      // Fallback to local store if Supabase table is not created yet
      console.warn('⚠️ Supabase external_competitions error, using local fallback:', error.message);
      const fallbackList = localStore.getCompetitions({ sport, level, type, status, search, featured, isAdmin });
      const competitions = fallbackList.map(c => {
        const item = toCamelCase(c);
        item.deadlineStatus = computeDeadlineStatus(item.registrationDeadline, item.startDate, item.endDate);
        return item;
      });
      return res.json({ success: true, count: competitions.length, competitions });
    }

    const competitions = (raw || []).map(c => {
      const item = toCamelCase(c);
      item.deadlineStatus = computeDeadlineStatus(item.registrationDeadline, item.startDate, item.endDate);
      return item;
    });

    res.json({ success: true, count: competitions.length, competitions });
  } catch (err) {
    console.warn('⚠️ Exception in getAll external_competitions, using fallback:', err.message);
    const fallbackList = localStore.getCompetitions({ sport, level, type, status, search, featured, isAdmin });
    const competitions = fallbackList.map(c => {
      const item = toCamelCase(c);
      item.deadlineStatus = computeDeadlineStatus(item.registrationDeadline, item.startDate, item.endDate);
      return item;
    });
    res.json({ success: true, count: competitions.length, competitions });
  }
};

// @desc  Get single external competition
// @route GET /api/external-competitions/:id
// @access Public
exports.getOne = async (req, res) => {
  try {
    const { data: raw, error } = await supabase
      .from('external_competitions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!error && raw) {
      const item = toCamelCase(raw);
      item.deadlineStatus = computeDeadlineStatus(item.registrationDeadline, item.startDate, item.endDate);
      return res.json({ success: true, competition: item });
    }
  } catch (e) {}

  // Fallback to local store
  const localItem = localStore.getCompetitionById(req.params.id);
  if (!localItem) return res.status(404).json({ success: false, message: 'Competition not found.' });

  const item = toCamelCase(localItem);
  item.deadlineStatus = computeDeadlineStatus(item.registrationDeadline, item.startDate, item.endDate);
  res.json({ success: true, competition: item });
};

// @desc  Create external competition
// @route POST /api/external-competitions
// @access Private/Admin
exports.create = async (req, res) => {
  try {
    const {
      title, sport, level, type, organizer, venue, district, state,
      startDate, endDate, registrationStartDate, registrationDeadline,
      eligibility, ageLimit, gender, participationType, description,
      announcementSummary, sourceName, sourceUrl, registrationUrl,
      image, featured, status
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Competition title is required.' });
    if (!registrationDeadline) return res.status(400).json({ success: false, message: 'Registration deadline is required.' });
    if (registrationUrl && !isValidUrl(registrationUrl)) return res.status(400).json({ success: false, message: 'Invalid registration URL. Must start with http:// or https://' });
    if (sourceUrl && !isValidUrl(sourceUrl)) return res.status(400).json({ success: false, message: 'Invalid source URL. Must start with http:// or https://' });

    const payload = {
      title: title.trim(),
      sport: sport || 'General',
      level: level || 'Inter-College',
      type: type || 'Individual',
      organizer: organizer?.trim() || '',
      venue: venue?.trim() || '',
      district: district?.trim() || '',
      state: state?.trim() || '',
      start_date: startDate || null,
      end_date: endDate || null,
      registration_start_date: registrationStartDate || null,
      registration_deadline: registrationDeadline,
      eligibility: eligibility?.trim() || '',
      age_limit: ageLimit?.trim() || '',
      gender: gender || 'All',
      participation_type: participationType || 'Individual',
      description: description?.trim() || '',
      announcement_summary: announcementSummary?.trim() || '',
      source_name: sourceName?.trim() || '',
      source_url: sourceUrl?.trim() || '',
      registration_url: registrationUrl?.trim() || '',
      image: image?.trim() || '',
      featured: featured === true || featured === 'true',
      status: status || 'Draft',
      created_by: req.user.id
    };

    let createdRaw = null;
    try {
      const { data: raw, error } = await supabase
        .from('external_competitions')
        .insert(payload)
        .select()
        .single();
      if (!error && raw) createdRaw = raw;
    } catch (e) {}

    // Fallback store
    if (!createdRaw) {
      createdRaw = localStore.createCompetition(payload);
    }

    // Auto-notify if published
    if (payload.status === 'Published' || payload.status === 'Registration Open') {
      await _createCompetitionNotification(createdRaw, req.user);
    }

    res.status(201).json({
      success: true,
      message: 'External competition created successfully!',
      competition: toCamelCase(createdRaw)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update external competition
// @route PUT /api/external-competitions/:id
// @access Private/Admin
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, sport, level, type, organizer, venue, district, state,
      startDate, endDate, registrationStartDate, registrationDeadline,
      eligibility, ageLimit, gender, participationType, description,
      announcementSummary, sourceName, sourceUrl, registrationUrl,
      image, featured, status
    } = req.body;

    if (registrationUrl && !isValidUrl(registrationUrl)) return res.status(400).json({ success: false, message: 'Invalid registration URL.' });
    if (sourceUrl && !isValidUrl(sourceUrl)) return res.status(400).json({ success: false, message: 'Invalid source URL.' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (sport !== undefined) updates.sport = sport;
    if (level !== undefined) updates.level = level;
    if (type !== undefined) updates.type = type;
    if (organizer !== undefined) updates.organizer = organizer.trim();
    if (venue !== undefined) updates.venue = venue.trim();
    if (district !== undefined) updates.district = district.trim();
    if (state !== undefined) updates.state = state.trim();
    if (startDate !== undefined) updates.start_date = startDate || null;
    if (endDate !== undefined) updates.end_date = endDate || null;
    if (registrationStartDate !== undefined) updates.registration_start_date = registrationStartDate || null;
    if (registrationDeadline !== undefined) updates.registration_deadline = registrationDeadline || null;
    if (eligibility !== undefined) updates.eligibility = eligibility.trim();
    if (ageLimit !== undefined) updates.age_limit = ageLimit.trim();
    if (gender !== undefined) updates.gender = gender;
    if (participationType !== undefined) updates.participation_type = participationType;
    if (description !== undefined) updates.description = description.trim();
    if (announcementSummary !== undefined) updates.announcement_summary = announcementSummary.trim();
    if (sourceName !== undefined) updates.source_name = sourceName.trim();
    if (sourceUrl !== undefined) updates.source_url = sourceUrl.trim();
    if (registrationUrl !== undefined) updates.registration_url = registrationUrl.trim();
    if (image !== undefined) updates.image = image.trim();
    if (featured !== undefined) updates.featured = featured === true || featured === 'true';
    if (status !== undefined) updates.status = status;

    let updatedRaw = null;
    try {
      const { data: raw, error } = await supabase
        .from('external_competitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && raw) updatedRaw = raw;
    } catch (e) {}

    if (!updatedRaw) {
      updatedRaw = localStore.updateCompetition(id, updates);
    }

    if (!updatedRaw) return res.status(404).json({ success: false, message: 'Competition not found.' });

    res.json({
      success: true,
      message: 'Competition updated successfully!',
      competition: toCamelCase(updatedRaw)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete external competition
// @route DELETE /api/external-competitions/:id
// @access Private/Admin
exports.remove = async (req, res) => {
  try {
    let deleted = null;
    try {
      const { data: raw, error } = await supabase
        .from('external_competitions')
        .delete()
        .eq('id', req.params.id)
        .select()
        .single();
      if (!error && raw) deleted = raw;
    } catch (e) {}

    if (!deleted) {
      deleted = localStore.deleteCompetition(req.params.id);
    }

    if (!deleted) return res.status(404).json({ success: false, message: 'Competition not found.' });

    res.json({ success: true, message: 'Competition deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Toggle publish/unpublish
// @route PATCH /api/external-competitions/:id/publish
// @access Private/Admin
exports.togglePublish = async (req, res) => {
  try {
    let toggled = null;
    try {
      const { data: existing } = await supabase
        .from('external_competitions')
        .select('id, status, title, sport')
        .eq('id', req.params.id)
        .single();

      if (existing) {
        const wasPublished = ['Published', 'Registration Open'].includes(existing.status);
        const newStatus = wasPublished ? 'Draft' : 'Published';

        const { data: raw, error } = await supabase
          .from('external_competitions')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', req.params.id)
          .select()
          .single();

        if (!error && raw) toggled = raw;
      }
    } catch (e) {}

    if (!toggled) {
      toggled = localStore.togglePublishCompetition(req.params.id);
    }

    if (!toggled) return res.status(404).json({ success: false, message: 'Competition not found.' });

    if (toggled.status === 'Published') {
      await _createCompetitionNotification(toggled, req.user);
    }

    res.json({
      success: true,
      message: `Competition ${toggled.status === 'Published' ? 'published' : 'unpublished'} successfully!`,
      competition: toCamelCase(toggled)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update status
// @route PATCH /api/external-competitions/:id/status
// @access Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Draft', 'Published', 'Registration Open', 'Registration Closed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    let updated = null;
    try {
      const { data: raw, error } = await supabase
        .from('external_competitions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

      if (!error && raw) updated = raw;
    } catch (e) {}

    if (!updated) {
      updated = localStore.updateCompetitionStatus(req.params.id, status);
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Competition not found.' });

    res.json({ success: true, message: `Status updated to "${status}"`, competition: toCamelCase(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: create notification for competition
async function _createCompetitionNotification(compRaw, adminUser) {
  try {
    const sport = compRaw.sport || 'General';
    const title = `🌐 New External Competition: ${compRaw.title}`;
    const message = `"${compRaw.title}" (${compRaw.level || 'External'}) – Registration deadline: ${compRaw.registration_deadline ? new Date(compRaw.registration_deadline).toLocaleDateString('en-IN') : 'TBD'}. Click to view and register via official link.`;

    await supabase.from('notifications').insert({
      title,
      message,
      category: 'Competition',
      target_type: 'All Students',
      priority: compRaw.featured ? 'High' : 'Normal',
      sender: adminUser?.name || 'Sports Incharge'
    });
  } catch (e) {
    console.warn('Competition notification failed:', e.message);
  }
}
