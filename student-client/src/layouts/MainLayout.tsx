import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Dumbbell, Trophy, TrendingUp,
  Image, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, Search, X, Menu, Package, Award
} from 'lucide-react';

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

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/student/dashboard' },
  { icon: User,            label: 'My Profile',      path: '/student/profile' },
  { icon: Dumbbell,        label: 'Sports',          path: '/student/sports' },
  { icon: Trophy,          label: 'Tournaments',     path: '/student/tournaments' },
  { icon: Award,           label: 'CM Trophy',       path: '/student/cm-trophy' },
  { icon: Package,         label: 'My Equipment',    path: '/student/equipment' },
  { icon: Image,           label: 'Photos',          path: '/student/gallery' },
  { icon: Bell,            label: 'Notifications',   path: '/student/notifications' },
  { icon: Settings,        label: 'Settings',        path: '/student/settings' },
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
  const [liveNotifs, setLiveNotifs] = useState<any[]>(NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const location = useLocation();
  const navigate = useNavigate();

  // Load live notifications
  const fetchLiveNotifs = async () => {
    try {
      const readSet = new Set(JSON.parse(localStorage.getItem('gasc_read_notifs') || '[]'));
      const token = localStorage.getItem('gasc_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let notifItems: any[] = [];
      try {
        const res = await fetch('/api/notifications', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.notifications) {
            notifItems = data.notifications;
          }
        }
      } catch (e) {}

      // Fallback to CM Trophy announcements or direct Supabase notifications
      if (notifItems.length === 0) {
        try {
          const cmRes = await fetch('/api/cm-trophy');
          if (cmRes.ok) {
            const cmData = await cmRes.json();
            if (cmData && cmData.announcements) {
              notifItems = cmData.announcements.map((a: any) => ({
                id: a.id,
                title: a.title,
                message: a.instructions,
                category: 'cm_trophy',
                type: 'cm_trophy_announcement',
                priority: a.isImportant ? 'High' : 'Normal',
                sender: a.createdBy || 'Dr. R. ANITHA',
                created_at: a.publishedAt || a.createdAt
              }));
            }
          }
        } catch (e) {}
      }

      if (notifItems.length > 0) {
        const processed = notifItems.map((n: any, idx: number) => {
          let parsedBody = n.message || '';
          let isCmTrophy = n.category === 'cm_trophy' || n.type === 'cm_trophy_announcement' || (n.title && n.title.includes('CM Trophy'));
          let officialLink = isCmTrophy ? 'https://tncmtrophy.sdat.in/' : null;

          try {
            const parsed = JSON.parse(n.message);
            parsedBody = parsed.shortMessage || parsed.instructions || parsed.title || n.message;
            if (parsed.officialLink) officialLink = parsed.officialLink;
          } catch (e) {}

          const isUnread = !readSet.has(n.id);
          return {
            id: n.id || idx,
            title: n.title,
            body: parsedBody,
            category: n.category,
            isCmTrophy,
            officialLink,
            time: n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently',
            type: isCmTrophy ? 'orange' : n.priority === 'High' ? 'blue' : 'green',
            unread: isUnread
          };
        });
        setLiveNotifs(processed);
        setUnreadCount(processed.filter((p: any) => p.unread).length);
      }
    } catch (err) {
      console.warn('Failed to load notifications in MainLayout:', err);
    }
  };

  useEffect(() => {
    fetchLiveNotifs();
    const interval = setInterval(fetchLiveNotifs, 20000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const markNotifRead = (id: any, isCmTrophy?: boolean) => {
    const readSet = new Set(JSON.parse(localStorage.getItem('gasc_read_notifs') || '[]'));
    readSet.add(id);
    localStorage.setItem('gasc_read_notifs', JSON.stringify(Array.from(readSet)));
    setLiveNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setShowNotifs(false);
    if (isCmTrophy) {
      navigate('/student/cm-trophy');
    }
  };

  // Load user from localStorage dynamically on route change or storage event
  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUser({
            name: u.name || 'Student Player',
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

  // Redirect unauthenticated students to login page
  useEffect(() => {
    const isAuth = ['/student/login', '/student/register'].some(p => location.pathname.startsWith(p));
    if (!isAuth) {
      const token = localStorage.getItem('gasc_token');
      const stored = localStorage.getItem('gasc_user');
      if (!token || !stored) {
        navigate('/student/login', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

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

  const displayName = user?.name || 'Student Player';
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
            {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
              return (
                <Link
                  key={path}
                  to={path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? label : ''}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <Icon className={`nav-icon ${isActive ? 'text-accent' : ''}`} style={{ width: 18, height: 18, flexShrink: 0 }} />
                  {!collapsed && <span>{label}</span>}
                  {isActive && !collapsed && (
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(55,140,255,0.12)' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(22,119,255,0.08)',
                border: '1px solid rgba(55,140,255,0.15)',
                color: '#6E86A5',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: 8
              }}
            >
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>Collapse</span>}
              {collapsed
                ? <ChevronRight style={{ width: 16, height: 16 }} />
                : <ChevronLeft style={{ width: 16, height: 16 }} />
              }
            </button>
          </div>

          {/* Logout */}
          <div style={{ padding: '8px 16px 16px' }}>
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
              <LogOut style={{ width: 17, height: 17, flexShrink: 0 }} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════════════
            MAIN WRAPPER
           ════════════════════════════════════════ */}
        <div className={`main-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>

          {/* ── TOP HEADER ── */}
          <header className="top-header">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: '#6E86A5', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Menu style={{ width: 22, height: 22 }} />
            </button>

            {/* Page breadcrumb */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#AFC4DF', fontFamily: 'Inter,sans-serif' }}>
                {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || 'Portal'}
              </span>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6E86A5' }} />
              <input
                type="text"
                placeholder="Search sports, events, tournaments..."
                className="search-bar"
              />
            </div>

            {/* Notification */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
                style={{ position: 'relative', padding: 9, borderRadius: 10, background: 'rgba(8,27,53,0.8)', border: '1px solid rgba(55,140,255,0.20)', cursor: 'pointer', color: '#6E86A5', display: 'flex', alignItems: 'center' }}
                title="Notifications"
              >
                <Bell style={{ width: 18, height: 18 }} />
                {unreadCount > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: '#FF6A21',
                      color: '#FFFFFF',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px rgba(255,106,33,0.6)'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : (
                  <span className="notif-dot" style={{ top: 6, right: 6 }} />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="animate-fade-in" style={{ position: 'absolute', top: 48, right: 0, width: 340, background: 'var(--bg-card-solid)', border: '1px solid var(--border-glass-strong)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bell style={{ width: 16, height: 16, color: 'var(--accent-secondary)' }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="badge badge-orange" style={{ fontSize: 10, padding: '2px 8px' }}>{unreadCount} New</span>
                      )}
                    </div>
                    <button onClick={() => setShowNotifs(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {liveNotifs.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6E86A5', fontSize: 13 }}>
                        No notifications yet.
                      </div>
                    ) : (
                      liveNotifs.slice(0, 8).map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotifRead(n.id, n.isCmTrophy)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-glass)',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            background: n.unread ? 'rgba(56,167,255,0.08)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              marginTop: 6,
                              flexShrink: 0,
                              background: n.type === 'orange' ? '#FF8A50' : n.type === 'green' ? '#4ade80' : 'var(--accent-secondary)',
                              boxShadow: n.unread ? '0 0 8px currentColor' : 'none'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <p style={{ fontSize: 13, fontWeight: n.unread ? 700 : 500, color: n.unread ? 'var(--text-primary)' : 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.title}
                              </p>
                              {n.isCmTrophy && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: 'rgba(255,184,0,0.18)', color: '#FFB800', flexShrink: 0 }}>
                                  CM Trophy
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: '#AFC4DF', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.body}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.time}</span>
                              {n.isCmTrophy && (
                                <span style={{ fontSize: 10, color: '#38A7FF', fontWeight: 600 }}>Open CM Trophy →</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border-glass)' }}>
                    <Link to="/student/notifications" onClick={() => setShowNotifs(false)} style={{ fontSize: 13, color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>View All Notifications →</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-glass)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-gradient)', boxShadow: '0 2px 10px var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {displayInitials}
                </div>
                <div style={{ textAlign: 'left' }} className="hidden sm:block">
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{displayName.split(' ')[0]}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Student</p>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-muted)', transform: showProfile ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Profile Dropdown */}
              {showProfile && (
                <div className="animate-fade-in" style={{ position: 'absolute', top: 50, right: 0, width: 220, background: '#071B35', border: '1px solid rgba(55,140,255,0.25)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
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
          </header>

          {/* ── PAGE CONTENT ── */}
          <main className="page-content bg-grid">
            <Outlet />
          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="mobile-bottom-nav">
          {[
            { icon: LayoutDashboard, label: 'Home', path: '/student/dashboard' },
            { icon: Dumbbell, label: 'Sports', path: '/student/sports' },
            { icon: Trophy, label: 'Events', path: '/student/tournaments' },
            { icon: Image, label: 'Photos', path: '/student/gallery' },
            { icon: User, label: 'Profile', path: '/student/profile' },
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
