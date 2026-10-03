const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Students see All Students + specific student/team/sport notifications
    const { data: notifsRaw, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_type.eq.All Students,target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const enriched = (notifsRaw || []).map(n => {
      const item = toCamelCase(n);
      const readByList = item.readBy || [];
      const isRead = Array.isArray(readByList) && readByList.includes(userId);
      return {
        ...item,
        isRead
      };
    });

    const unreadCount = enriched.filter(n => !n.isRead).length;

    res.json({
      success: true,
      count: enriched.length,
      unreadCount,
      notifications: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all notifications (Admin)
// @route   GET /api/notifications/all
// @access  Private/Admin
exports.getAllNotifications = async (req, res) => {
  try {
    const { data: notifsRaw, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const notifications = (notifsRaw || []).map(toCamelCase);

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: notifRaw, error: fetchErr } = await supabase
      .from('notifications')
      .select('read_by')
      .eq('id', id)
      .single();

    if (fetchErr || !notifRaw) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    let readBy = notifRaw.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await supabase.from('notifications').update({ read_by: readBy }).eq('id', id);
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create and broadcast notification (Admin)
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res) => {
  try {
    const { title, message, category, targetType, targetId, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    const newNotif = {
      title: title.trim(),
      message: message.trim(),
      category: category || 'General',
      target_type: targetType || 'All Students',
      target_id: targetId || null,
      priority: priority || 'Normal',
      sender: req.user.name || 'Sports Incharge'
    };

    const { data: createdRaw, error } = await supabase
      .from('notifications')
      .insert(newNotif)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'Notification broadcasted successfully!',
      notification: toCamelCase(createdRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deletedRaw, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !deletedRaw) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
