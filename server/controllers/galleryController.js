const fs = require('fs');
const path = require('path');
const { supabase, toCamelCase } = require('../utils/supabaseHelper');

// @desc    Get all gallery photos
// @route   GET /api/gallery
// @access  Public
exports.getAllGallery = async (req, res) => {
  try {
    const { category, sportId } = req.query;
    let items = [];

    // 1. Load from localStore (primary local / offline store)
    try {
      const localStore = require('../data/localStore');
      const localItems = localStore.storeInstance.getTable('gallery') || [];
      if (Array.isArray(localItems) && localItems.length > 0) {
        items = [...localItems];
      }
    } catch (e) {
      console.warn('[GalleryController] Local store read notice:', e.message);
    }

    // 2. Also load from Supabase notifications cloud bus (for items uploaded across clients)
    try {
      if (supabase && typeof supabase.from === 'function') {
        const { data: cloudPhotos } = await supabase
          .from('notifications')
          .select('*')
          .eq('category', 'gallery')
          .order('created_at', { ascending: false });

        if (Array.isArray(cloudPhotos) && cloudPhotos.length > 0) {
          for (const cp of cloudPhotos) {
            try {
              const parsed = typeof cp.message === 'string' ? JSON.parse(cp.message) : cp.message;
              if (parsed && parsed.image) {
                const existingIdx = items.findIndex(i => String(i.id) === String(parsed.id));
                if (existingIdx === -1) {
                  items.unshift(parsed);
                }
              }
            } catch (pErr) {}
          }
        }
      }
    } catch (e) {
      console.warn('[GalleryController] Cloud gallery notifications read notice:', e.message);
    }

    // 3. Optional fallback: try direct table query if it exists
    try {
      if (supabase && typeof supabase.from === 'function') {
        const { data: directItems, error: directErr } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (!directErr && Array.isArray(directItems) && directItems.length > 0) {
          for (const di of directItems) {
            if (!items.some(i => String(i.id) === String(di.id))) {
              items.push(di);
            }
          }
        }
      }
    } catch (e) {}

    // Apply category & sportId filters
    if (category && category !== 'All') {
      items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
    }
    if (sportId && sportId !== 'All') {
      items = items.filter(i => String(i.sport_id || i.sportId) === String(sportId));
    }

    const formatted = items.map(item => toCamelCase(item));

    res.json({
      success: true,
      count: formatted.length,
      gallery: formatted
    });
  } catch (error) {
    console.error('[GalleryController] getAllGallery error:', error);
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
    let uploadedFilename = null;

    if (req.file) {
      uploadedFilename = req.file.filename;
      image = `/uploads/${req.file.filename}`;

      // ── UPLOAD TO SUPABASE PUBLIC STORAGE BUCKET (sports-assets) ──
      // This allows the photo to be visible to all students on Vercel, web, and mobile!
      try {
        if (supabase && supabase.storage) {
          const fileBuffer = fs.readFileSync(req.file.path);
          const storagePath = `gallery/${req.file.filename}`;
          const { error: storageErr } = await supabase.storage
            .from('sports-assets')
            .upload(storagePath, fileBuffer, {
              contentType: req.file.mimetype || 'image/png',
              upsert: true
            });

          if (!storageErr) {
            const { data: pubData } = supabase.storage
              .from('sports-assets')
              .getPublicUrl(storagePath);

            if (pubData && pubData.publicUrl) {
              image = pubData.publicUrl;
              console.log('⚡ [GalleryController] Photo uploaded to Supabase Public CDN:', image);
            }
          } else {
            console.warn('[GalleryController] Storage upload error:', storageErr.message);
          }
        }
      } catch (uploadErr) {
        console.warn('[GalleryController] Storage exception:', uploadErr.message);
      }

      // Mirror file to other local target upload directories so offline desktop can view it
      try {
        const mirrorDirs = [
          'D:/GASC-Sports-Admin-Portable/GASC Sports Admin-win32-x64/resources/app/client/public/uploads',
          'C:/Users/ELCOT/Desktop/GASC Sports Admin Portable/resources/app/client/public/uploads',
          path.resolve(__dirname, '../../dist/uploads'),
          path.resolve(__dirname, '../../public/uploads')
        ];
        mirrorDirs.forEach(md => {
          if (fs.existsSync(path.dirname(md))) {
            if (!fs.existsSync(md)) fs.mkdirSync(md, { recursive: true });
            fs.copyFileSync(req.file.path, path.join(md, req.file.filename));
          }
        });
      } catch (mErr) {}
    }

    let sportName = '';
    if (sportId) {
      try {
        const localStore = require('../data/localStore');
        const sports = localStore.storeInstance.getTable('sports') || [];
        const found = sports.find(s => String(s.id) === String(sportId));
        if (found) sportName = found.name;
      } catch (e) {}
    }

    const newRecord = {
      id: `gal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'Tournaments',
      sport_id: sportId || null,
      sport_name: sportName,
      image,
      date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Save to localStore / local_db.json
    try {
      const localStore = require('../data/localStore');
      const galleryTable = localStore.storeInstance.getTable('gallery');
      galleryTable.unshift(newRecord);
      localStore.storeInstance.save();
      console.log('📦 [GalleryController] Saved to localStore successfully:', newRecord.id);
    } catch (e) {
      console.warn('[GalleryController] Local store write notice:', e.message);
    }

    // 2. Broadcast to Supabase Cloud notifications table (instant sub-second real-time sync for students!)
    try {
      if (supabase && typeof supabase.from === 'function') {
        const { error: notifErr } = await supabase.from('notifications').upsert({
          id: newRecord.id,
          title: 'NEW_GALLERY_PHOTO',
          category: 'gallery',
          type: 'gallery_update',
          sender: 'admin',
          target_type: 'All Students',
          target_audience: 'ALL',
          priority: 'Normal',
          message: JSON.stringify(newRecord),
          created_at: newRecord.created_at
        });

        if (!notifErr) {
          console.log('⚡ [GalleryController] Instant student cloud broadcast triggered for gallery photo!');
        } else {
          console.warn('[GalleryController] Cloud notification broadcast notice:', notifErr.message);
        }
      }
    } catch (notifEx) {
      console.warn('[GalleryController] Cloud notification broadcast exception:', notifEx.message);
    }

    // 3. Attempt direct Supabase table insert (silently ignore schema cache errors so upload never fails)
    try {
      if (supabase && typeof supabase.from === 'function') {
        await supabase.from('gallery').insert(newRecord);
      }
    } catch (e) {}

    // Return success response to Admin Portal
    res.status(201).json({
      success: true,
      message: 'Photo added to sports gallery successfully!',
      galleryItem: toCamelCase(newRecord)
    });
  } catch (error) {
    console.error('[GalleryController] createGalleryItem error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add gallery photo.' });
  }
};

// @desc    Delete gallery photo
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from localStore
    try {
      const localStore = require('../data/localStore');
      const galleryTable = localStore.storeInstance.getTable('gallery');
      const idx = galleryTable.findIndex(g => String(g.id) === String(id));
      if (idx !== -1) {
        galleryTable.splice(idx, 1);
        localStore.storeInstance.save();
      }
    } catch (e) {}

    // 2. Delete from Supabase notifications cloud
    try {
      if (supabase && typeof supabase.from === 'function') {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch (e) {}

    // 3. Delete from Supabase direct gallery table if present
    try {
      if (supabase && typeof supabase.from === 'function') {
        await supabase.from('gallery').delete().eq('id', id);
      }
    } catch (e) {}

    res.json({ success: true, message: 'Photo removed from gallery.' });
  } catch (error) {
    console.error('[GalleryController] deleteGalleryItem error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
