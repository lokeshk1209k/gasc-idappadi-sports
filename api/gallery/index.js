/**
 * GASC Sports - Gallery Universal API Router for Vercel
 * Handles:
 * - GET  /api/gallery -> List all sports gallery moments from Supabase notifications cloud bus or static fallback
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

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
    const query = req.query || {};
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
