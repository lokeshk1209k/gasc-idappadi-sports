import { useState } from 'react';
import { Bell, CheckCircle, Trophy, ScrollText, Megaphone, Clock, X } from 'lucide-react';

const ALL_NOTIFS = [
  { id: 1, icon: Trophy, title: 'Cricket Championship Registration Open', body: 'The Inter-College Cricket Championship 2026 registration is now open. Register before Oct 10.', time: '2 hours ago', type: 'blue', unread: true },
  { id: 2, icon: CheckCircle, title: 'Badminton Registration Approved', body: 'Your registration for the GASC Badminton Tournament has been approved by the Sports Department.', time: '1 day ago', type: 'green', unread: true },
  { id: 3, icon: ScrollText, title: 'New Certificate Available', body: 'Your participation certificate for Athletics Meet 2026 is now available for download.', time: '2 days ago', type: 'orange', unread: true },
  { id: 4, icon: Megaphone, title: 'Match Schedule Updated', body: 'The Football League match schedule has been updated. Check the tournaments page for details.', time: '3 days ago', type: 'purple', unread: false },
  { id: 5, icon: Trophy, title: 'Sports Fest 2026 Announced', body: 'GASC Annual Sports Fest 2026 is scheduled for November. Stay tuned for details.', time: '5 days ago', type: 'blue', unread: false },
  { id: 6, icon: CheckCircle, title: 'Profile Updated Successfully', body: 'Your sports profile information has been updated and verified by the Sports Department.', time: '1 week ago', type: 'green', unread: false },
];

const typeColors: Record<string, string> = {
  blue: '#38A7FF',
  green: '#4ade80',
  orange: '#FF8A50',
  purple: '#a78bfa',
};

const NotificationsPage = () => {
  const [notifs, setNotifs] = useState(ALL_NOTIFS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const displayed = filter === 'unread' ? notifs.filter(n => n.unread) : notifs;
  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 28 }}>
            <span style={{ color: '#38A7FF' }}>NOTIFICATIONS</span>
          </h1>
          <p className="section-subtitle">Stay updated with your sports activities.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['all', 'unread'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as 'all' | 'unread')}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f} {f === 'unread' && unreadCount > 0 && <span style={{ background: '#FF6A21', color: '#FFFFFF', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{unreadCount}</span>}
            </button>
          ))}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-outline" style={{ padding: '8px 14px', fontSize: 12 }}>
              Mark All Read
            </button>
          )}
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
            const Icon = n.icon;
            const color = typeColors[n.type] || '#38A7FF';
            return (
              <div
                key={n.id}
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 0.05}s`, opacity: 0,
                  display: 'flex', alignItems: 'flex-start', gap: 0,
                  background: n.unread ? 'rgba(22,119,255,0.06)' : 'rgba(8,27,53,0.4)',
                  border: `1px solid ${n.unread ? 'rgba(55,140,255,0.25)' : 'rgba(55,140,255,0.10)'}`,
                  borderRadius: 14, overflow: 'hidden',
                  transition: 'all 0.2s', cursor: 'pointer'
                }}
                onClick={() => markRead(n.id)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(55,140,255,0.40)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = n.unread ? 'rgba(55,140,255,0.25)' : 'rgba(55,140,255,0.10)'; }}
              >
                {/* Color stripe */}
                <div style={{ width: 4, alignSelf: 'stretch', background: n.unread ? color : 'rgba(55,140,255,0.15)', flexShrink: 0 }} />

                {/* Icon */}
                <div style={{ padding: '18px 16px', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 20, height: 20, color }} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '16px 0', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: n.unread ? 700 : 500, fontSize: 14, color: n.unread ? '#FFFFFF' : '#AFC4DF', margin: '0 0 5px' }}>{n.title}</p>
                      <p style={{ fontSize: 13, color: '#6E86A5', margin: '0 0 8px', lineHeight: 1.5 }}>{n.body}</p>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3A5272' }}>
                        <Clock style={{ width: 11, height: 11 }} />{n.time}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 16 }}>
                      {n.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6A21', boxShadow: '0 0 8px rgba(255,106,33,0.6)' }} />}
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                        style={{ background: 'none', border: 'none', color: '#3A5272', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6E86A5'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3A5272'; }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
