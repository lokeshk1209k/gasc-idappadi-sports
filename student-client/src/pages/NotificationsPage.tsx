import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  Trophy,
  ScrollText,
  Megaphone,
  Clock,
  X,
  ExternalLink,
  Award,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Eye
} from 'lucide-react';

interface NotificationItem {
  id: string | number;
  icon?: any;
  title: string;
  body: string;
  time: string;
  type: string;
  unread: boolean;
  category?: string;
  isCmTrophy?: boolean;
  officialLink?: string | null;
  fullDetails?: any;
}

const FALLBACK_NOTIFS: NotificationItem[] = [
  {
    id: 'f1',
    icon: Trophy,
    title: 'Cricket Championship Registration Open',
    body: 'The Annual College Cricket Championship 2026 registration is now open. Register before Oct 10.',
    time: '2 hours ago',
    type: 'blue',
    unread: true,
    category: 'Competition'
  },
  {
    id: 'f2',
    icon: CheckCircle,
    title: 'Badminton Registration Approved',
    body: 'Your registration for the GASC Badminton Tournament has been approved by the Sports Department.',
    time: '1 day ago',
    type: 'green',
    unread: true,
    category: 'Application'
  },
  {
    id: 'f3',
    icon: ScrollText,
    title: 'New Certificate Available',
    body: 'Your participation certificate for Athletics Meet 2026 is now available for download.',
    time: '2 days ago',
    type: 'orange',
    unread: true,
    category: 'Certificate'
  },
  {
    id: 'f4',
    icon: Megaphone,
    title: 'Match Schedule Updated',
    body: 'The Football League match schedule has been updated. Check the tournaments page for details.',
    time: '3 days ago',
    type: 'purple',
    unread: false,
    category: 'Schedule'
  }
];

const typeColors: Record<string, string> = {
  blue: '#38A7FF',
  green: '#4ade80',
  orange: '#FF8A50',
  purple: '#a78bfa',
};

const NotificationsPage = () => {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'cm_trophy'>('all');
  const [loading, setLoading] = useState(true);
  const [activeModalNotif, setActiveModalNotif] = useState<NotificationItem | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const readSet = new Set(JSON.parse(localStorage.getItem('gasc_read_notifs') || '[]'));
      const token = localStorage.getItem('gasc_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let items: any[] = [];

      // 1. Fetch from notifications API
      try {
        const res = await fetch('/api/notifications', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.notifications) items = data.notifications;
        }
      } catch (err) {}

      // 2. Fetch from CM Trophy announcements
      let cmItems: any[] = [];
      try {
        const cmRes = await fetch('/api/cm-trophy');
        if (cmRes.ok) {
          const cmData = await cmRes.json();
          if (cmData && cmData.announcements) {
            cmItems = cmData.announcements.map((a: any) => ({
              id: a.id,
              title: a.title,
              message: a.instructions,
              category: 'cm_trophy',
              type: 'cm_trophy_announcement',
              priority: a.isImportant ? 'High' : 'Normal',
              sender: a.createdBy || 'Dr. R. ANITHA',
              created_at: a.publishedAt || a.createdAt,
              fullDoc: a
            }));
          }
        }
      } catch (err) {}

      const combined = [...cmItems, ...items];

      if (combined.length > 0) {
        // De-duplicate by id
        const seen = new Set();
        const unique = combined.filter(n => {
          const k = String(n.id);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        const formatted: NotificationItem[] = unique.map((n: any) => {
          let parsedBody = n.message || '';
          let isCm = n.category === 'cm_trophy' || n.type === 'cm_trophy_announcement' || (n.title && n.title.includes('CM Trophy'));
          let fullDetails = n.fullDoc || null;
          let officialLink = isCm ? 'https://tncmtrophy.sdat.in/' : null;

          try {
            const parsed = typeof n.message === 'string' && n.message.startsWith('{') ? JSON.parse(n.message) : null;
            if (parsed) {
              parsedBody = parsed.shortMessage || parsed.instructions || parsed.title || n.message;
              if (parsed.officialLink) officialLink = parsed.officialLink;
              fullDetails = parsed;
            }
          } catch (e) {}

          const isUnread = !readSet.has(n.id);
          return {
            id: n.id,
            icon: isCm ? Award : Trophy,
            title: n.title,
            body: parsedBody,
            time: n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
            type: isCm ? 'orange' : n.priority === 'High' ? 'blue' : 'green',
            unread: isUnread,
            category: isCm ? 'CM Trophy' : (n.category || 'General'),
            isCmTrophy: isCm,
            officialLink,
            fullDetails
          };
        });

        setNotifs(formatted);
      } else {
        setNotifs(FALLBACK_NOTIFS);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifs(FALLBACK_NOTIFS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    const readSet = new Set(JSON.parse(localStorage.getItem('gasc_read_notifs') || '[]'));
    notifs.forEach(n => readSet.add(n.id));
    localStorage.setItem('gasc_read_notifs', JSON.stringify(Array.from(readSet)));
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markRead = (id: string | number) => {
    const readSet = new Set(JSON.parse(localStorage.getItem('gasc_read_notifs') || '[]'));
    readSet.add(id);
    localStorage.setItem('gasc_read_notifs', JSON.stringify(Array.from(readSet)));
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const openNotificationModal = (n: NotificationItem) => {
    markRead(n.id);
    setActiveModalNotif(n);
  };

  const displayed = notifs.filter(n => {
    if (filter === 'unread') return n.unread;
    if (filter === 'cm_trophy') return n.isCmTrophy;
    return true;
  });

  const unreadCount = notifs.filter(n => n.unread).length;
  const cmCount = notifs.filter(n => n.isCmTrophy).length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 28, margin: 0 }}>
            <span style={{ color: '#38A7FF' }}>NOTIFICATIONS</span>
          </h1>
          <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
            Official circulars, sports schedules, and CM Trophy state announcements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'cm_trophy', label: '🏆 CM Trophy', count: cmCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`filter-tab ${filter === f.id ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>{f.label}</span>
              {f.count !== undefined && f.count > 0 && (
                <span
                  style={{
                    background: f.id === 'cm_trophy' ? '#FFB800' : '#FF6A21',
                    color: '#071B35',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 800
                  }}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="btn-outline"
              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
            >
              Mark All Read
            </button>
          )}

          <button
            onClick={fetchNotifications}
            disabled={loading}
            style={{
              background: 'none',
              border: '1px solid rgba(55,140,255,0.25)',
              color: '#AFC4DF',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: 'pointer'
            }}
            title="Refresh"
          >
            <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6E86A5' }}>
          <Bell style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#AFC4DF' }}>No notifications</p>
          <p style={{ fontSize: 13 }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map((n, i) => {
            const Icon = n.icon || Bell;
            const color = typeColors[n.type] || '#38A7FF';

            return (
              <div
                key={n.id}
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 0.04}s`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0,
                  background: n.unread ? 'rgba(22,119,255,0.08)' : 'rgba(8,27,53,0.45)',
                  border: `1px solid ${n.unread ? 'rgba(55,140,255,0.30)' : 'rgba(55,140,255,0.12)'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => openNotificationModal(n)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = n.unread ? 'rgba(55,140,255,0.30)' : 'rgba(55,140,255,0.12)'; }}
              >
                {/* Color stripe */}
                <div style={{ width: 4, alignSelf: 'stretch', background: n.unread ? color : 'rgba(55,140,255,0.2)', flexShrink: 0 }} />

                {/* Icon */}
                <div style={{ padding: '16px 14px', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 20, height: 20, color }} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '14px 14px 14px 0', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        {n.isCmTrophy && (
                          <span
                            style={{
                              background: 'rgba(255,184,0,0.18)',
                              border: '1px solid rgba(255,184,0,0.35)',
                              color: '#FFB800',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 10
                            }}
                          >
                            🏆 CM TROPHY
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#6E86A5', fontWeight: 600 }}>{n.category}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3A5272' }}>
                          <Clock style={{ width: 11, height: 11 }} />{n.time}
                        </span>
                      </div>

                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: n.unread ? 700 : 500, fontSize: 14, color: n.unread ? '#FFFFFF' : '#AFC4DF', margin: '0 0 6px' }}>
                        {n.title}
                      </p>

                      <p style={{ fontSize: 13, color: '#6E86A5', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {n.body}
                      </p>

                      {/* Action Links */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <span style={{ color: '#38A7FF', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Eye style={{ width: 13, height: 13 }} /> View Announcement Details →
                        </span>

                        {n.isCmTrophy && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              window.open(n.officialLink || 'https://tncmtrophy.sdat.in/', '_blank', 'noopener,noreferrer');
                            }}
                            style={{
                              background: 'rgba(255,184,0,0.12)',
                              border: '1px solid rgba(255,184,0,0.3)',
                              color: '#FFB800',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <span>SDAT Website</span>
                            <ExternalLink style={{ width: 11, height: 11 }} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {n.unread && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6A21', boxShadow: '0 0 8px rgba(255,106,33,0.6)' }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: NOTIFICATION / ANNOUNCEMENT DETAILS ── */}
      {activeModalNotif && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setActiveModalNotif(null)}
        >
          <div
            className="animate-fade-in"
            style={{
              background: '#071B35',
              border: '1px solid rgba(55,140,255,0.3)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 30px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                {activeModalNotif.isCmTrophy && (
                  <span
                    style={{
                      background: 'rgba(255,184,0,0.18)',
                      border: '1px solid rgba(255,184,0,0.35)',
                      color: '#FFB800',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8
                    }}
                  >
                    <Award style={{ width: 14, height: 14 }} /> CHIEF MINISTER'S TROPHY (SDAT)
                  </span>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
                  {activeModalNotif.title}
                </h3>
                <span style={{ fontSize: 12, color: '#6E86A5', marginTop: 4, display: 'inline-block' }}>
                  Published: {activeModalNotif.time}
                </span>
              </div>

              <button
                onClick={() => setActiveModalNotif(null)}
                style={{ background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer', padding: 4 }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Registration Dates if available */}
            {activeModalNotif.fullDetails && (activeModalNotif.fullDetails.registrationStartDate || activeModalNotif.fullDetails.registrationEndDate) && (
              <div
                style={{
                  background: 'rgba(255,184,0,0.08)',
                  border: '1px solid rgba(255,184,0,0.25)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 13
                }}
              >
                <Calendar style={{ width: 16, height: 16, color: '#FFB800' }} />
                <div>
                  {activeModalNotif.fullDetails.registrationStartDate && (
                    <span style={{ color: '#AFC4DF', marginRight: 12 }}>
                      Opens: <strong style={{ color: '#fff' }}>{new Date(activeModalNotif.fullDetails.registrationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
                    </span>
                  )}
                  {activeModalNotif.fullDetails.registrationEndDate && (
                    <span style={{ color: '#AFC4DF' }}>
                      Deadline: <strong style={{ color: '#FF8A50' }}>{new Date(activeModalNotif.fullDetails.registrationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Instructions */}
            <div style={{ background: 'rgba(8,27,53,0.6)', border: '1px solid rgba(55,140,255,0.12)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#6E86A5', letterSpacing: 0.5, margin: '0 0 8px' }}>
                Instructions / Circular Details
              </h4>
              <p style={{ color: '#AFC4DF', fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                {activeModalNotif.fullDetails?.instructions || activeModalNotif.body}
              </p>
            </div>

            {/* Official Website Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {activeModalNotif.isCmTrophy ? (
                <>
                  <button
                    onClick={() => {
                      setActiveModalNotif(null);
                      navigate('/student/cm-trophy');
                    }}
                    style={{
                      background: 'rgba(56,167,255,0.12)',
                      border: '1px solid rgba(56,167,255,0.3)',
                      color: '#38A7FF',
                      padding: '10px 18px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Go to CM Trophy Hub
                  </button>

                  <button
                    onClick={() => {
                      window.open(activeModalNotif.officialLink || 'https://tncmtrophy.sdat.in/', '_blank', 'noopener,noreferrer');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #FF9900 0%, #FF6600 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>Visit Official CM Trophy Website</span>
                    <ExternalLink style={{ width: 14, height: 14 }} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveModalNotif(null)}
                  style={{
                    marginLeft: 'auto',
                    background: '#38A7FF',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
