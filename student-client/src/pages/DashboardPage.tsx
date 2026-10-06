import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Calendar, Medal, Dumbbell, ArrowRight, Clock,
  MapPin, ChevronRight, Star, Zap, Users, Image, Sparkles,
  Package, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Sample data ───────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Sports Available', value: 12, sub: '+3 new disciplines', icon: Dumbbell, color: 'blue', gradient: 'linear-gradient(135deg,rgba(22,119,255,0.22),rgba(22,119,255,0.06))' },
  { label: 'Upcoming Events', value: 25, sub: 'Registration open', icon: Calendar, color: 'purple', gradient: 'linear-gradient(135deg,rgba(139,92,246,0.22),rgba(139,92,246,0.06))' },
  { label: 'Registered Tournaments', value: 8, sub: 'Active college entries', icon: Trophy, color: 'orange', gradient: 'linear-gradient(135deg,rgba(255,106,33,0.22),rgba(255,106,33,0.06))' },
  { label: 'Medals / Honors', value: 4, sub: 'State & Zonal titles', icon: Medal, color: 'cyan', gradient: 'linear-gradient(135deg,rgba(6,182,212,0.22),rgba(6,182,212,0.06))' },
];

const QUICK_ACTIONS = [
  { icon: Dumbbell, label: 'Sports Tournaments', desc: 'Register for upcoming events', path: '/student/tournaments', color: '#1677FF' },
  { icon: Package, label: 'Equipment Portal', desc: 'Track issued kits & gear', path: '/student/equipment', color: '#8B5CF6' },
  { icon: Trophy, label: 'College Sports', desc: 'Explore sports disciplines', path: '/student/sports', color: '#FF6A21' },
  { icon: Image, label: 'Athletic Moments', desc: 'High-res photos & gallery', path: '/student/gallery', color: '#06B6D4' },
];

const RECENT_ACTIVITY = [
  { text: 'You registered for Inter-College Cricket Championship', time: '2 hours ago', type: 'blue' },
  { text: 'Your team qualified for Badminton Zonal Championship match', time: '1 day ago', type: 'green' },
  { text: 'New equipment issue policy announced by PE Department', time: '2 days ago', type: 'orange' },
  { text: 'Official certificate issued for Annual Athletics Meet', time: '3 days ago', type: 'purple' },
];

const LIVE_ANNOUNCEMENTS = [
  '🏆 Inter-Collegiate Cricket Championship Registrations Now Open',
  '🏸 Badminton Singles & Doubles Trials: Friday 9:00 AM @ Indoor Stadium',
  '🥇 Annual Athletic Meet: Check Rules & Equipment Schedules',
  '📦 Sports Kit Return Due: Return issued equipment before 4:30 PM on game days',
  '⚽ Football League Selection Camp: Registration closing this weekend',
];

const DashboardPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentUser, setStudentUser] = useState<any>(null);

  useEffect(() => {
    // Load student user info
    try {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        setStudentUser(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }

    const fetchEvents = async () => {
      // 1. Direct Supabase query
      try {
        const { data: supaEvents } = await supabase
          .from('competitions')
          .select('*')
          .order('date', { ascending: true })
          .limit(4);
        if (supaEvents && supaEvents.length > 0) {
          setEvents(supaEvents);
          setLoading(false);
          return;
        }
      } catch (err) {}

      // 2. Fallback to API
      try {
        let res = await fetch('/api/competitions');
        if (res.ok) {
          const data = await res.json();
          const list = data.competitions || data.data || (Array.isArray(data) ? data : []);
          if (Array.isArray(list)) {
            setEvents(list.slice(0, 4));
          }
        }
      } catch { /* keep existing */ }
      setLoading(false);
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);

    // Supabase Realtime for instant dashboard event updates
    const channel = supabase
      .channel('dashboard_realtime_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
        fetchEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
        fetchEvents();
      })
      .subscribe();

    window.addEventListener('storage', fetchEvents);
    window.addEventListener('gasc_tournaments_updated', fetchEvents);
    window.addEventListener('focus', fetchEvents);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      window.removeEventListener('storage', fetchEvents);
      window.removeEventListener('gasc_tournaments_updated', fetchEvents);
      window.removeEventListener('focus', fetchEvents);
    };
  }, []);

  const displayEvents = events;

  const sportEmoji: Record<string, string> = {
    Cricket: '🏏', Badminton: '🏸', Football: '⚽', Basketball: '🏀',
    Athletics: '🏃', Volleyball: '🏐', 'Table Tennis': '🏓', Chess: '♟️', Carrom: '🎯'
  };

  const studentName = studentUser?.name || 'Student Athlete';
  const regNo = studentUser?.registerNumber || studentUser?.regNo || studentUser?.register_number || 'C24UG183CSC014';
  const dept = studentUser?.department || studentUser?.dept || 'Computer Science';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ══ CINEMATIC ATHLETE HERO ARENA ══════════════════════════════════════════════════ */}
      <div
        className="gasc-card stagger-1"
        style={{
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          padding: 0,
          border: '1px solid var(--accent-border)',
          boxShadow: '0 20px 50px var(--accent-glow), 0 10px 30px rgba(0,0,0,0.5)',
          background: 'var(--bg-card-solid)',
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Background Athletic Image with Cinematic Dual Gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(90deg, rgba(2, 8, 23, 0.94) 0%, rgba(2, 8, 23, 0.82) 48%, rgba(2, 8, 23, 0.40) 100%), url('/images/hero-banner.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            zIndex: 1,
          }}
        />

        {/* Ambient Glow Orbs */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: 40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            filter: 'blur(80px)',
            opacity: 0.35,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Hero Top Content */}
        <div style={{ position: 'relative', zIndex: 10, padding: '32px 32px 20px' }}>
          {/* Athlete Identity Meta Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(2, 8, 23, 0.75)',
                border: '1px solid var(--accent-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="beacon-dot" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-secondary)', letterSpacing: '0.04em' }}>
                LIVE ATHLETIC ARENA 2026
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                fontSize: 12,
                color: '#AFC4DF',
                fontWeight: 600,
              }}
            >
              <ShieldCheck style={{ width: 14, height: 14, color: '#4ADE80' }} />
              <span>REG NO: <strong style={{ color: '#FFFFFF' }}>{regNo}</strong> • {dept}</span>
            </div>
          </div>

          {/* Main Title & Slogan */}
          <div style={{ maxWidth: 640 }}>
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(28px, 4vw, 42px)',
                color: '#FFFFFF',
                lineHeight: 1.15,
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}
            >
              WELCOME BACK,<br />
              <span className="gradient-text-shimmer">{studentName.toUpperCase()}</span>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#AFC4DF',
                margin: '0 0 24px',
                lineHeight: 1.6,
                fontWeight: 400,
                maxWidth: 540,
              }}
            >
              Train hard, represent GASC Idappadi with honor, and chase championship glory. Explore active tournament registrations and track your athletic achievements.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Link
              to="/student/tournaments"
              className="btn-primary btn-interactive-ripple"
              style={{ padding: '12px 24px', fontSize: 13, gap: 8, boxShadow: '0 6px 24px var(--accent-glow)' }}
            >
              <Trophy style={{ width: 16, height: 16 }} />
              Browse Tournaments
              <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>

            <Link
              to="/student/sports"
              className="btn-outline btn-interactive-ripple"
              style={{ padding: '11px 20px', fontSize: 13, gap: 8 }}
            >
              <Dumbbell style={{ width: 15, height: 15 }} />
              Explore Sports
            </Link>

            <Link
              to="/student/equipment"
              className="btn-outline btn-interactive-ripple"
              style={{ padding: '11px 20px', fontSize: 13, gap: 8 }}
            >
              <Package style={{ width: 15, height: 15 }} />
              My Equipment
            </Link>
          </div>
        </div>

        {/* Live Sports Ticker Marquee along Bottom Edge */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(2, 8, 23, 0.85)',
            borderTop: '1px solid var(--accent-border)',
            backdropFilter: 'blur(16px)',
            padding: '10px 0',
            overflow: 'hidden',
          }}
        >
          <div className="ticker-marquee-track">
            {[...LIVE_ANNOUNCEMENTS, ...LIVE_ANNOUNCEMENTS].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 24px',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  fontWeight: 600,
                  color: idx % 2 === 0 ? 'var(--text-primary)' : 'var(--accent-secondary)',
                }}
              >
                <span>{item}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>•</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STAT CARDS ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {STATS.map(({ label, value, sub, icon: Icon, color, gradient }, idx) => (
          <div
            key={label}
            className={`stat-card ${color} interactive-hover-card stagger-${(idx % 4) + 1}`}
            style={{
              background: gradient,
              border: '1px solid var(--border-glass)',
              cursor: 'pointer',
            }}
          >
            {/* Icon Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              >
                <Icon
                  style={{
                    width: 22,
                    height: 22,
                    color: color === 'blue' ? 'var(--accent-secondary)' : color === 'purple' ? '#a78bfa' : color === 'orange' ? '#FF8A50' : '#22D3EE'
                  }}
                />
              </div>
              <Sparkles style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Value Counter */}
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 38,
                color: 'var(--text-primary)',
                lineHeight: 1,
                marginBottom: 6,
                letterSpacing: '-0.02em',
              }}
            >
              {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: color === 'blue' ? 'var(--accent-secondary)' : color === 'purple' ? '#a78bfa' : color === 'orange' ? '#FF8A50' : '#22D3EE',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ══ MIDDLE ROW: QUICK ACTIONS + UPCOMING EVENTS ══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* Quick Actions */}
        <div className="gasc-card stagger-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Quick Actions
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Instant portals for student athletes</p>
            </div>
            <Zap style={{ width: 18, height: 18, color: 'var(--accent-secondary)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label, desc, path, color }) => (
              <Link
                key={label}
                to={path}
                className="interactive-hover-card btn-interactive-ripple"
                style={{
                  textDecoration: 'none',
                  padding: 16,
                  borderRadius: 14,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${color}30`,
                  }}
                >
                  <Icon style={{ width: 20, height: 20, color }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                    {desc}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)' }}>
                  <span>Launch</span>
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="gasc-card stagger-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Upcoming Tournaments
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Registered and college fixtures</p>
            </div>
            <Link to="/student/tournaments" style={{ fontSize: 12, color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 700 }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 64,
                    borderRadius: 12,
                    background: 'var(--bg-input)',
                    backgroundImage: 'linear-gradient(90deg, rgba(55,140,255,0.06) 25%, rgba(55,140,255,0.14) 50%, rgba(55,140,255,0.06) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite'
                  }}
                />
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
              No upcoming sports events right now. Check back soon!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayEvents.map((ev: any) => {
                const sName = ev.sportName || ev.sport || ev.name || '';
                const dStr = ev.date
                  ? (ev.date.includes('T') ? new Date(ev.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ev.date)
                  : 'TBD';
                return (
                  <div
                    key={ev._id || ev.id}
                    className="interactive-hover-card btn-interactive-ripple"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-glass)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Sport Emoji / Icon Badge */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'var(--accent-subtle)',
                        border: '1px solid var(--accent-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      {sportEmoji[sName] || sportEmoji[ev.name] || '🏅'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          margin: '0 0 4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ev.name || ev.title}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock style={{ width: 12, height: 12, color: 'var(--accent-secondary)' }} />
                          {dStr}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin style={{ width: 12, height: 12 }} />
                          {ev.venue || 'GASC Idappadi Grounds'}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/student/tournaments"
                      className="btn-outline btn-interactive-ripple"
                      style={{ padding: '6px 14px', fontSize: 11, flexShrink: 0 }}
                    >
                      Enter Event
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM ROW: RECENT ACTIVITY + READY TO COMPETE ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* Recent Activity Timeline */}
        <div className="gasc-card stagger-3" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Recent Activity & Milestones
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="timeline-item" style={{ paddingLeft: 28 }}>
                <div
                  className="timeline-dot"
                  style={{
                    borderColor: item.type === 'blue' ? 'var(--accent-secondary)' : item.type === 'green' ? '#4ade80' : item.type === 'orange' ? '#FF8A50' : '#a78bfa'
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: item.type === 'blue' ? 'var(--accent-secondary)' : item.type === 'green' ? '#4ade80' : item.type === 'orange' ? '#FF8A50' : '#a78bfa'
                    }}
                  />
                </div>
                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 12,
                    padding: '12px 16px',
                  }}
                >
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 600 }}>
                    {item.text}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock style={{ width: 12, height: 12 }} />
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to Compete Mega CTA */}
        <div
          className="gasc-card stagger-3"
          style={{
            padding: 32,
            background: 'linear-gradient(135deg, rgba(13,40,74,0.9) 0%, rgba(7,27,53,0.95) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--accent-border)',
            boxShadow: '0 16px 44px var(--accent-glow)',
          }}
        >
          {/* Decorative Glow Orbs */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -30,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              filter: 'blur(50px)',
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              left: 20,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: '#FF6A21',
              filter: 'blur(40px)',
              opacity: 0.20,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <span
              className="badge"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--accent-secondary)',
                border: '1px solid var(--accent-border)',
                marginBottom: 16,
                padding: '4px 12px',
                fontSize: 11,
              }}
            >
              🏆 REGISTRATIONS OPEN
            </span>
            <h3
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 32,
                color: '#FFFFFF',
                lineHeight: 1.1,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              Ready to<br />
              <span style={{ color: '#FF6A21' }}>Compete & Win?</span>
            </h3>
            <p style={{ fontSize: 13, color: '#AFC4DF', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 420 }}>
              Step onto the college stadium, wear the GASC Idappadi colors, and make your department proud in upcoming inter-collegiate leagues.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              to="/student/tournaments"
              className="btn-primary btn-interactive-ripple"
              style={{ padding: '12px 22px', fontSize: 13 }}
            >
              View Tournaments <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <Link
              to="/student/sports"
              className="btn-outline btn-interactive-ripple"
              style={{ padding: '11px 20px', fontSize: 13 }}
            >
              Explore Sports
            </Link>
          </div>

          {/* Quick Department Athletic Counters */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              gap: 28,
              marginTop: 28,
              paddingTop: 20,
              borderTop: '1px solid var(--border-glass)',
              width: '100%',
            }}
          >
            {[
              { v: '12', l: 'Disciplines' },
              { v: '25+', l: 'Active Events' },
              { v: '500+', l: 'Athletes Enrolled' }
            ].map(s => (
              <div key={s.l}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--accent-secondary)', margin: '0 0 2px' }}>
                  {s.v}
                </p>
                <p style={{ fontSize: 11, color: '#6E86A5', margin: 0, fontWeight: 500 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
