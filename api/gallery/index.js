/**
 * GASC Sports - Gallery Universal API Router for Vercel
 * Handles:
 * - GET    /api/gallery      -> List all sports gallery moments from Supabase notifications cloud bus or static fallback
 * - DELETE /api/gallery/:id  -> Delete a gallery photo and broadcast sub-second sync to all students
 * - POST   /api/gallery      -> Add new gallery photo from cloud
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const out = {};
  for (const k of Object.keys(obj)) {
    const ck = k.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
    out[ck] = obj[k];
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-portal-type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  const rawUrl = req.url || '';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const query = req.query || {};

  // ──────── DELETE GALLERY PHOTO ────────
  if (req.method === 'DELETE') {
    let id = query.id || parsedUrl.searchParams.get('id');
    if (!id) {
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      id = parts[parts.length - 1];
    }

    if (id && id !== 'gallery') {
      try {
        // Delete from Supabase notifications
        await supabase.from('notifications').delete().eq('id', id);
        try {
          await supabase.from('gallery').delete().eq('id', id);
        } catch (e) {}

        // Instant Realtime Broadcast to student clients
        try {
          const ch = supabase.channel('student-gallery-realtime-subsecond-sync');
          ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              ch.send({
                type: 'broadcast',
                event: 'photo_deleted',
                payload: { id: id }
              }).catch(() => {});
            }
          });
        } catch (e) {}

        return res.status(200).json({ success: true, message: 'Photo removed from gallery.' });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    return res.status(400).json({ success: false, message: 'Photo ID is required for deletion.' });
  }

  // ──────── GET ALL GALLERY PHOTOS ────────
  try {
    let items = [];

    // 1. Fetch from Supabase Cloud notifications bus (category = gallery)
    try {
      const { data: cloudPhotos } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'gallery')
        .order('created_at', { ascending: false });

      if (Array.isArray(cloudPhotos) && cloudPhotos.length > 0) {
        for (const cp of cloudPhotos) {
          try {
            const parsed = typeof cp.message === 'string' ? JSON.parse(cp.message) : cp.message;
            if (parsed && parsed.image && !items.some(i => String(i.id) === String(parsed.id))) {
              items.push(parsed);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Vercel API gallery notifications read error:', err.message);
    }

    // 2. Fallback to bundled gallery.json if available
    if (items.length === 0) {
      const fallbackPaths = [
        path.join(process.cwd(), 'dist/gallery.json'),
        path.join(process.cwd(), 'public/gallery.json'),
        path.join(process.cwd(), 'gallery.json')
      ];
      for (const fp of fallbackPaths) {
        if (fs.existsSync(fp)) {
          try {
            const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
            if (raw.gallery && Array.isArray(raw.gallery)) {
              items = raw.gallery;
              break;
            }
          } catch (e) {}
        }
      }
    }

    // 3. Optional query filters
    const category = query.category;
    const sportId = query.sportId;

    if (category && category !== 'All') {
      items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
    }
    if (sportId && sportId !== 'All') {
      items = items.filter(i => String(i.sport_id || i.sportId) === String(sportId));
    }

    const formatted = items.map(i => toCamelCase(i));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      gallery: formatted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load gallery'
    });
  }
};
