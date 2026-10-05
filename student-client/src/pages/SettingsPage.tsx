import { useState, useEffect } from 'react';
import { User, Lock, Bell, Moon, Shield, LogOut, ChevronRight, Save, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../layouts/MainLayout';
import { supabase } from '../lib/supabase';

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
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // User Profile Data
  const [userData, setUserData] = useState({
    name: 'Student Athlete',
    regNo: '',
    email: '',
    phone: '',
    dept: 'Computer Science'
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Notification Preferences
  const [notifSettings, setNotifSettings] = useState({
    email: true,
    push: true,
    tournament: true,
    certificate: true,
    results: false,
    news: true,
  });

  // Appearance & Privacy
  const [darkMode, setDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState('#1677FF');
  const [privacySettings, setPrivacySettings] = useState({
    showProfile: true,
    showTimeline: true,
    showCertificates: false
  });

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

      const storedNotifs = localStorage.getItem('gasc_notifs_settings');
      if (storedNotifs) setNotifSettings(JSON.parse(storedNotifs));

      const storedAccent = localStorage.getItem('gasc_accent_color');
      if (storedAccent) setAccentColor(storedAccent);

      const storedPrivacy = localStorage.getItem('gasc_privacy_settings');
      if (storedPrivacy) setPrivacySettings(JSON.parse(storedPrivacy));
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const handleSaveAccount = async () => {
    setSaveLoading(true);
    try {
      const stored = localStorage.getItem('gasc_user');
      const u = stored ? JSON.parse(stored) : {};
      const updated = { ...u, ...userData };
      localStorage.setItem('gasc_user', JSON.stringify(updated));

      // Sync to Supabase if connected
      if (userData.regNo) {
        await supabase
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone
          })
          .or(`register_number.eq.${userData.regNo},email.eq.${userData.email}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Save error:', e);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!currentPassword) {
      setPwdMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwdLoading(true);
    try {
      // Update in Supabase
      if (userData.regNo) {
        const { error } = await supabase
          .from('users')
          .update({ password: newPassword })
          .or(`register_number.eq.${userData.regNo},email.eq.${userData.email}`);

        if (error) {
          console.warn('Supabase password update error:', error);
        }
      }

      // Also update local storage if user stored
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('gasc_user', JSON.stringify({ ...u, password: newPassword }));
      }

      setPwdMsg({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdMsg(null), 4000);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err?.message || 'Failed to update password. Please try again.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const updateNotif = (key: keyof typeof notifSettings, val: boolean) => {
    const updated = { ...notifSettings, [key]: val };
    setNotifSettings(updated);
    localStorage.setItem('gasc_notifs_settings', JSON.stringify(updated));
  };

  const updateAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('gasc_accent_color', color);
  };

  const updatePrivacy = (key: keyof typeof privacySettings, val: boolean) => {
    const updated = { ...privacySettings, [key]: val };
    setPrivacySettings(updated);
    localStorage.setItem('gasc_privacy_settings', JSON.stringify(updated));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', margin: '0 0 4px' }}>
                Account Settings
              </h3>
              <p style={{ fontSize: 13, color: '#6E86A5', margin: 0 }}>
                Update your student athlete information.
              </p>
            </div>

            {[
              { label: 'Full Name', value: userData.name, key: 'name', type: 'text', readOnly: false },
              { label: 'Register Number', value: userData.regNo, key: 'regNo', type: 'text', readOnly: true },
              { label: 'Email Address', value: userData.email, key: 'email', type: 'email', readOnly: false },
              { label: 'Phone Number', value: userData.phone, key: 'phone', type: 'tel', readOnly: false },
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

            <button 
              onClick={handleSaveAccount} 
              disabled={saveLoading}
              className="btn-primary" 
              style={{ alignSelf: 'flex-start', padding: '11px 22px', fontSize: 13, marginTop: 6 }}
            >
              {saved ? (
                <><Check style={{ width: 16, height: 16 }} /> Saved Successfully!</>
              ) : (
                <><Save style={{ width: 16, height: 16 }} /> {saveLoading ? 'Saving...' : 'Save Changes'}</>
              )}
            </button>
          </div>
        );

      case 'password':
        return (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', margin: '0 0 4px' }}>
                Change Password
              </h3>
              <p style={{ fontSize: 13, color: '#6E86A5', margin: 0 }}>
                Keep your student account secure with a strong password.
              </p>
            </div>

            {pwdMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: pwdMsg.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                border: `1px solid ${pwdMsg.type === 'error' ? 'rgba(239,68,68,0.30)' : 'rgba(34,197,94,0.30)'}`,
                color: pwdMsg.type === 'error' ? '#FCA5A5' : '#86EFAC',
                fontSize: 13
              }}>
                {pwdMsg.type === 'error' ? <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} /> : <Check style={{ width: 18, height: 18, flexShrink: 0 }} />}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8 }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-dark"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8 }}>New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="input-dark"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8 }}>Confirm New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="input-dark"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </div>

            <div style={{ padding: '14px 16px', background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(55,140,255,0.15)', borderRadius: 10, fontSize: 12, color: '#AFC4DF', lineHeight: 1.6 }}>
              💡 Password must be at least 6 characters. Use letters and numbers for better security.
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', padding: '11px 22px', fontSize: 13, marginTop: 4 }}
            >
              {pwdLoading ? 'Updating...' : <><Save style={{ width: 15, height: 15 }} /> Update Password</>}
            </button>
          </form>
        );

      case 'notifications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', margin: '0 0 4px' }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: 13, color: '#6E86A5', margin: '0 0 16px' }}>
                Select how and when you want to be alerted about sports events.
              </p>
            </div>

            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via registered email' },
              { key: 'push', label: 'Push Notifications', desc: 'Instant browser alerts for updates' },
              { key: 'tournament', label: 'Tournament Alerts', desc: 'New tournaments and registration reminders' },
              { key: 'certificate', label: 'Certificate Alerts', desc: 'When your sports certificates are ready' },
              { key: 'results', label: 'Results & Fixtures', desc: 'Match results and score updates' },
              { key: 'news', label: 'Sports Announcements', desc: 'Important news from the Physical Education Department' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12, marginBottom: 4 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>{desc}</p>
                </div>
                <Toggle
                  value={notifSettings[key as keyof typeof notifSettings]}
                  onChange={v => updateNotif(key as keyof typeof notifSettings, v)}
                />
              </div>
            ))}
          </div>
        );

      case 'appearance':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', margin: '0 0 4px' }}>
                Appearance
              </h3>
              <p style={{ fontSize: 13, color: '#6E86A5', margin: 0 }}>
                Customize how the student sports portal looks on your screen.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>Dark Navy Mode</p>
                <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>High contrast dark theme tailored for sports</p>
              </div>
              <Toggle value={darkMode} onChange={setDarkMode} />
            </div>

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#AFC4DF', marginBottom: 12 }}>Portal Accent Color</p>
              <div style={{ display: 'flex', gap: 14 }}>
                {[
                  { color: '#1677FF', name: 'Electric Blue' },
                  { color: '#6C4CFF', name: 'Royal Purple' },
                  { color: '#FF6A21', name: 'Bright Orange' },
                  { color: '#22D3EE', name: 'Cyan Glow' }
                ].map(({ color, name }) => (
                  <div
                    key={color}
                    onClick={() => updateAccent(color)}
                    title={name}
                    style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: color, cursor: 'pointer',
                      border: accentColor === color ? '3px solid #FFFFFF' : '3px solid transparent',
                      boxShadow: `0 0 14px ${color}60`,
                      transition: 'all 0.2s',
                      transform: accentColor === color ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', margin: '0 0 4px' }}>
                Privacy Settings
              </h3>
              <p style={{ fontSize: 13, color: '#6E86A5', margin: 0 }}>
                Control your profile visibility and data preferences.
              </p>
            </div>

            {[
              { key: 'showProfile', label: 'Show Profile to Other Students', desc: 'Allows your sports records to be visible on department sports leaderboards' },
              { key: 'showTimeline', label: 'Show Achievement Timeline', desc: 'Display your competition journey and medals to college mates' },
              { key: 'showCertificates', label: 'Show Verified Certificates', desc: 'Show verified participation badges on public sports profile' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.10)', borderRadius: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6E86A5', margin: 0 }}>{desc}</p>
                </div>
                <Toggle
                  value={privacySettings[key as keyof typeof privacySettings]}
                  onChange={v => updatePrivacy(key as keyof typeof privacySettings, v)}
                />
              </div>
            ))}

            <div style={{ padding: '18px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 12, marginTop: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', margin: '0 0 6px' }}>Account Security</p>
              <p style={{ fontSize: 12, color: '#6E86A5', margin: '0 0 14px' }}>
                Need help or wish to deactivate your student portal access? Contact the Department of Physical Education.
              </p>
              <button
                type="button"
                onClick={logout}
                style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)',
                  color: '#EF4444', padding: '9px 18px', borderRadius: 9, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Log Out of Account
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
        <p className="section-subtitle">Manage your account preferences and security.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>

        {/* Sidebar nav */}
        <div className="gasc-card" style={{ padding: 12, height: 'fit-content', minWidth: 200, maxWidth: 260 }}>
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

          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 10, background: 'transparent',
              border: '1px solid transparent', color: '#EF4444', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, textAlign: 'left'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
            Logout
          </button>
        </div>

        {/* Section content */}
        <div className="gasc-card" style={{ padding: 28, flex: 1, minWidth: 280 }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
