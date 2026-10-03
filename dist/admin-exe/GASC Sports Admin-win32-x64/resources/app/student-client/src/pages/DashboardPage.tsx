import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Calendar, Medal, Dumbbell, ArrowRight, Clock,
  MapPin, ChevronRight, Star, Zap, Users, TrendingUp, Image
} from 'lucide-react';

// ── Sample data ───────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Sports Available', value: 12, sub: '+3 this season', icon: Dumbbell, color: 'blue', gradient: 'linear-gradient(135deg,rgba(22,119,255,0.20),rgba(22,119,255,0.05))' },
  { label: 'Upcoming Events', value: 25, sub: 'Register now', icon: Calendar, color: 'purple', gradient: 'linear-gradient(135deg,rgba(108,76,255,0.20),rgba(108,76,255,0.05))' },
  { label: 'Registered Tournaments', value: 8, sub: 'Active entries', icon: Trophy, color: 'orange', gradient: 'linear-gradient(135deg,rgba(255,106,33,0.20),rgba(255,106,33,0.05))' },
  { label: 'Medals / Achievements', value: 4, sub: 'All-time', icon: Medal, color: 'cyan', gradient: 'linear-gradient(135deg,rgba(34,211,238,0.20),rgba(34,211,238,0.05))' },
];

const QUICK_ACTIONS = [
  { icon: Dumbbell, label: 'Register for Sports', desc: 'Join your favorite sport', path: '/student/sports', color: '#1677FF' },
  { icon: Users, label: 'View My Teams', desc: 'Check team roster', path: '/student/sports', color: '#6C4CFF' },
  { icon: Trophy, label: 'Official Tournaments', desc: 'Browse parent tournaments', path: '/student/tournaments', color: '#FF6A21' },
  { icon: Image, label: 'Sports Photos', desc: 'View college athletic moments', path: '/student/gallery', color: '#22D3EE' },
];

const RECENT_ACTIVITY = [
  { text: 'You registered for Cricket Championship', time: '2 hours ago', type: 'blue' },
  { text: 'Your team won the Inter-College Badminton match', time: '1 day ago', type: 'green' },
  { text: 'New sports announcement posted', time: '2 days ago', type: 'orange' },
  { text: 'Certificate issued for Athletics Meet', time: '3 days ago', type: 'purple' },
];

const DashboardPage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/competitions');
        const data = await res.json();
        const list = data.competitions || data.data;
        if (data.success && Array.isArray(list)) {
          setEvents(list.slice(0, 4));
        }
      } catch { /* use fallback */ }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const fallbackEvents = [
    { _id: '1', name: 'Cricket Championship', date: 'Oct 12, 2026', venue: 'GASC Ground', sport: 'Cricket', status: 'Open' },
    { _id: '2', name: 'Badminton Tournament', date: 'Oct 14, 2026', venue: 'Indoor Stadium', sport: 'Badminton', status: 'Open' },
    { _id: '3', name: 'Football League', date: 'Oct 18, 2026', venue: 'College Ground', sport: 'Football', status: 'Open' },
    { _id: '4', name: 'Athletics Meet 2026', date: 'Oct 20, 2026', venue: 'Sports Complex', sport: 'Athletics', status: 'Upcoming' },
  ];

  const displayEvents = events.length > 0 ? events : fallbackEvents;

  const sportEmoji: Record<string, string> = {
    Cricket: '🏏', Badminton: '🏸', Football: '⚽', Basketball: '🏀',
    Athletics: '🏃', Volleyball: '🏐', 'Table Tennis': '🏓', Chess: '♟️', Carrom: '🎯'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ══ HERO BANNER ══════════════════════════════════════════════════════ */}
      <div
        className="hero-banner animate-fade-up"
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(55,140,255,0.20)'
        }}
      >
        <img
          src="/images/hero-banner.jpg"
          alt="GASC Sports - Play. Compete. Achieve."
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 20 }}
        />
      </div>

      {/* ══ STAT CARDS ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="animate-fade-up delay-1">
        {STATS.map(({ label, value, sub, icon: Icon, color, gradient }) => (
          <div
            key={label}
            className={`stat-card ${color}`}
            style={{ background: gradient }}
          >
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon style={{ width: 22, height: 22, color: color === 'blue' ? '#38A7FF' : color === 'purple' ? '#a78bfa' : color === 'orange' ? '#FF8A50' : '#22D3EE' }} />
              </div>
              <Star style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Value */}
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 36, color: '#FFFFFF', lineHeight: 1, marginBottom: 4 }}>
              {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 13, color: '#AFC4DF', fontWeight: 500, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 11, color: color === 'blue' ? '#38A7FF' : color === 'purple' ? '#a78bfa' : color === 'orange' ? '#FF8A50' : '#22D3EE', fontWeight: 600 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ══ MIDDLE ROW: QUICK ACTIONS + UPCOMING EVENTS ══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>

        {/* Quick Actions */}
        <div className="gasc-card animate-fade-up delay-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Quick Actions</h2>
            <Zap style={{ width: 16, height: 16, color: '#38A7FF' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label, desc, path, color }) => (
              <Link
                key={label}
                to={path}
                style={{ textDecoration: 'none', padding: 16, borderRadius: 12, background: 'rgba(8,27,53,0.6)', border: '1px solid rgba(55,140,255,0.12)', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.22s', cursor: 'pointer' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.40)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px rgba(22,119,255,0.12)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 12, color: '#FFFFFF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 11, color: '#6E86A5', margin: 0 }}>{desc}</p>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: '#38A7FF', marginTop: 'auto' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="gasc-card animate-fade-up delay-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Upcoming Events</h2>
            <Link to="/student/tournaments" style={{ fontSize: 12, color: '#38A7FF', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 60, borderRadius: 10, background: 'rgba(55,140,255,0.06)', backgroundImage: 'linear-gradient(90deg, rgba(55,140,255,0.06) 25%, rgba(55,140,255,0.12) 50%, rgba(55,140,255,0.06) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayEvents.map((ev: any) => (
                <div
                  key={ev._id || ev.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.35)'; (e.currentTarget as HTMLElement).style.background = 'rgba(22,119,255,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.10)'; (e.currentTarget as HTMLElement).style.background = 'rgba(8,27,53,0.5)'; }}
                >
                  {/* Sport emoji */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(22,119,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {sportEmoji[ev.sport] || sportEmoji[ev.sportName] || '🏅'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, color: '#FFFFFF', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name || ev.title}
                    </p>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6E86A5' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {ev.date || ev.startDate || 'TBD'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin style={{ width: 11, height: 11 }} />
                        {ev.venue || 'GASC Campus'}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/student/tournaments"
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0 }}
                  >
                    Register
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM ROW: RECENT ACTIVITY + READY TO COMPETE ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Recent Activity */}
        <div className="gasc-card animate-fade-up delay-3" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="timeline-item" style={{ paddingLeft: 28 }}>
                <div className="timeline-dot" style={{ borderColor: item.type === 'blue' ? '#38A7FF' : item.type === 'green' ? '#4ade80' : item.type === 'orange' ? '#FF8A50' : '#a78bfa' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.type === 'blue' ? '#38A7FF' : item.type === 'green' ? '#4ade80' : item.type === 'orange' ? '#FF8A50' : '#a78bfa' }} />
                </div>
                <div style={{ background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#AFC4DF', margin: '0 0 4px', fontWeight: 500 }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: '#6E86A5', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock style={{ width: 11, height: 11 }} />{item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to Compete CTA */}
        <div
          className="gasc-card animate-fade-up delay-3"
          style={{
            padding: 32,
            background: 'linear-gradient(135deg, #0D284A 0%, #071B35 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative glow */}
          <div style={{ position: 'absolute', top: -40, right: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(22,119,255,0.12)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,106,33,0.08)', filter: 'blur(30px)' }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="badge badge-blue" style={{ marginBottom: 16 }}>🏆 Tournaments Open</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 28, color: '#FFFFFF', lineHeight: 1.1, margin: '0 0 12px' }}>
              Ready to<br /><span style={{ color: '#FF6A21' }}>Compete?</span>
            </h3>
            <p style={{ fontSize: 13, color: '#AFC4DF', margin: '0 0 24px', lineHeight: 1.6 }}>
              Register for upcoming tournaments and showcase your talent on the big stage.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/student/tournaments" className="btn-primary" style={{ padding: '11px 20px', fontSize: 13 }}>
              View All Tournaments <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <Link to="/student/sports" className="btn-outline" style={{ padding: '10px 18px', fontSize: 13 }}>
              Explore Sports
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 24, marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(55,140,255,0.12)', width: '100%' }}>
            {[{ v: '12', l: 'Sports' }, { v: '25', l: 'Events' }, { v: '500+', l: 'Students' }].map(s => (
              <div key={s.l}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: '#38A7FF', margin: '0 0 2px' }}>{s.v}</p>
                <p style={{ fontSize: 11, color: '#6E86A5', margin: 0 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
