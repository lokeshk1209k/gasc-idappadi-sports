const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const localStore = require('../data/localStore');
const NotificationService = require('../services/notificationService');

const OFFICIAL_CM_TROPHY_URL = 'https://tncmtrophy.sdat.in/';

/**
 * @desc    Get all CM Trophy announcements
 * @route   GET /api/cm-trophy
 * @access  Public (Published) / Admin (All)
 */
exports.getAllAnnouncements = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const { status = 'All', category = 'All', search = '' } = req.query;

    let query = supabase.from('cm_trophy_announcements').select('*');

    // If not admin, students only see Published announcements
    if (!isAdmin) {
      query = query.or('status.eq.published,status.eq.Published');
    } else if (status && status !== 'All') {
      const lower = status.toLowerCase();
      const upper = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      query = query.or(`status.eq.${lower},status.eq.${upper}`);
    }

    if (category && category !== 'All') {
      query = query.ilike('category', category);
    }

    query = query.order('is_important', { ascending: false }).order('created_at', { ascending: false });

    const { data: rawList, error } = await query;

    let announcements = (rawList || []).map(toCamelCase);

    // If search term provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      announcements = announcements.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.instructions && a.instructions.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
      );
    }

    // Default metadata (case-insensitive)
    const activePublishedCount = announcements.filter(a => (a.status || '').toLowerCase() === 'published').length;
    const importantCount = announcements.filter(a => a.isImportant && (a.status || '').toLowerCase() === 'published').length;

    res.json({
      success: true,
      officialPortalUrl: OFFICIAL_CM_TROPHY_URL,
      count: announcements.length,
      publishedCount: activePublishedCount,
      importantCount,
      announcements,
      data: announcements
    });
  } catch (error) {
    console.error('Error in getAllAnnouncements:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single announcement by ID
 * @route   GET /api/cm-trophy/:id
 * @access  Public
 */
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: raw, error } = await supabase
      .from('cm_trophy_announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !raw) {
      return res.status(404).json({ success: false, message: 'CM Trophy announcement not found.' });
    }

    res.json({
      success: true,
      officialPortalUrl: OFFICIAL_CM_TROPHY_URL,
      announcement: toCamelCase(raw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create new CM Trophy announcement (Admin)
 * @route   POST /api/cm-trophy
 * @access  Private/Admin
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      instructions,
      officialLink = OFFICIAL_CM_TROPHY_URL,
      registrationStartDate = null,
      registrationEndDate = null,
      category = 'General',
      isImportant = false,
      status = 'Draft',
      notifyStudents = false
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required.' });
    }

    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ success: false, message: 'Detailed instructions are required.' });
    }

    const cleanTitle = title.trim();
    const cleanInstructions = instructions.trim();
    const cleanLink = (officialLink && officialLink.trim()) || OFFICIAL_CM_TROPHY_URL;
    const normStatus = status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : 'Draft';
    const cleanStatus = ['Published', 'Draft', 'Archived'].includes(normStatus) ? normStatus : 'Draft';
    const isPub = cleanStatus === 'Published';
    const nowIso = new Date().toISOString();

    const docId = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newDoc = {
      id: docId,
      title: cleanTitle,
      instructions: cleanInstructions,
      official_link: cleanLink,
      registration_start_date: registrationStartDate || null,
      registration_end_date: registrationEndDate || null,
      category: category || 'General',
      is_important: Boolean(isImportant),
      status: cleanStatus,
      published_at: isPub ? nowIso : null,
      last_notified_at: (isPub && notifyStudents) ? nowIso : null,
      created_by: (req.user && req.user.name) || 'Dr. R. ANITHA (Sports Incharge)',
      created_at: nowIso,
      updated_at: nowIso
    };

    const { data: createdRaw, error } = await supabase
      .from('cm_trophy_announcements')
      .insert(newDoc)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase cm_trophy insert error, saving to local store:', error.message);
    }

    // Mirror to local store
    const localTable = localStore.storeInstance.getTable('cm_trophy_announcements');
    const finalDoc = createdRaw || newDoc;
    if (!localTable.some(a => String(a.id) === String(finalDoc.id))) {
      localTable.unshift(finalDoc);
      localStore.storeInstance.save();
    }

    const camelDoc = toCamelCase(finalDoc);

    // If published and notification requested (or default for published announcements), dispatch student notification
    if (isPub && (notifyStudents !== false)) {
      try {
        await NotificationService.notifyCmTrophyPublished(camelDoc, false);
      } catch (nErr) {
        console.warn('Notification dispatch warning:', nErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: isPub
        ? 'CM Trophy announcement published and broadcasted to students successfully!'
        : 'CM Trophy announcement draft saved successfully.',
      announcement: camelDoc,
      data: camelDoc
    });
  } catch (error) {
    console.error('Error creating CM Trophy announcement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update existing CM Trophy announcement (Admin)
 * @route   PUT /api/cm-trophy/:id
 * @access  Private/Admin
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructions,
      officialLink,
      registrationStartDate,
      registrationEndDate,
      category,
      isImportant,
      status,
      notifyStudents = false
    } = req.body;

    // Check existing
    const { data: existingRaw } = await supabase
      .from('cm_trophy_announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const existing = existingRaw || localStore.storeInstance.getTable('cm_trophy_announcements').find(a => String(a.id) === String(id));

    if (!existing) {
      return res.status(404).json({ success: false, message: 'CM Trophy announcement not found.' });
    }

    const wasPublished = existing.status === 'Published';
    const nowIso = new Date().toISOString();
    const newStatus = status ? status : existing.status;
    const isNowPublished = newStatus === 'Published';

    const updates = {
      updated_at: nowIso
    };

    if (title !== undefined) updates.title = title.trim();
    if (instructions !== undefined) updates.instructions = instructions.trim();
    if (officialLink !== undefined) updates.official_link = officialLink.trim() || OFFICIAL_CM_TROPHY_URL;
    if (registrationStartDate !== undefined) updates.registration_start_date = registrationStartDate || null;
    if (registrationEndDate !== undefined) updates.registration_end_date = registrationEndDate || null;
    if (category !== undefined) updates.category = category;
    if (isImportant !== undefined) updates.is_important = Boolean(isImportant);
    if (status !== undefined) updates.status = newStatus;

    if (!wasPublished && isNowPublished) {
      updates.published_at = nowIso;
    }

    let shouldBroadcast = false;
    if (isNowPublished && (notifyStudents || (!wasPublished && isNowPublished))) {
      updates.last_notified_at = nowIso;
      shouldBroadcast = true;
    }

    const { data: updatedRaw, error } = await supabase
      .from('cm_trophy_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Mirror to local store
    const localTable = localStore.storeInstance.getTable('cm_trophy_announcements');
    const idx = localTable.findIndex(a => String(a.id) === String(id));
    const mergedDoc = { ...existing, ...updates, ...(updatedRaw || {}) };
    if (idx >= 0) {
      localTable[idx] = mergedDoc;
    } else {
      localTable.unshift(mergedDoc);
    }
    localStore.storeInstance.save();

    const camelDoc = toCamelCase(mergedDoc);

    if (shouldBroadcast) {
      try {
        await NotificationService.notifyCmTrophyPublished(camelDoc, wasPublished);
      } catch (nErr) {
        console.warn('Notification broadcast warning:', nErr.message);
      }
    }

    res.json({
      success: true,
      message: isNowPublished
        ? 'CM Trophy announcement updated and broadcasted to students successfully!'
        : 'CM Trophy announcement updated successfully.',
      announcement: camelDoc,
      data: camelDoc
    });
  } catch (error) {
    console.error('Error updating CM Trophy announcement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Publish announcement immediately (Admin)
 * @route   PATCH /api/cm-trophy/:id/publish
 * @access  Private/Admin
 */
exports.publishAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { notifyStudents = true } = req.body;

    const nowIso = new Date().toISOString();
    const updates = {
      status: 'Published',
      published_at: nowIso,
      updated_at: nowIso
    };

    if (notifyStudents) {
      updates.last_notified_at = nowIso;
    }

    const { data: updatedRaw } = await supabase
      .from('cm_trophy_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    const localTable = localStore.storeInstance.getTable('cm_trophy_announcements');
    const idx = localTable.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) {
      localTable[idx] = { ...localTable[idx], ...updates, ...(updatedRaw || {}) };
      localStore.storeInstance.save();
    }

    const doc = toCamelCase((idx >= 0 ? localTable[idx] : updatedRaw) || updates);

    if (notifyStudents) {
      try {
        await NotificationService.notifyCmTrophyPublished(doc, false);
      } catch (nErr) {
        console.warn('Broadcast warning:', nErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Announcement published and notification sent to students successfully!',
      announcement: doc,
      data: doc
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Archive announcement (Admin)
 * @route   PATCH /api/cm-trophy/:id/archive
 * @access  Private/Admin
 */
exports.archiveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const nowIso = new Date().toISOString();
    const updates = {
      status: 'Archived',
      updated_at: nowIso
    };

    await supabase
      .from('cm_trophy_announcements')
      .update(updates)
      .eq('id', id);

    const localTable = localStore.storeInstance.getTable('cm_trophy_announcements');
    const idx = localTable.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) {
      localTable[idx] = { ...localTable[idx], ...updates };
      localStore.storeInstance.save();
    }

    res.json({
      success: true,
      message: 'Announcement archived successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete announcement (Admin)
 * @route   DELETE /api/cm-trophy/:id
 * @access  Private/Admin
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    await supabase
      .from('cm_trophy_announcements')
      .delete()
      .eq('id', id);

    const localTable = localStore.storeInstance.getTable('cm_trophy_announcements');
    const idx = localTable.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) {
      localTable.splice(idx, 1);
      localStore.storeInstance.save();
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
