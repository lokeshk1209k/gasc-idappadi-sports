import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Hash, GraduationCap, Edit3, Save, X, Star, Medal, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ProfilePage = () => {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Student Athlete',
    regNo: '',
    dept: 'Department of Physical Education',
    year: 'I Year',
    section: 'A',
    gender: 'Male',
    email: '',
    phone: '',
    dob: 'Not specified',
    blood: 'O+',
    favSport: 'Athletics',
    college: 'Government Arts and Science College, Idappadi',
  });
  const [form, setForm] = useState({ ...profile });

  useEffect(() => {
    // 1. Load from localStorage
    try {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        const u = JSON.parse(stored);
        const updated = {
          name: u.name || 'Student Athlete',
          regNo: u.registerNumber || u.regNo || u.register_number || '',
          dept: u.department || u.dept || 'Computer Science',
          year: u.year || 'I Year',
          section: u.section || 'A',
          gender: u.gender || 'Male',
          email: u.email || '',
          phone: u.phone || u.mobile || '',
          dob: u.dob || u.dateOfBirth || 'Not specified',
          blood: u.blood || u.bloodGroup || 'O+',
          favSport: u.favoriteSport || u.favSport || 'Athletics',
          college: 'Government Arts and Science College, Idappadi',
        };
        setProfile(updated);
        setForm(updated);

        // 2. Fetch fresh profile from Supabase
        const regNo = updated.regNo;
        if (regNo) {
          supabase
            .from('users')
            .select('*')
            .ilike('register_number', regNo)
            .eq('role', 'student')
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                const fresh = {
                  name: data.name || updated.name,
                  regNo: data.register_number || updated.regNo,
                  dept: data.department || updated.dept,
                  year: data.year || updated.year,
                  section: data.section || updated.section,
                  gender: data.gender || updated.gender,
                  email: data.email || updated.email,
                  phone: data.phone || updated.phone,
                  dob: data.dob || updated.dob,
                  blood: data.blood_group || updated.blood,
                  favSport: data.favorite_sport || updated.favSport,
                  college: 'Government Arts and Science College, Idappadi',
                };
                setProfile(fresh);
                setForm(fresh);
                localStorage.setItem('gasc_user', JSON.stringify({ ...u, ...fresh }));
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {}
  }, []);

  const handleSave = async () => {
    setProfile({ ...form });
    setEditing(false);

    // Save to localStorage
    try {
      const stored = localStorage.getItem('gasc_user');
      const u = stored ? JSON.parse(stored) : {};
      const updated = { ...u, ...form };
      localStorage.setItem('gasc_user', JSON.stringify(updated));

      // Save to Supabase
      if (form.regNo) {
        await supabase
          .from('users')
          .update({
            name: form.name,
            email: form.email,
            phone: form.phone
          })
          .ilike('register_number', form.regNo);
      }
    } catch (e) {}
  };

  const initials = (profile.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  const ACHIEVEMENTS = [
    { icon: '🥇', label: 'Gold Medals', value: 0 },
    { icon: '🥈', label: 'Silver Medals', value: 0 },
    { icon: '🏆', label: 'Trophies', value: 0 },
    { icon: '📜', label: 'Certificates', value: 1 },
    { icon: '🏅', label: 'Participations', value: 1 },
    { icon: '⭐', label: 'Status', value: 'Active' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ fontSize: 28 }}>
          MY <span style={{ color: '#38A7FF' }}>PROFILE</span>
        </h1>
        <p className="section-subtitle">Official Student Athlete Identity — GASC Idappadi Sports Portal</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

        {/* ── LEFT: Identity Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Profile card */}
          <div className="gasc-card" style={{ padding: 28, textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,#1677FF,#6C4CFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 32, color: '#FFFFFF', border: '3px solid rgba(55,140,255,0.40)', boxShadow: '0 0 24px rgba(22,119,255,0.30)' }}>
                {initials}
              </div>
              <div style={{ position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: '#10B981', border: '2px solid #020817', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />
              </div>
            </div>

            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: '#FFFFFF', margin: '0 0 4px' }}>{profile.name}</h2>
            <p style={{ fontSize: 13, color: '#38A7FF', fontWeight: 700, fontFamily: 'monospace', margin: '0 0 4px' }}>{profile.regNo}</p>
            <p style={{ fontSize: 12, color: '#6E86A5', margin: '0 0 20px' }}>{profile.dept}</p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{profile.year} (Sec {profile.section || 'A'})</span>
              <span className="badge badge-green">🟢 Active Student</span>
              <span className="badge badge-orange">🏆 {profile.favSport}</span>
            </div>

            <div className="gasc-divider" style={{ marginBottom: 20 }} />

            {/* Quick info */}
            {[
              { icon: Hash, label: 'Reg. No.', value: profile.regNo },
              { icon: GraduationCap, label: 'Department', value: profile.dept },
              { icon: Calendar, label: 'Year', value: profile.year },
              { icon: ShieldCheck, label: 'Gender', value: profile.gender }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(55,140,255,0.08)' }}>
                <Icon style={{ width: 14, height: 14, color: '#38A7FF', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#6E86A5', flex: 1, textAlign: 'left' }}>{label}</span>
                <span style={{ fontSize: 12, color: '#AFC4DF', fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            <button
              onClick={() => setEditing(true)}
              className="btn-primary"
              style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              <Edit3 style={{ width: 15, height: 15 }} /> Edit Contact Details
            </button>
          </div>

          {/* Sports summary */}
          <div className="gasc-card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, color: '#FFFFFF', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star style={{ width: 16, height: 16, color: '#FFD700' }} /> Athlete Achievements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ACHIEVEMENTS.map(({ icon, label, value }) => (
                <div key={label} style={{ padding: '12px', background: 'rgba(8,27,53,0.7)', borderRadius: 10, border: '1px solid rgba(55,140,255,0.10)', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, margin: '0 0 4px' }}>{icon}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: '#FFFFFF', margin: '0 0 2px' }}>{value}</p>
                  <p style={{ fontSize: 10, color: '#6E86A5', margin: 0, fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Information panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Information */}
          <div className="gasc-card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16, color: '#FFFFFF', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <User style={{ width: 18, height: 18, color: '#38A7FF' }} /> Personal Information
            </h3>

            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {[
                  { key: 'name', label: 'Full Name', type: 'text' },
                  { key: 'email', label: 'Email Address', type: 'email' },
                  { key: 'phone', label: 'Phone Number', type: 'tel' },
                  { key: 'blood', label: 'Blood Group', type: 'text' },
                  { key: 'favSport', label: 'Favorite Sport', type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 6 }}>{label}</label>
                    <input
                      type={type}
                      className="input-dark"
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12, marginTop: 8 }}>
                  <button onClick={handleSave} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
                    <Save style={{ width: 15, height: 15 }} /> Save Changes
                  </button>
                  <button onClick={() => { setEditing(false); setForm({ ...profile }); }} className="btn-outline" style={{ padding: '10px 16px', fontSize: 13 }}>
                    <X style={{ width: 15, height: 15 }} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {[
                  { icon: User, label: 'Full Name', value: profile.name },
                  { icon: Hash, label: 'Register Number', value: profile.regNo },
                  { icon: Mail, label: 'Email Address', value: profile.email || 'Not provided' },
                  { icon: Phone, label: 'Mobile Number', value: profile.phone || 'Not provided' },
                  { icon: GraduationCap, label: 'Department', value: profile.dept },
                  { icon: Calendar, label: 'Academic Year', value: `${profile.year} - Section ${profile.section || 'A'}` },
                  { icon: Hash, label: 'Blood Group', value: profile.blood },
                  { icon: Medal, label: 'Favorite Sport', value: profile.favSport },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ padding: '14px 16px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.12)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icon style={{ width: 13, height: 13, color: '#38A7FF' }} />
                      <span style={{ fontSize: 11, color: '#6E86A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#FFFFFF', margin: 0, fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* College Information */}
          <div className="gasc-card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16, color: '#FFFFFF', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Medal style={{ width: 18, height: 18, color: '#FF6A21' }} /> Official College Institution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {[
                { label: 'College Name', value: 'Government Arts and Science College' },
                { label: 'Campus Location', value: 'Idappadi - 637 101, Salem District' },
                { label: 'Affiliation', value: 'Periyar University, Salem' },
                { label: 'Department', value: 'Department of Physical Education' }
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '14px 16px', background: 'rgba(8,27,53,0.5)', border: '1px solid rgba(55,140,255,0.12)', borderRadius: 12 }}>
                  <p style={{ fontSize: 11, color: '#6E86A5', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ fontSize: 14, color: '#FFFFFF', margin: 0, fontWeight: 700 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
