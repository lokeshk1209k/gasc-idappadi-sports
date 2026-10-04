import { useState } from 'react';
import { User, Lock, Bell, Moon, Shield, LogOut, ChevronRight, Save, Check } from 'lucide-react';

const SECTIONS = [
  { id: 'account', icon: User, label: 'Account' },
  { id: 'password', icon: Lock, label: 'Password' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'appearance', icon: Moon, label: 'Appearance' },
  { id: 'privacy', icon: Shield, label: 'Privacy' },
];

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? 'linear-gradient(135deg,#1677FF,#5B5CFF)' : 'rgba(55,140,255,0.15)',
      border: `1px solid ${value ? 'rgba(22,119,255,0.50)' : 'rgba(55,140,255,0.25)'}`,
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
      boxShadow: value ? '0 2px 8px rgba(22,119,255,0.30)' : 'none'
    }}
  >
    <div style={{
      position: 'absolute', top: 2, left: value ? 22 : 2,
      width: 18, height: 18, borderRadius: '50%',
      background: '#FFFFFF', transition: 'left 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
    }} />
  </div>
);

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('account');
  const [saved, setSaved] = useState(false);
  const [userData, setUserData] = useState({
    name: 'Student Athlete',
    regNo: '',
    email: '',
    phone: '',
    dept: 'Computer Science'
  });
  const [notifSettings, setNotifSettings] = useState({
    email: true,
    push: true,
    tournament: true,
    certificate: true,
    results: false,
    news: true,
  });
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserData({
          name: u.name || 'Student Athlete',
          regNo: u.registerNumber || u.regNo || u.register_number || '',
          email: u.email || '',
          phone: u.phone || u.mobile || '',
          dept: u.department || u.dept || 'Computer Science'
        });
      }
    } catch (e) {}
  }, []);

  const handleSave = () => {
    try {
      const stored = localStorage.getItem('gasc_user');
      const u = stored ? JSON.parse(stored) : {};
      localStorage.setItem('gasc_user', JSON.stringify({ ...u, ...userData }));
    } catch (e) {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 17, color: '#FFFFFF', margin: 0 }}>Account Settings</h3>
            {[
              { label: 'Full Name', value: userData.name, key: 'name', type: 'text' },
              { label: 'Register Number', value: userData.regNo, key: 'regNo', type: 'text', readOnly: true },
              { label: 'Email Address', value: userData.email, key: 'email', type: 'email' },
              { label: 'Phone Number', value: userData.phone, key: 'phone', type: 'tel' },
              { label: 'Department', value: userData.dept, key: 'dept', type: 'text', readOnly: true },
            ].map(({ label, value, key, type, readOnly }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8 }}>{label}</label>
                <input
                  type={type}
                  className="input-dark"
                  value={value}
                  readOnly={readOnly}
                  onChange={e => setUserData({ ...userData, [key]: e.target.value })}
                  style={{ opacity: readOnly ? 0.75 : 1, cursor: readOnly ? 'not-allowed' : 'text' }}
                />
              </div>
            ))}
            <button onClick={handleSave} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '11px 22px', fontSize: 13 }}>
              {saved ? <><Check style={{ width: 15, height: 15 }} /> Saved!</> : <><Save style={{ width: 15, height: 15 }} /> Save Changes</>}
            </button>
          </div>
        );

      case 'password':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 17, color: '#FFFFFF', margin: 0 }}>Change Password</h3>
            {[
              { label: 'Current Password', placeholder: '••••••••' },
              { label: 'New Password', placeholder: '••••••••' },
              { label: 'Confirm New Password', placeholder: '••••••••' },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8 }}>{label}</label>
                <input type="password" className="input-dark" placeholder={placeholder} />
              </div>
            ))}
            <div style={{ padding: '14px 16px', background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(55,140,255,0.15)', borderRadius: 10, fontSize: 12, color: '#AFC4DF', lineHeight: 1.6 }}>
              💡 Password must be at least 8 characters with letters, numbers, and special characters.
            </div>
            <button onClick={handleSave} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '11px 22px', fontSize: 13 }}>
              {saved ? <><Check style={{ width: 15, height: 15 }} /> Updated!</> : <><Save style={{ width: 15, height: 15 }} /> Update Password</>}
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 17, color: '#FFFFFF', margin: '0 0 16px' }}>Notification Preferences</h3>
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'push', label: 'Push Notifications', desc: 'Browser push alerts' },
              { key: 'tournament', label: 'Tournament Alerts', desc: 'New tournaments and registration reminders' },
              { key: 'certificate', label: 'Certificate Alerts', desc: 'When certificates are ready to download' },
              { key: 'results', label: 'Results Updates', desc: 'Match results and standings' },
              { key: 'news', label: 'Sports Announcements', desc: 'News and sports department updates' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12, marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>{desc}</p>
                </div>
                <Toggle value={notifSettings[key as keyof typeof notifSettings]} onChange={v => setNotifSettings(prev => ({ ...prev, [key]: v }))} />
              </div>
            ))}
          </div>
        );

      case 'appearance':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 17, color: '#FFFFFF', margin: '0 0 6px' }}>Appearance</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>Dark Mode</p>
                <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>Dark navy interface (recommended)</p>
              </div>
              <Toggle value={darkMode} onChange={setDarkMode} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#AFC4DF', marginBottom: 12 }}>Accent Color</p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['#1677FF', '#6C4CFF', '#FF6A21', '#22D3EE'].map(color => (
                  <div key={color} style={{ width: 36, height: 36, borderRadius: '50%', background: color, cursor: 'pointer', border: color === '#1677FF' ? '3px solid #FFFFFF' : '3px solid transparent', boxShadow: `0 0 12px ${color}50`, transition: 'transform 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 17, color: '#FFFFFF', margin: '0 0 6px' }}>Privacy Settings</h3>
            {[
              { label: 'Show Profile to Other Students', desc: 'Others can see your sports profile', default: true },
              { label: 'Show Achievement Timeline', desc: 'Your journey visible to classmates', default: true },
              { label: 'Show Certificates', desc: 'Certificates visible on public profile', default: false },
            ].map(({ label, desc, default: def }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>{desc}</p>
                </div>
                <Toggle value={def} onChange={() => {}} />
              </div>
            ))}
            <div style={{ padding: '16px 18px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', margin: '0 0 6px' }}>Danger Zone</p>
              <p style={{ fontSize: 12, color: '#6E86A5', margin: '0 0 14px' }}>These actions are irreversible. Please be careful.</p>
              <button style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#EF4444', padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Delete Account
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ fontSize: 28 }}>
          <span style={{ color: '#38A7FF' }}>SETTINGS</span>
        </h1>
        <p className="section-subtitle">Manage your account preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* Sidebar nav */}
        <div className="gasc-card" style={{ padding: 12, height: 'fit-content' }}>
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 10, marginBottom: 4,
                background: activeSection === id ? 'rgba(22,119,255,0.18)' : 'transparent',
                border: `1px solid ${activeSection === id ? 'rgba(55,140,255,0.35)' : 'transparent'}`,
                color: activeSection === id ? '#FFFFFF' : '#6E86A5',
                cursor: 'pointer', transition: 'all 0.2s', fontSize: 13, fontWeight: 600,
                textAlign: 'left'
              }}
              onMouseEnter={e => { if (activeSection !== id) (e.currentTarget as HTMLElement).style.background = 'rgba(22,119,255,0.07)'; }}
              onMouseLeave={e => { if (activeSection !== id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {label}
              {activeSection === id && <ChevronRight style={{ width: 14, height: 14, marginLeft: 'auto' }} />}
            </button>
          ))}

          <div className="gasc-divider" style={{ margin: '8px 0' }} />

          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'transparent', border: '1px solid transparent', color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <LogOut style={{ width: 16, height: 16 }} />
            Logout
          </button>
        </div>

        {/* Section content */}
        <div className="gasc-card" style={{ padding: 28 }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
