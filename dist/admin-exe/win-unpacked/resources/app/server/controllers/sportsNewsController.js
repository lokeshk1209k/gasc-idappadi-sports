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

// @desc  Get all sports news (published for students, all for admin)
// @route GET /api/sports-news
// @access Public (published) / Admin (all)
exports.getAll = async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { sport, category, status, featured, search } = req.query;

  try {
    let query = supabase.from('sports_news').select('*');

    if (!isAdmin) {
      query = query.eq('status', 'Published');
    }
    if (sport && sport !== 'All') query = query.ilike('sport', `%${sport}%`);
    if (category && category !== 'All') query = query.eq('category', category);
    if (status && status !== 'All') query = query.eq('status', status);
    if (featured === 'true') query = query.eq('featured', true);
    if (search) {
      query = query.or(`title.ilike.%${search}%,short_summary.ilike.%${search}%,source_name.ilike.%${search}%,sport.ilike.%${search}%`);
    }

    query = query.order('published_date', { ascending: false }).order('created_at', { ascending: false });

    const { data: raw, error } = await query;
    if (error) {
      console.warn('⚠️ Supabase sports_news error, using local fallback:', error.message);
      const fallbackList = localStore.getNews({ sport, category, status, featured, search, isAdmin });
      const news = fallbackList.map(toCamelCase);
      return res.json({ success: true, count: news.length, news });
    }

    const news = (raw || []).map(toCamelCase);
    res.json({ success: true, count: news.length, news });
  } catch (err) {
    console.warn('⚠️ Exception in sports_news getAll, using fallback:', err.message);
    const fallbackList = localStore.getNews({ sport, category, status, featured, search, isAdmin });
    const news = fallbackList.map(toCamelCase);
    res.json({ success: true, count: news.length, news });
  }
};

// @desc  Get single news item
// @route GET /api/sports-news/:id
// @access Public
exports.getOne = async (req, res) => {
  try {
    const { data: raw, error } = await supabase
      .from('sports_news')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!error && raw) {
      return res.json({ success: true, news: toCamelCase(raw) });
    }
  } catch (e) {}

  const localItem = localStore.getNewsById(req.params.id);
  if (!localItem) return res.status(404).json({ success: false, message: 'News article not found.' });

  res.json({ success: true, news: toCamelCase(localItem) });
};

// @desc  Create sports news
// @route POST /api/sports-news
// @access Private/Admin
exports.create = async (req, res) => {
  try {
    const {
      title, sport, category,
      sourceName, sourceUrl, publishedDate, image, featured, status
    } = req.body;
    const finalSummary = (req.body.shortSummary || req.body.summary || '').trim();
    const finalDesc = (req.body.fullDescription || req.body.description || '').trim();

    if (!title) return res.status(400).json({ success: false, message: 'News title is required.' });
    if (!finalSummary) return res.status(400).json({ success: false, message: 'Short summary is required.' });
    if (sourceUrl && !isValidUrl(sourceUrl)) return res.status(400).json({ success: false, message: 'Invalid source URL. Must start with http:// or https://' });

    const payload = {
      title: title.trim(),
      short_summary: finalSummary,
      full_description: finalDesc,
      sport: sport || 'General',
      category: category || 'General Sports News',
      source_name: sourceName?.trim() || '',
      source_url: sourceUrl?.trim() || '',
      published_date: publishedDate || new Date().toISOString().split('T')[0],
      image: image?.trim() || '',
      featured: featured === true || featured === 'true',
      status: status || 'Draft',
      created_by: req.user.id
    };

    let createdRaw = null;
    try {
      const { data: raw, error } = await supabase
        .from('sports_news')
        .insert(payload)
        .select()
        .single();
      if (!error && raw) createdRaw = raw;
    } catch (e) {}

    if (!createdRaw) {
      createdRaw = localStore.createNews(payload);
    }

    // Auto-notify if published
    if (payload.status === 'Published') {
      await _createNewsNotification(createdRaw, req.user);
    }

    res.status(201).json({
      success: true,
      message: 'Sports news created successfully!',
      news: toCamelCase(createdRaw)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update sports news
// @route PUT /api/sports-news/:id
// @access Private/Admin
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, shortSummary, fullDescription, sport, category,
      sourceName, sourceUrl, publishedDate, image, featured, status
    } = req.body;

    if (sourceUrl && !isValidUrl(sourceUrl)) return res.status(400).json({ success: false, message: 'Invalid source URL.' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (shortSummary !== undefined) updates.short_summary = shortSummary.trim();
    if (fullDescription !== undefined) updates.full_description = fullDescription.trim();
    if (sport !== undefined) updates.sport = sport;
    if (category !== undefined) updates.category = category;
    if (sourceName !== undefined) updates.source_name = sourceName.trim();
    if (sourceUrl !== undefined) updates.source_url = sourceUrl.trim();
    if (publishedDate !== undefined) updates.published_date = publishedDate;
    if (image !== undefined) updates.image = image.trim();
    if (featured !== undefined) updates.featured = featured === true || featured === 'true';
    if (status !== undefined) updates.status = status;

    let updatedRaw = null;
    try {
      const { data: raw, error } = await supabase
        .from('sports_news')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && raw) updatedRaw = raw;
    } catch (e) {}

    if (!updatedRaw) {
      updatedRaw = localStore.updateNews(id, updates);
    }

    if (!updatedRaw) return res.status(404).json({ success: false, message: 'News not found.' });

    res.json({
      success: true,
      message: 'Sports news updated successfully!',
      news: toCamelCase(updatedRaw)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete sports news
// @route DELETE /api/sports-news/:id
// @access Private/Admin
exports.remove = async (req, res) => {
  try {
    let deleted = null;
    try {
      const { data: raw, error } = await supabase
        .from('sports_news')
        .delete()
        .eq('id', req.params.id)
        .select()
        .single();
      if (!error && raw) deleted = raw;
    } catch (e) {}

    if (!deleted) {
      deleted = localStore.deleteNews(req.params.id);
    }

    if (!deleted) return res.status(404).json({ success: false, message: 'News not found.' });

    res.json({ success: true, message: 'News deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Toggle publish
// @route PATCH /api/sports-news/:id/publish
// @access Private/Admin
exports.togglePublish = async (req, res) => {
  try {
    let toggled = null;
    try {
      const { data: existing } = await supabase
        .from('sports_news')
        .select('id, status')
        .eq('id', req.params.id)
        .single();

      if (existing) {
        const newStatus = existing.status === 'Published' ? 'Draft' : 'Published';
        const { data: raw, error } = await supabase
          .from('sports_news')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', req.params.id)
          .select()
          .single();
        if (!error && raw) toggled = raw;
      }
    } catch (e) {}

    if (!toggled) {
      toggled = localStore.togglePublishNews(req.params.id);
    }

    if (!toggled) return res.status(404).json({ success: false, message: 'News not found.' });

    if (toggled.status === 'Published') {
      await _createNewsNotification(toggled, req.user);
    }

    res.json({
      success: true,
      message: `News ${toggled.status === 'Published' ? 'published' : 'unpublished'} successfully!`,
      news: toCamelCase(toggled)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: create notification for news
async function _createNewsNotification(newsRaw, adminUser) {
  try {
    const title = `📰 Sports News: ${newsRaw.title}`;
    const message = newsRaw.short_summary || `New sports announcement: ${newsRaw.title}`;

    await supabase.from('notifications').insert({
      title,
      message,
      category: 'General',
      target_type: 'All Students',
      priority: newsRaw.featured ? 'High' : 'Normal',
      sender: adminUser?.name || 'Sports Incharge'
    });
  } catch (e) {
    console.warn('News notification failed:', e.message);
  }
}
