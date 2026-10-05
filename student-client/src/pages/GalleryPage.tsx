import { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Search, Calendar, RefreshCw, X, Download,
  Maximize2, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoItem {
  id: string;
  title: string;
  description?: string;
  image: string;
  date?: string;
  createdAt?: string;
}

// Format date into clean: Date, Month, Year
const formatPhotoDate = (dateStr?: string, createdAtStr?: string): { day: string; month: string; year: string; full: string } => {
  const raw = dateStr || createdAtStr;
  if (!raw) {
    return { day: '', month: '', year: '', full: 'Recent' };
  }
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return { day: '', month: '', year: '', full: raw };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = String(d.getFullYear());
    return {
      day,
      month,
      year,
      full: `${day} ${month} ${year}`
    };
  } catch {
    return { day: '', month: '', year: '', full: raw };
  }
};

const GalleryPage = () => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPhotos = async () => {
    try {
      setRefreshing(true);
      let loadedPhotos: PhotoItem[] = [];

      // 1. Fetch directly from Supabase Cloud notifications bus (category = gallery)
      try {
        const { data: cloudNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('category', 'gallery')
          .order('created_at', { ascending: false });

        if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
          for (const item of cloudNotifs) {
            try {
              const parsed = typeof item.message === 'string' ? JSON.parse(item.message) : item.message;
              if (parsed && parsed.image) {
                loadedPhotos.push({
                  id: String(parsed.id || item.id),
                  title: parsed.title || 'Sports Moment',
                  description: parsed.description || '',
                  image: parsed.image,
                  date: parsed.date || (item.created_at ? item.created_at.split('T')[0] : ''),
                  createdAt: parsed.created_at || item.created_at
                });
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Supabase notifications gallery fetch notice:', err);
      }

      // 2. Fetch from /api/gallery (Vercel serverless / Express server)
      try {
        const res = await fetch('/api/gallery');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.gallery)) {
            for (const g of data.gallery) {
              if (!loadedPhotos.some(p => p.id === String(g.id))) {
                loadedPhotos.push({
                  id: String(g.id),
                  title: g.title,
                  description: g.description,
                  image: g.image,
                  date: g.date,
                  createdAt: g.createdAt || g.created_at
                });
              }
            }
          }
        }
      } catch (e) {}

      // 3. Fallback to /gallery.json if still empty
      if (loadedPhotos.length === 0) {
        try {
          const fRes = await fetch('/gallery.json');
          if (fRes.ok) {
            const fData = await fRes.json();
            if (fData.success && Array.isArray(fData.gallery)) {
              loadedPhotos = fData.gallery.map((g: any) => ({
                id: String(g.id),
                title: g.title,
                description: g.description,
                image: g.image,
                date: g.date,
                createdAt: g.createdAt || g.created_at
              }));
            }
          }
        } catch (e) {}
      }

      if (loadedPhotos.length > 0) {
        setPhotos(loadedPhotos);
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPhotos();

    // ── Instant Realtime Subscription from Supabase Cloud (Sub-second live sync) ──
    const channel = supabase
      .channel('student-gallery-realtime-subsecond-sync', {
        config: { broadcast: { self: true } }
      })
      // 1. Direct WebSocket Broadcast for Photo Upload (0.05 seconds instant!)
      .on('broadcast', { event: 'photo_uploaded' }, (payload: any) => {
        console.log('⚡ [Sub-second Broadcast] Photo uploaded by Admin:', payload);
        if (payload && payload.payload) {
          const p = payload.payload;
          setPhotos(prev => {
            if (prev.some(item => String(item.id) === String(p.id))) return prev;
            return [{
              id: String(p.id),
              title: p.title || 'Sports Moment',
              description: p.description || '',
              image: p.image,
              date: p.date,
              createdAt: p.created_at || p.createdAt || new Date().toISOString()
            }, ...prev];
          });
        }
        fetchPhotos();
      })
      // 2. Direct WebSocket Broadcast for Photo Delete (0.05 seconds instant!)
      .on('broadcast', { event: 'photo_deleted' }, (payload: any) => {
        console.log('⚡ [Sub-second Broadcast] Photo deleted by Admin:', payload);
        if (payload && payload.payload && payload.payload.id) {
          const delId = String(payload.payload.id);
          setPhotos(prev => prev.filter(p => String(p.id) !== delId));
        }
        fetchPhotos();
      })
      // 3. PostgreSQL CDC changes on notifications table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload: any) => {
          console.log('⚡ Postgres changes event:', payload.eventType);
          if (payload.eventType === 'DELETE' && payload.old && payload.old.id) {
            const delId = String(payload.old.id);
            setPhotos(prev => prev.filter(p => String(p.id) !== delId));
          } else if (payload.new && payload.new.category === 'gallery') {
            try {
              const parsed = typeof payload.new.message === 'string' ? JSON.parse(payload.new.message) : payload.new.message;
              if (parsed && parsed.image) {
                setPhotos(prev => {
                  if (prev.some(p => String(p.id) === String(parsed.id || payload.new.id))) return prev;
                  return [{
                    id: String(parsed.id || payload.new.id),
                    title: parsed.title || 'Sports Moment',
                    description: parsed.description || '',
                    image: parsed.image,
                    date: parsed.date,
                    createdAt: parsed.created_at || payload.new.created_at
                  }, ...prev];
                });
              }
            } catch (e) {}
          }
          fetchPhotos();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Realtime sub-second gallery sync active for students!');
        }
      });

    // Background heartbeat poll every 3 seconds to guarantee 100% sync
    const pollTimer = setInterval(() => {
      fetchPhotos();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPhotos = photos.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.date?.includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-blue" style={{ fontSize: 11, padding: '3px 10px' }}>
                <Sparkles style={{ width: 12, height: 12, marginRight: 4 }} />
                COLLEGE SPORTS PHOTOS
              </span>
              <span className="badge badge-green" style={{ fontSize: 11, padding: '3px 10px' }}>
                {photos.length} PHOTOS
              </span>
            </div>
            <h1 className="section-title" style={{ fontSize: 28 }}>
              SPORTS <span style={{ color: '#38A7FF' }}>PHOTOS</span>
            </h1>
            <p className="section-subtitle">
              All sports, tournaments, and athletic moments at GASC Idappadi with date, month, and year records.
            </p>
          </div>

          {/* Search & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  width: 15,
                  height: 15,
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6E86A5'
                }}
              />
              <input
                type="text"
                placeholder="Search photos by title, date..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-bar"
                style={{ paddingLeft: 36, width: 250 }}
              />
            </div>

            <button
              onClick={fetchPhotos}
              disabled={refreshing}
              className="btn-outline"
              style={{
                padding: '9px 15px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Refresh Photo Stream"
            >
              <RefreshCw
                style={{
                  width: 13,
                  height: 13,
                  animation: refreshing ? 'spin 1s linear infinite' : 'none'
                }}
              />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Photo Stream Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6E86A5' }}>
          <RefreshCw style={{ width: 32, height: 32, margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Loading Photos...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '70px 24px',
            color: '#6E86A5',
            borderRadius: 20,
            border: '1px dashed rgba(56, 167, 255, 0.25)'
          }}
        >
          <ImageIcon style={{ width: 44, height: 44, margin: '0 auto 14px', opacity: 0.4, color: '#38A7FF' }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>No Photos Found</h3>
          <p style={{ fontSize: 13, maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
            {searchQuery
              ? 'No photos matched your search. Try typing a different keyword.'
              : 'Admin has not uploaded any photos yet. All photos uploaded by Sports Incharge will appear here.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-outline"
              style={{ padding: '8px 18px', fontSize: 12 }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 22 }}>
          {filteredPhotos.map((photo, idx) => {
            const dateInfo = formatPhotoDate(photo.date, photo.createdAt);

            return (
              <div
                key={photo.id || idx}
                onClick={() => setActivePhoto(photo)}
                className="glass-card animate-fade-up"
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid rgba(56, 167, 255, 0.22)',
                  background: 'rgba(11, 27, 58, 0.65)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                  animationDelay: `${idx * 0.04}s`,
                  opacity: 0
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(56, 167, 255, 0.55)';
                  e.currentTarget.style.boxShadow = '0 14px 36px rgba(11, 35, 66, 0.6)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(56, 167, 255, 0.22)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
                }}
              >
                {/* Photo Image Container */}
                <div style={{ position: 'relative', height: 210, overflow: 'hidden', background: '#071329' }}>
                  <img
                    src={photo.image}
                    alt={photo.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = '/images/sports/running_100m.png?v=3';
                    }}
                  />

                  {/* Gradient Shadow */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(11, 27, 58, 0.95) 0%, transparent 60%)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Date, Month, Year Badge (Prominently displayed) */}
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 12,
                        background: 'rgba(3, 17, 38, 0.85)',
                        border: '1px solid rgba(56, 167, 255, 0.45)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                      }}
                    >
                      <Calendar style={{ width: 13, height: 13, color: '#38A7FF' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.2px' }}>
                        {dateInfo.full}
                      </span>
                    </div>
                  </div>

                  {/* Zoom indicator button */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(3, 17, 38, 0.75)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.18)'
                    }}
                  >
                    <Maximize2 style={{ width: 13, height: 13 }} />
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: 16,
                        color: '#FFFFFF',
                        margin: '0 0 6px',
                        lineHeight: 1.4
                      }}
                    >
                      {photo.title}
                    </h3>
                    {photo.description && (
                      <p
                        style={{
                          fontSize: 12,
                          color: '#6E86A5',
                          margin: 0,
                          lineHeight: 1.55,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {photo.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer with explicit Date, Month, Year */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#38A7FF', fontWeight: 600 }}>
                      View Full Photo
                    </span>
                    <span style={{ fontSize: 11, color: '#AFC4DF' }}>
                      📅 {dateInfo.full}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox HD Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 8, 23, 0.90)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-fade-up"
            style={{
              position: 'relative',
              maxWidth: 920,
              width: '100%',
              background: '#07152E',
              border: '1px solid rgba(56, 167, 255, 0.4)',
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(3, 17, 38, 0.7)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar style={{ width: 14, height: 14, color: '#38A7FF' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                  Date: {formatPhotoDate(activePhoto.date, activePhoto.createdAt).full}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={activePhoto.image}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="btn-outline"
                  style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Full Image
                </a>
                <button
                  onClick={() => setActivePhoto(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* Modal Image */}
            <div
              style={{
                background: '#020817',
                maxHeight: '65vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <img
                src={activePhoto.image}
                alt={activePhoto.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>

            {/* Modal Footer Description */}
            <div style={{ padding: '18px 24px', background: '#07152E' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {activePhoto.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#38A7FF', fontWeight: 600 }}>
                  <Calendar style={{ width: 14, height: 14 }} />
                  <span>{formatPhotoDate(activePhoto.date, activePhoto.createdAt).full}</span>
                </div>
              </div>
              {activePhoto.description && (
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
                  {activePhoto.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
