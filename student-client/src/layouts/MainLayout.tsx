import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, User, Dumbbell, Trophy, ClipboardList,
  Users, Award, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, Search, X, Menu, Sun, Moon, Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Auth Context ──────────────────────────────────────────────────────────────
interface StudentUser {
  name: string;
  regNo: string;
  dept: string;
  year: string;
  email?: string;
  phone?: string;
}

interface AuthCtx {
  user: StudentUser | null;
  setUser: (u: StudentUser | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthCtx>({
  user: null, setUser: () => {}, logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

// ── Sidebar nav items matching reference design ──────────────────────────────
const NAV_ITEMS = [
  { icon: Home,          label: 'Dashboard',         path: '/student/dashboard' },
  { icon: User,          label: 'My Profile',        path: '/student/profile' },
  { icon: Trophy,        label: 'Tournaments',        path: '/student/tournaments' },
  { icon: Dumbbell,      label: 'Sports',             path: '/student/sports' },
  { icon: ClipboardList, label: 'My Registrations',   path: '/student/competitions' },
  { icon: Users,         label: 'My Team',            path: '/student/tournaments' },
  { icon: Award,         label: 'Achievements',       path: '/student/profile' },
  { icon: Bell,          label: 'Notifications',     path: '/student/notifications', badge: 3 },
  { icon: Settings,      label: 'Settings',          path: '/student/settings' },
];

// ── Notification data ─────────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { id: 1, title: 'Cricket Championship Registration Open', time: '2 hours ago', type: 'blue', unread: true },
  { id: 2, title: 'Your Badminton registration was approved', time: '1 day ago', type: 'green', unread: true },
  { id: 3, title: 'New Certificate Available', time: '2 days ago', type: 'orange', unread: true },
  { id: 4, title: 'Match schedule updated for Football League', time: '3 days ago', type: 'purple', unread: false },
];

// ── Main Layout ───────────────────────────────────────────────────────────────
const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState<StudentUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();

  // Load user from localStorage dynamically on route change or storage event
  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUser({
            name: u.name || 'Student Athlete',
            regNo: u.registerNumber || u.regNo || u.register_number || '',
            dept: u.department || u.dept || 'Computer Science',
            year: u.year || 'I Year',
            email: u.email || '',
            phone: u.phone || u.mobile || ''
          });
        } catch { /* ignore */ }
      }
    };

    checkUser();
    window.addEventListener('storage', checkUser);
    window.addEventListener('focus', checkUser);
    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('focus', checkUser);
    };
  }, [location.pathname]);

  // Universal button click ripple effect
  useEffect(() => {
    const handleGlobalRipple = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        'button, .btn-primary, .btn-outline, .btn-orange, .nav-item, .btn-interactive-ripple, a.btn-primary, a.btn-outline, .filter-tab'
      ) as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - diameter / 2;
      const y = e.clientY - rect.top - diameter / 2;

      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.className = 'click-ripple';

      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';

      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    document.addEventListener('click', handleGlobalRipple);
    return () => document.removeEventListener('click', handleGlobalRipple);
  }, []);

  const logout = () => {
    localStorage.removeItem('gasc_token');
    localStorage.removeItem('gasc_user');
    setUser(null);
    navigate('/student/login');
  };

  // Auth pages — no sidebar layout
  const isAuthPage = ['/student/login', '/student/register'].some(p => location.pathname.startsWith(p));
  if (isAuthPage) {
    return (
      <AuthContext.Provider value={{ user, setUser, logout }}>
        <div className="min-h-screen" style={{ background: '#020817' }}>
          <Outlet />
        </div>
      </AuthContext.Provider>
    );
  }

  const displayName = user?.name || 'Student Athlete';
  const displayInitials = (displayName || 'ST')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';
  const displayDept = user?.dept || 'GASC Idappadi';

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <div className="app-root">
        {/* ── MOBILE OVERLAY ── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[150] md:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ════════════════════════════════════════
            SIDEBAR
           ════════════════════════════════════════ */}
        <aside
          className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        >
          {/* Brand */}
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '10px', justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'hidden' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-subtle)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                <img
                  src="/images/college-logo.jpg"
                  alt="GASC"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '';
                    (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="color:var(--accent-secondary);font-weight:900;font-size:13px;font-family:Plus Jakarta Sans,sans-serif">G</span>';
                  }}
                />
              </div>
              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                    GASC SPORTS
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2, whiteSpace: 'nowrap' }}>
                    Student Portal
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 10, paddingBottom: 10 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/student/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : ''}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? 'linear-gradient(135deg, #0070F3 0%, #1677FF 100%)' : undefined,
                    color: isActive ? '#FFFFFF' : undefined,
                    boxShadow: isActive ? '0 0 20px rgba(0, 112, 243, 0.45)' : undefined,
                    borderColor: isActive ? 'rgba(56, 167, 255, 0.5)' : undefined
                  }}
                >
                  <Icon className={`nav-icon ${isActive ? 'text-white' : ''}`} style={{ width: 18, height: 18, flexShrink: 0 }} />
                  {!collapsed && <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span style={{ marginLeft: 'auto', background: '#EC4899', color: '#FFFFFF', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 9999, boxShadow: '0 0 10px rgba(236,72,153,0.5)' }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && !collapsed && !item.badge && (
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF', flexShrink: 0, boxShadow: '0 0 8px #FFFFFF' }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Inspirational Runner Card matching reference image */}
          {!collapsed && (
            <div style={{ margin: '8px 12px 12px', padding: '14px', borderRadius: '16px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(56,167,255,0.22)', background: 'linear-gradient(145deg, rgba(7,27,53,0.75) 0%, rgba(2,8,23,0.92) 100%)', boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>
              {/* Neon cyan glow orb */}
              <div style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
              {/* Runner SVG Silhouette */}
              <div style={{ position: 'absolute', right: 6, bottom: 4, width: 84, height: 84, opacity: 0.38, pointerEvents: 'none' }}>
                <svg viewBox="0 0 100 100" fill="none" style={{ width: '100%', height: '100%', stroke: '#22D3EE' }}>
                  <circle cx="68" cy="18" r="7" fill="#22D3EE" />
                  <path d="M64 26 L50 42 L34 38 L22 50" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M50 42 L64 56 L82 50" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M56 48 L44 64 L52 86" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M44 64 L26 72 L16 88" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ color: '#22D3EE', fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 13, lineHeight: 1.2, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(34,211,238,0.5)' }}>
                  Play<br />Learn<br />Grow
                </div>
                <p style={{ fontSize: 9.5, color: '#88A2C4', marginTop: 6, lineHeight: 1.35, maxWidth: '120px' }}>
                  "Sports build character, teamwork and a healthier tomorrow."
                </p>
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(55,140,255,0.12)' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: '7px 10px',
                borderRadius: 10,
                background: 'rgba(22,119,255,0.08)',
                border: '1px solid rgba(55,140,255,0.15)',
                color: '#6E86A5',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: 8
              }}
            >
              {!collapsed && <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>Collapse</span>}
              {collapsed
                ? <ChevronRight style={{ width: 15, height: 15 }} />
                : <ChevronLeft style={{ width: 15, height: 15 }} />
              }
            </button>
          </div>

          {/* Logout */}
          <div style={{ padding: '6px 16px 14px' }}>
            <button
              onClick={logout}
              className="nav-item"
              style={{
                width: 'calc(100% - 0px)',
                margin: 0,
                color: '#EF4444',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)'
              }}
              title={collapsed ? 'Logout' : ''}
            >
              <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════════════
            MAIN WRAPPER
           ════════════════════════════════════════ */}
        <div className={`main-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>

          {/* ── TOP HEADER MATCHING REFERENCE IMAGE ── */}
          <header className="top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {/* Left: Mobile Toggle & Desktop Sidebar Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileOpen(!mobileOpen);
                  } else {
                    setCollapsed(!collapsed);
                  }
                }}
                style={{ color: '#6E86A5', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8 }}
                title="Toggle Sidebar"
              >
                <Menu style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Center: Search Bar matching image */}
            <div style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
              <Search style={{ width: 15, height: 15, position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#6E86A5', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search tournaments, sports, events..."
                className="glass-pill-search"
                style={{ width: '100%' }}
              />
            </div>

            {/* Right: Notifications, Theme Switch, Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Notification Bell with Pink Badge */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
                  style={{ position: 'relative', padding: '8px', borderRadius: '50%', background: 'rgba(8,27,53,0.8)', border: '1px solid rgba(55,140,255,0.20)', cursor: 'pointer', color: '#AFC4DF', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  <Bell style={{ width: 17, height: 17 }} />
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#EC4899', color: '#FFFFFF', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(236,72,153,0.6)' }}>
                    3
                  </span>
                </button>

                {/* Notification Dropdown */}
                {showNotifs && (
                  <div className="animate-fade-in" style={{ position: 'absolute', top: 46, right: 0, width: 340, background: 'var(--bg-card-solid)', border: '1px solid var(--border-glass-strong)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell style={{ width: 16, height: 16, color: 'var(--accent-secondary)' }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Notifications</span>
                        <span className="badge badge-orange" style={{ fontSize: 10, padding: '2px 8px' }}>3 New</span>
                      </div>
                      <button onClick={() => setShowNotifs(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {NOTIFICATIONS.map(n => (
                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.unread ? 'var(--accent-subtle)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: n.type === 'blue' ? 'var(--accent-secondary)' : n.type === 'green' ? '#4ade80' : n.type === 'orange' ? '#FF8A50' : '#a78bfa', boxShadow: n.unread ? `0 0 8px currentColor` : 'none' }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400, color: n.unread ? 'var(--text-primary)' : 'var(--text-secondary)', margin: 0 }}>{n.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <Link to="/student/notifications" onClick={() => setShowNotifs(false)} style={{ fontSize: 13, color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle Pill Switch */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(7,27,53,0.85)',
                  border: '1px solid rgba(56,167,255,0.25)',
                  borderRadius: 9999,
                  padding: '3px 6px',
                  width: 58,
                  height: 30,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: darkMode ? 30 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1677FF 0%, #38A7FF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(56,167,255,0.6)',
                    transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  {darkMode ? <Moon style={{ width: 12, height: 12, color: '#FFFFFF' }} /> : <Sun style={{ width: 12, height: 12, color: '#FFFFFF' }} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px', pointerEvents: 'none' }}>
                  <Sun style={{ width: 11, height: 11, color: '#FBBF24', opacity: darkMode ? 0.4 : 0 }} />
                  <Moon style={{ width: 11, height: 11, color: '#60A5FA', opacity: darkMode ? 0 : 0.4 }} />
                </div>
              </button>

              {/* Student Profile Pill Avatar matching AK pill */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1677FF 0%, #6C4CFF 100%)',
                    border: '2px solid rgba(56,167,255,0.4)',
                    boxShadow: '0 0 14px rgba(22,119,255,0.4)',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: 13,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  title={displayName}
                >
                  {displayInitials}
                </button>

                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="animate-fade-in" style={{ position: 'absolute', top: 48, right: 0, width: 220, background: '#071B35', border: '1px solid rgba(55,140,255,0.25)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(55,140,255,0.12)', background: 'rgba(22,119,255,0.06)' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', margin: 0 }}>{displayName}</p>
                      <p style={{ fontSize: 11, color: '#6E86A5', margin: '2px 0 0' }}>{displayDept}</p>
                    </div>
                    {[
                      { icon: User, label: 'My Profile', path: '/student/profile' },
                      { icon: Settings, label: 'Settings', path: '/student/settings' },
                    ].map(({ icon: Icon, label, path }) => (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setShowProfile(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', color: '#AFC4DF', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', borderBottom: '1px solid rgba(55,140,255,0.06)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,119,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Icon style={{ width: 15, height: 15 }} />
                        {label}
                      </Link>
                    ))}
                    <button
                      onClick={logout}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%', transition: 'all 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut style={{ width: 15, height: 15 }} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Top route sweep neon progress bar */}
          <div key={`nav-progress-${location.pathname}`} className="top-nav-progress" />

          {/* ── PAGE CONTENT ── */}
          <main className="page-content bg-grid" style={{ position: 'relative' }}>
            <div key={location.pathname} className="page-transition-wrapper">
              <Outlet />
            </div>
          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="mobile-bottom-nav">
          {[
            { icon: Home, label: 'Home', path: '/student/dashboard' },
            { icon: Dumbbell, label: 'Sports', path: '/student/sports' },
            { icon: Trophy, label: 'Events', path: '/student/tournaments' },
            { icon: Award, label: 'Profile', path: '/student/profile' },
          ].map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                  color: isActive ? '#38A7FF' : '#6E86A5',
                  background: isActive ? 'rgba(22,119,255,0.12)' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <Icon style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthContext.Provider>
  );
};

export default MainLayout;
