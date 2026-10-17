import { useState, useEffect } from 'react';
import {
  Trophy,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Info,
  RefreshCw,
  Search,
  Building,
  UserCheck
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  instructions: string;
  officialLink?: string;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  category?: string;
  isImportant?: boolean;
  status: string;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
}

const OFFICIAL_SDAT_URL = 'https://tncmtrophy.sdat.in/';

const CmTrophyPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'important' | 'dates' | 'general'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      // Try local/direct API first
      let data: any = null;
      try {
        const res = await fetch('/api/cm-trophy');
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn('Direct api/cm-trophy fetch error:', err);
      }

      // If direct API failed or empty, try serverless endpoint
      if (!data || !data.announcements || data.announcements.length === 0) {
        try {
          const res = await fetch('/api/open-registration?action=cm-trophy');
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.warn('Serverless cm-trophy fallback error:', err);
        }
      }

      if (data && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error('Failed to load CM Trophy announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openOfficialPortal = () => {
    window.open(OFFICIAL_SDAT_URL, '_blank', 'noopener,noreferrer');
  };

  // Find latest verified dates from announcements
  const dateAnnouncement = announcements.find(
    a => a.registrationStartDate || a.registrationEndDate
  );

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'important' && !a.isImportant) return false;
    if (filter === 'dates' && !a.registrationStartDate && !a.registrationEndDate) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchText = a.instructions.toLowerCase().includes(q);
      const matchCat = (a.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchText && !matchCat) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── HEADER BANNER ── */}
      <div
        className="animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(8,27,53,0.95) 0%, rgba(13,42,82,0.9) 100%)',
          border: '1px solid rgba(55,140,255,0.25)',
          borderRadius: 20,
          padding: '32px 28px',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,170,0,0.15) 0%, rgba(255,170,0,0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  background: 'rgba(255,170,0,0.15)',
                  border: '1px solid rgba(255,170,0,0.4)',
                  color: '#FFB800',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Trophy style={{ width: 14, height: 14 }} /> SDAT TAMIL NADU INITIATIVE
              </span>
              <span
                style={{
                  background: 'rgba(56,167,255,0.15)',
                  border: '1px solid rgba(56,167,255,0.35)',
                  color: '#38A7FF',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Government of Tamil Nadu
              </span>
            </div>

            <h1
              className="section-title"
              style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                margin: '0 0 10px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.5px'
              }}
            >
              CHIEF MINISTER’S TROPHY <span style={{ color: '#FFB800' }}>(CM TROPHY)</span>
            </h1>

            <p style={{ color: '#AFC4DF', fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 750 }}>
              The Tamil Nadu Chief Minister’s Trophy is the premier state-wide sporting championship organized annually
              by the Sports Development Authority of Tamil Nadu (SDAT) to identify, encourage, and honour athletic talent
              across College Students, School Students, Differently-Abled, and General Public categories.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={openOfficialPortal}
                id="btn-visit-sdat-official"
                style={{
                  background: 'linear-gradient(135deg, #FF9900 0%, #FF6600 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 18px rgba(255,102,0,0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(255,102,0,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(255,102,0,0.35)';
                }}
              >
                <span>Visit Official SDAT CM Trophy Website</span>
                <ExternalLink style={{ width: 16, height: 16 }} />
              </button>

              <button
                onClick={fetchAnnouncements}
                disabled={loading}
                style={{
                  background: 'rgba(8,27,53,0.8)',
                  border: '1px solid rgba(55,140,255,0.3)',
                  color: '#AFC4DF',
                  padding: '12px 18px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <RefreshCw style={{ width: 15, height: 15, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Refresh Updates</span>
              </button>
            </div>
          </div>

          {/* SDAT Link Information Badge */}
          <div
            style={{
              background: 'rgba(2,12,27,0.7)',
              border: '1px solid rgba(255,184,0,0.25)',
              borderRadius: 16,
              padding: '18px 20px',
              minWidth: 260,
              maxWidth: 320
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFB800', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <ShieldCheck style={{ width: 18, height: 18 }} />
              <span>OFFICIAL SDAT PORTAL</span>
            </div>
            <p style={{ color: '#6E86A5', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
              Official player registration, team entries, and district trials are conducted exclusively via:
            </p>
            <a
              href={OFFICIAL_SDAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38A7FF',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                wordBreak: 'break-all',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              https://tncmtrophy.sdat.in/
              <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <small style={{ color: '#AFC4DF', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 style={{ width: 12, height: 12, color: '#4ade80' }} />
                <span>No fake forms. Register on official SDAT portal only.</span>
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* ── VERIFIED DATES & IMPORTANT ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Registration Schedule Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: 16,
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar style={{ width: 18, height: 18, color: '#38A7FF' }} />
              Registration Window & Deadlines
            </span>
            <span
              style={{
                background: dateAnnouncement ? 'rgba(74,222,128,0.15)' : 'rgba(110,134,165,0.15)',
                color: dateAnnouncement ? '#4ade80' : '#6E86A5',
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {dateAnnouncement ? 'Verified by Admin' : 'Awaiting Release'}
            </span>
          </div>

          {dateAnnouncement ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {dateAnnouncement.registrationStartDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6E86A5' }}>Registration Starts:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                    {new Date(dateAnnouncement.registrationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
              {dateAnnouncement.registrationEndDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6E86A5' }}>Deadline:</span>
                  <span style={{ color: '#FF8A50', fontWeight: 700 }}>
                    {new Date(dateAnnouncement.registrationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#6E86A5', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Official CM Trophy tournament registration dates will be announced here once verified by Dr. R. Anitha (Physical Director).
            </p>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button
              onClick={openOfficialPortal}
              style={{
                width: '100%',
                background: 'rgba(56,167,255,0.1)',
                border: '1px solid rgba(56,167,255,0.3)',
                color: '#38A7FF',
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>Check Live Status on SDAT Portal</span>
              <ExternalLink style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* College Sports Guidance Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: 16,
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building style={{ width: 18, height: 18, color: '#FFB800' }} />
              College Sports Department Support
            </span>
            <span
              style={{
                background: 'rgba(255,184,0,0.15)',
                color: '#FFB800',
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              GASC Idappadi
            </span>
          </div>

          <p style={{ color: '#AFC4DF', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Our Physical Education department conducts special pre-trial conditioning, athlete registration verification,
            and college team selection trials for all eligible sports disciplines under the CM Trophy banner.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6E86A5', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck style={{ width: 14, height: 14, color: '#4ade80' }} />
              <span>Sports Incharge: <strong>Dr. R. ANITHA, M.P.Ed., M.Phil., Ph.D.</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info style={{ width: 14, height: 14, color: '#38A7FF' }} />
              <span>Venue: GASC Idappadi Sports Ground / Indoor Badminton Court</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANNOUNCEMENTS & INSTRUCTIONS LIST ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell style={{ width: 22, height: 22, color: '#38A7FF' }} />
              Official Instructions & Announcements
            </h2>
            <p style={{ fontSize: 13, color: '#6E86A5', margin: '4px 0 0' }}>
              Published directly by the Physical Education Department for GASC Idappadi students.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6E86A5' }} />
              <input
                type="text"
                placeholder="Search instructions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: 10,
                  background: 'rgba(8,27,53,0.8)',
                  border: '1px solid rgba(55,140,255,0.2)',
                  color: '#FFFFFF',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
            </div>

            {[
              { id: 'all', label: 'All Updates' },
              { id: 'important', label: 'Important Only' },
              { id: 'dates', label: 'With Deadlines' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filter === tab.id ? '1px solid #38A7FF' : '1px solid rgba(55,140,255,0.2)',
                  background: filter === tab.id ? 'rgba(56,167,255,0.2)' : 'rgba(8,27,53,0.6)',
                  color: filter === tab.id ? '#FFFFFF' : '#AFC4DF'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6E86A5' }}>
            <RefreshCw style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#38A7FF' }} />
            <p style={{ fontSize: 14 }}>Loading verified CM Trophy announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div
            style={{
              background: 'rgba(8,27,53,0.4)',
              border: '1px solid rgba(55,140,255,0.15)',
              borderRadius: 16,
              padding: '60px 20px',
              textAlign: 'center',
              color: '#6E86A5'
            }}
          >
            <Trophy style={{ width: 44, height: 44, margin: '0 auto 16px', opacity: 0.3, color: '#FFB800' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#AFC4DF', margin: '0 0 6px' }}>
              No announcements published yet
            </p>
            <p style={{ fontSize: 13, maxWidth: 450, margin: '0 auto 16px' }}>
              The Physical Education Department will publish verified schedules, selection trial dates, and registration guidelines here.
            </p>
            <button
              onClick={openOfficialPortal}
              style={{
                background: 'rgba(56,167,255,0.15)',
                border: '1px solid rgba(56,167,255,0.3)',
                color: '#38A7FF',
                padding: '8px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>Explore Official CM Trophy SDAT Website</span>
              <ExternalLink style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredAnnouncements.map((ann, idx) => {
              const isExpanded = expandedId === ann.id;
              const hasLongText = ann.instructions.length > 280;

              return (
                <div
                  key={ann.id}
                  className="animate-fade-up"
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                    background: ann.isImportant
                      ? 'linear-gradient(135deg, rgba(255,138,80,0.08) 0%, rgba(8,27,53,0.85) 100%)'
                      : 'rgba(8,27,53,0.65)',
                    border: ann.isImportant
                      ? '1px solid rgba(255,138,80,0.35)'
                      : '1px solid rgba(55,140,255,0.15)',
                    borderRadius: 16,
                    padding: '24px 26px',
                    boxShadow: ann.isImportant ? '0 8px 24px rgba(255,106,33,0.12)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {ann.isImportant && (
                          <span
                            style={{
                              background: 'rgba(255,106,33,0.2)',
                              border: '1px solid rgba(255,106,33,0.4)',
                              color: '#FF8A50',
                              padding: '2px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <AlertTriangle style={{ width: 12, height: 12 }} /> IMPORTANT NOTICE
                          </span>
                        )}
                        <span
                          style={{
                            background: 'rgba(56,167,255,0.12)',
                            color: '#38A7FF',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600
                          }}
                        >
                          {ann.category || 'Official Instruction'}
                        </span>
                        {ann.publishedAt && (
                          <span style={{ color: '#6E86A5', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock style={{ width: 11, height: 11 }} />
                            {new Date(ann.publishedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px', lineHeight: 1.3 }}>
                        {ann.title}
                      </h3>

                      {/* Registration Dates Highlight if present */}
                      {(ann.registrationStartDate || ann.registrationEndDate) && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 16,
                            background: 'rgba(255,184,0,0.08)',
                            border: '1px solid rgba(255,184,0,0.25)',
                            borderRadius: 8,
                            padding: '6px 14px',
                            marginBottom: 12,
                            fontSize: 12
                          }}
                        >
                          {ann.registrationStartDate && (
                            <span style={{ color: '#AFC4DF' }}>
                              Registration Opens: <strong style={{ color: '#FFFFFF' }}>{new Date(ann.registrationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            </span>
                          )}
                          {ann.registrationEndDate && (
                            <span style={{ color: '#AFC4DF' }}>
                              Deadline: <strong style={{ color: '#FF8A50' }}>{new Date(ann.registrationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Instructions Content */}
                      <p
                        style={{
                          color: '#AFC4DF',
                          fontSize: 14,
                          lineHeight: 1.6,
                          margin: 0,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {hasLongText && !isExpanded
                          ? `${ann.instructions.slice(0, 280)}...`
                          : ann.instructions}
                      </p>

                      {hasLongText && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38A7FF',
                            padding: 0,
                            marginTop: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isExpanded ? 'Show Less' : 'Read Full Instructions ↓'}
                        </button>
                      )}
                    </div>

                    {/* Official Portal Action Button */}
                    <div style={{ flexShrink: 0 }}>
                      <a
                        href={ann.officialLink || OFFICIAL_SDAT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'linear-gradient(135deg, rgba(56,167,255,0.15) 0%, rgba(56,167,255,0.05) 100%)',
                          border: '1px solid rgba(56,167,255,0.3)',
                          color: '#38A7FF',
                          padding: '10px 16px',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>Official Portal</span>
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: '#6E86A5',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <span>Published by: <strong>{ann.createdBy || 'Dr. R. ANITHA (Physical Director)'}</strong></span>
                    <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 style={{ width: 13, height: 13 }} /> Verified College Circular
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CmTrophyPage;
