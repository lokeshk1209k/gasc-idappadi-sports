const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

// @desc    Get all gallery photos
// @route   GET /api/gallery
// @access  Public
exports.getAllGallery = async (req, res) => {
  try {
    const { category, sportId } = req.query;

    let query = supabase.from('gallery').select('*, sports(id, name)');

    if (category && category !== 'All') query = query.eq('category', category);
    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);

    query = query.order('created_at', { ascending: false });

    const { data: itemsRaw, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const items = (itemsRaw || []).map(item => {
      const converted = toCamelCase(item);
      if (item.sports) converted.sportId = toCamelCase(item.sports);
      return converted;
    });

    res.json({
      success: true,
      count: items.length,
      gallery: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload new gallery photo
// @route   POST /api/gallery
// @access  Private/Admin
exports.createGalleryItem = async (req, res) => {
  try {
    const { title, description, category, sportId, date } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Photo title is required.' });
    }

    let image = '/images/gallery/default.jpg';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    let sportName = '';
    if (sportId) {
      const { data: sport } = await supabase.from('sports').select('name').eq('id', sportId).single();
      if (sport) sportName = sport.name;
    }

    const newRecord = {
      title: title.trim(),
      description: description || '',
      category: category || 'Tournaments',
      sport_id: sportId || null,
      sport_name: sportName,
      image,
      date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };

    const { data: createdRaw, error } = await supabase
      .from('gallery')
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'Photo added to sports gallery successfully!',
      galleryItem: toCamelCase(createdRaw)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete gallery photo
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deletedRaw, error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !deletedRaw) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    res.json({ success: true, message: 'Photo removed from gallery.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
