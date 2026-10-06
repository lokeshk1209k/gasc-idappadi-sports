import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Calendar, Medal, Dumbbell, ArrowRight, Clock,
  MapPin, ChevronRight, Star, Zap, Users, TrendingUp,
  Package, ShieldCheck, Flame, Bell, Sparkles, Activity, CheckCircle2, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface StudentData {
  name: string;
  regNo: string;
  department: string;
  year: string;
  gender: string;
}

const FEATURED_SPORTS_GRID = [
  {
    name: 'Cricket',
    category: 'Team Sport',
    icon: '🏏',
    img: '/images/sports/cricket.jpg',
    slots: '11 vs 11',
    status: 'Fixtures Active',
    badgeColor: '#1677FF'
  },
  {
    name: 'Football',
    category: 'Team Sport',
    icon: '⚽',
    img: '/images/sports/football.jpg',
    slots: '7-a-side Open',
    status: 'League On',
    badgeColor: '#10B981'
  },
  {
    name: 'Badminton',
    category: 'Racquet Sport',
    icon: '🏸',
    img: '/images/sports/badminton.jpg',
    slots: 'Singles & Doubles',
    status: 'Indoor Court',
    badgeColor: '#8B5CF6'
  },
  {
    name: 'Kabaddi',
    category: 'Traditional Sport',
    icon: '🤼',
    img: '/images/sports/kabaddi.jpg',
    slots: 'State Qualifier',
    status: 'Pro Rules',
    badgeColor: '#FF6A21'
  },
  {
    name: 'Athletics & Track',
    category: 'Field Events',
    icon: '🏃',
    img: '/images/sports/running.jpg',
    slots: '100m, Relay, Javelin',
    status: 'Open Trials',
    badgeColor: '#06B6D4'
  },
  {
    name: 'Volleyball',
    category: 'Court Sport',
    icon: '🏐',
    img: '/images/sports/volleyball.jpg',
    slots: '6 vs 6',
    status: 'Annual Cup',
    badgeColor: '#F43F5E'
  },
];

const RECENT_ACTIVITIES = [
  { id: 1, title: 'Annual Inter-Department Cricket Tournament Registration Open', time: '10 mins ago', type: 'tournament', icon: Trophy, color: '#1677FF' },
  { id: 2, title: 'Physical Education Dept issued Athletics Clearance for Semester 2', time: '1 hour ago', type: 'clearance', icon: ShieldCheck, color: '#10B981' },
  { id: 3, title: 'Badminton Doubles Match Scheduled: CS Thunder vs Mech Titans', time: 'Yesterday', type: 'match', icon: Zap, color: '#8B5CF6' },
  { id: 4, title: 'Sports Kit check-out verified: Cricket Bat & Shin Guards', time: '2 days ago', type: 'equipment', icon: Package, color: '#FF6A21' },
];

const DEPARTMENT_LEADERBOARD = [
  { rank: '01', dept: 'Computer Science', points: 420, gold: 5, silver: 3, streak: '🔥 3 Wins' },
  { rank: '02', dept: 'Commerce (CA)', points: 380, gold: 4, silver: 4, streak: '⚡ 2 Wins' },
  { rank: '03', dept: 'Mathematics', points: 310, gold: 3, silver: 2, streak: '⭐ Active' },
  { rank: '04', dept: 'Physics', points: 260, gold: 2, silver: 3, streak: '⭐ Active' },
];

const DashboardPage = () => {
  const { currentPreset, darkMode } = useTheme();
  const [student, setStudent] = useState<StudentData>({
    name: 'Student Athlete',
    regNo: 'C24UG183CSC014',
    department: 'Computer Science',
    year: 'III Year',
    gender: 'Athlete'
  });

  const [currentTime, setCurrentTime] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'standings' | 'notices'>('feed');

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load User Data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        const u = JSON.parse(stored);
        setStudent({
          name: u.name || 'Student Athlete',
          regNo: u.registerNumber || u.regNo || u.register_number || 'C24UG183CSC014',
          department: u.department || u.dept || 'Computer Science',
          year: u.year || 'III Year',
          gender: u.gender || 'Athlete'
        });
      }
    } catch {
      /* fallback */
    }
  }, []);

  // Fetch Live Tournaments & Competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const { data: supaEvents } = await supabase
          .from('competitions')
          .select('*')
          .order('date', { ascending: true })
          .limit(4);

        if (supaEvents && supaEvents.length > 0) {
          setEvents(supaEvents);
          setLoadingEvents(false);
          return;
        }
      } catch {}

      try {
        const res = await fetch('/api/competitions');
        if (res.ok) {
          const data = await res.json();
          const list = data.competitions || data.data || (Array.isArray(data) ? data : []);
          if (Array.isArray(list) && list.length > 0) {
            setEvents(list.slice(0, 4));
            setLoadingEvents(false);
            return;
          }
        }
      } catch {}

      // High-energy fallback events
      setEvents([
        {
          id: 'ev_1',
          name: 'GASC Annual Inter-Dept Cricket Cup 2026',
          sport: 'Cricket',
          date: '2026-10-14',
          venue: 'Main College Turf Ground',
          teams: '16 Teams',
          status: 'Registration Open',
          category: 'Men & Women'
        },
        {
          id: 'ev_2',
          name: 'Periyar University Badminton Championship',
          sport: 'Badminton',
          date: '2026-10-20',
          venue: 'Indoor Badminton Arena',
          teams: '32 Players',
          status: 'Fast Filling',
          category: 'Singles / Doubles'
        },
        {
          id: 'ev_3',
          name: 'State Level Kabaddi Pro Challenge',
          sport: 'Kabaddi',
          date: '2026-10-28',
          venue: 'P.E. Outdoor Stadium',
          teams: '12 Teams',
          status: 'Trials Live',
          category: 'Open Weight'
        },
        {
          id: 'ev_4',
          name: 'All-College 100m & 4x100m Sprint Gala',
          sport: 'Athletics & Track',
          date: '2026-11-04',
          venue: 'Synthetic Track Ring',
          teams: 'Individual',
          status: 'Open Entry',
          category: 'Athletics'
        }
      ]);
      setLoadingEvents(false);
    };

    fetchCompetitions();
  }, []);

  const studentInitials = (student.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HOLOGRAPHIC ATHLETE COMMAND DECK (HERO MATRIX)
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hud-cockpit-card animate-fade-up"
        style={{
          padding: '30px 32px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--accent-rgb), 0.12) 100%)',
          border: '1px solid var(--accent-border)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 48px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Ambient glow orbs */}
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 260, height: 260,
          borderRadius: '50%', background: 'var(--accent-glow)', filter: 'blur(70px)',
          pointerEvents: 'none', opacity: 0.6
        }} />
        <div style={{
          position: 'absolute', bottom: -50, left: 100, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(56, 167, 255, 0.25)', filter: 'blur(60px)',
          pointerEvents: 'none', opacity: 0.4
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          alignItems: 'center',
          position: 'relative',
          zIndex: 2
        }}>

          {/* Left Column: Greeting & Identity */}
          <div>
            {/* Top pill row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div className="hud-pill" style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} className="animate-pulse" />
                <span>ARENA TELEMETRY ONLINE</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Clock style={{ width: 14, height: 14, color: 'var(--accent-secondary)' }} />
                <span>{currentTime || 'LIVE'}</span>
              </div>
              <div className="hud-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34D399' }}>
                <CheckCircle2 style={{ width: 12, height: 12 }} />
                <span>Verified Athlete</span>
              </div>
            </div>

            {/* Athlete Name & Welcome */}
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              fontWeight: 900,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              margin: '0 0 10px',
              letterSpacing: '-0.03em'
            }}>
              Welcome Back,{' '}
              <span style={{
                background: `linear-gradient(135deg, #FFFFFF 0%, var(--accent-secondary) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                {student.name}
              </span>{' '}
              🔥
            </h1>

            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 20px',
              maxWidth: 540
            }}>
              <span style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{student.department}</span> • {student.year} • Reg No:{' '}
              <span style={{
                fontFamily: 'monospace',
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 8px',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontWeight: 700
              }}>
                {student.regNo}
              </span>
            </p>

            {/* Quick action badges */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                to="/student/tournaments"
                className="btn-primary"
                style={{ padding: '11px 22px', fontSize: 13, gap: 8 }}
              >
                <Trophy style={{ width: 16, height: 16 }} />
                Browse Tournaments
                <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
              <Link
                to="/student/equipment"
                className="btn-outline"
                style={{ padding: '11px 20px', fontSize: 13, gap: 8 }}
              >
                <Package style={{ width: 16, height: 16 }} />
                My Equipment Vault
              </Link>
            </div>
          </div>

          {/* Right Column: Holographic Biometric / Readiness HUD Dial */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            padding: '16px 20px',
            borderRadius: 18,
            background: 'rgba(0, 0, 0, 0.20)',
            border: '1px solid var(--border-glass-strong)',
            backdropFilter: 'blur(16px)'
          }}>
            {/* Circular Dial */}
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
              <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50" cy="50" r="42"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="transparent"
                  stroke="var(--accent-primary)"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset="26"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 6px var(--accent-glow))' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
                  92%
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  READINESS
                </span>
              </div>
            </div>

            {/* Quick Metrics Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Match Clearance</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck style={{ width: 13, height: 13 }} /> Active
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Season Matches</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  14 Played
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Athletic Rating</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFB800', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ★ 4.9 / 5.0
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. HOLOGRAPHIC STAT TELEMETRY BAR (4 NEXT-GEN CARDS)
         ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {/* Card 1: Tournaments */}
        <Link
          to="/student/tournaments"
          className="hud-cockpit-card"
          style={{
            padding: '22px 20px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(22, 119, 255, 0.12) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(22, 119, 255, 0.20)', border: '1px solid rgba(22, 119, 255, 0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF'
            }}>
              <Trophy style={{ width: 22, height: 22 }} />
            </div>
            <span className="badge" style={{ background: 'rgba(22, 119, 255, 0.15)', color: '#38A7FF', border: '1px solid rgba(22, 119, 255, 0.35)' }}>
              12 Active
            </span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
              12
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '6px 0 2px' }}>
              Tournaments Live
            </p>
            <p style={{ fontSize: 11, color: '#38A7FF', margin: 0, fontWeight: 600 }}>
              +3 Registrations Closing Soon →
            </p>
          </div>
        </Link>

        {/* Card 2: Sports Disciplines */}
        <Link
          to="/student/sports"
          className="hud-cockpit-card"
          style={{
            padding: '22px 20px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.12) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(139, 92, 246, 0.20)', border: '1px solid rgba(139, 92, 246, 0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA'
            }}>
              <Dumbbell style={{ width: 22, height: 22 }} />
            </div>
            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', border: '1px solid rgba(139, 92, 246, 0.35)' }}>
              20 Sports
            </span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
              20+
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '6px 0 2px' }}>
              Sports Categories
            </p>
            <p style={{ fontSize: 11, color: '#A78BFA', margin: 0, fontWeight: 600 }}>
              Outdoor, Indoor, Martial Arts →
            </p>
          </div>
        </Link>

        {/* Card 3: Issued Equipment */}
        <Link
          to="/student/equipment"
          className="hud-cockpit-card"
          style={{
            padding: '22px 20px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 106, 33, 0.12) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255, 106, 33, 0.20)', border: '1px solid rgba(255, 106, 33, 0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9A50'
            }}>
              <Package style={{ width: 22, height: 22 }} />
            </div>
            <span className="badge" style={{ background: 'rgba(255, 106, 33, 0.15)', color: '#FF9A50', border: '1px solid rgba(255, 106, 33, 0.35)' }}>
              Kit In-Hand
            </span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
              02
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '6px 0 2px' }}>
              Sports Kits Issued
            </p>
            <p style={{ fontSize: 11, color: '#FF9A50', margin: 0, fontWeight: 600 }}>
              Return within 3 Days • Active →
            </p>
          </div>
        </Link>

        {/* Card 4: Medals & Honors */}
        <div
          className="hud-cockpit-card"
          style={{
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.12) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.20)', border: '1px solid rgba(16, 185, 129, 0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399'
            }}>
              <Medal style={{ width: 22, height: 22 }} />
            </div>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
              5 Accolades
            </span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
              05
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', margin: '6px 0 2px' }}>
              Medals & Honors
            </p>
            <p style={{ fontSize: 11, color: '#34D399', margin: 0, fontWeight: 600 }}>
              2 Gold • 2 Silver • 1 Bronze
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. FEATURED SPORTS ARENA (PHOTO LAUNCHPAD)
         ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              ⚡ Featured Sports Disciplines
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Explore official college training sports and select your arena to register.
            </p>
          </div>
          <Link
            to="/student/sports"
            style={{ fontSize: 13, color: 'var(--accent-secondary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            All 20+ Sports <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16
        }}>
          {FEATURED_SPORTS_GRID.map(sport => (
            <Link
              key={sport.name}
              to="/student/tournaments"
              className="sports-grid-card"
              style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
            >
              {/* Image Container */}
              <div style={{ width: '100%', height: 120, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={sport.img}
                  alt={sport.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transition: 'transform 0.4s ease'
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(3, 17, 38, 0.85) 100%)'
                }} />
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  fontSize: 16, background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(6px)', width: 28, height: 28,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {sport.icon}
                </span>
                <span style={{
                  position: 'absolute', bottom: 8, left: 10,
                  fontSize: 10, fontWeight: 700, color: '#FFFFFF',
                  background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 6
                }}>
                  {sport.slots}
                </span>
              </div>

              {/* Text details */}
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {sport.name}
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {sport.category}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sport.badgeColor }}>
                    {sport.status}
                  </span>
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. MIDDLE SECTION: LIVE TOURNAMENT RADAR + ATHLETE ACTIVITY FEED
         ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 22
      }}>

        {/* ── Left Column: Live Tournament Fixtures ── */}
        <div className="hud-cockpit-card" style={{ padding: '24px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                <Trophy style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  Upcoming Tournaments Radar
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  Live college competitions and trial schedules
                </p>
              </div>
            </div>
            <Link
              to="/student/tournaments"
              style={{ fontSize: 12, color: 'var(--accent-secondary)', fontWeight: 700, textDecoration: 'none' }}
            >
              View All →
            </Link>
          </div>

          {loadingEvents ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((ev, i) => {
                const dateText = ev.date ? (ev.date.includes('T') ? new Date(ev.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ev.date) : 'Oct 2026';
                return (
                  <div
                    key={ev.id || i}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--accent-glow)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-glass)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Date Block */}
                    <div style={{
                      width: 48,
                      height: 52,
                      borderRadius: 10,
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase' }}>
                        {dateText.split(' ')[0]}
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
                        {dateText.split(' ')[1]?.replace(',', '') || '14'}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
                          {ev.sport || 'Sports'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#34D399' }}>
                          ● {ev.status || 'Active'}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '0 0 3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {ev.name || ev.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin style={{ width: 11, height: 11 }} /> {ev.venue || 'GASC Idappadi'}
                        </span>
                        <span>•</span>
                        <span>{ev.teams || 'Open Entry'}</span>
                      </div>
                    </div>

                    {/* Register button */}
                    <Link
                      to="/student/tournaments"
                      className="btn-primary"
                      style={{ padding: '7px 14px', fontSize: 12, flexShrink: 0 }}
                    >
                      Join
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right Column: Interactive Activity & Department Standings ── */}
        <div className="hud-cockpit-card" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
          {/* Header with interactive tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'feed' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'feed' ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Activity Feed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('standings')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'standings' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'standings' ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Leaderboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notices')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'notices' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'notices' ? '#FFFFFF' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                P.E. Bulletins
              </button>
            </div>
          </div>

          {/* Tab 1: Activity Feed */}
          {activeTab === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {RECENT_ACTIVITIES.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: `${item.color}20`, border: `1px solid ${item.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.color, flexShrink: 0
                    }}>
                      <Icon style={{ width: 16, height: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px', lineHeight: 1.4 }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 11, height: 11 }} /> {item.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Leaderboard */}
          {activeTab === 'standings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '0 10px', textTransform: 'uppercase' }}>
                <span>Department</span>
                <span>Gold / Points</span>
              </div>
              {DEPARTMENT_LEADERBOARD.map(d => (
                <div
                  key={d.rank}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: d.rank === '01' ? '#FFB80020' : 'rgba(255,255,255,0.06)',
                      color: d.rank === '01' ? '#FFB800' : 'var(--text-secondary)',
                      fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {d.rank}
                    </span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {d.dept}
                      </p>
                      <span style={{ fontSize: 10, color: '#34D399', fontWeight: 600 }}>{d.streak}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      {d.points} pts
                    </span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      🥇 {d.gold} Gold • 🥈 {d.silver} Silver
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: P.E. Bulletins */}
          {activeTab === 'notices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {[
                { title: 'Morning Fitness Session (6:30 AM to 8:00 AM) Ground Open', date: 'Daily Activity', tag: 'Routine' },
                { title: 'Cricket & Football Kit return deadline for previous semester matches', date: 'Due this Friday', tag: 'Action Required' },
                { title: 'Physical director selection trials for Inter-University Volleyball', date: 'Oct 15, 2026', tag: 'Trials' },
              ].map((n, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-orange" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {n.tag}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.date}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {n.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. QUICK ACTION LAUNCHERS FOOTER STRIP
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hud-cockpit-card"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--accent-rgb), 0.08) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)'
          }}>
            <Sparkles style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Student Athlete Portal • GASC Idappadi
            </h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Physical Education Department • Season 2026-2027
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/student/profile" className="btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>
            My Sports Profile
          </Link>
          <Link to="/student/gallery" className="btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>
            College Photo Gallery
          </Link>
          <Link to="/student/settings" className="btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>
            Theme & Appearance
          </Link>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
