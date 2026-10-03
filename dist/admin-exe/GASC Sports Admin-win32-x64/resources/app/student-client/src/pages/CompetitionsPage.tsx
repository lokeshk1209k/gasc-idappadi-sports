import { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Clock, ArrowRight, AlertCircle, CheckCircle,
  X, ShieldCheck, Filter, Trophy, Search, ChevronLeft,
  UserCheck
} from 'lucide-react';
import { getSportImage, getTournamentCoverImage } from '../utils/sportImages';

interface RegistrationItem {
  id: string;
  registrationCode: string;
  tournamentName: string;
  sportName: string;
  status: 'Registered' | 'Approved' | 'Pending' | 'Rejected';
  registeredAt: string;
  venue?: string;
  remarks?: string;
  isTeamEvent?: boolean;
  teamStatus?: 'TEAM CREATED' | 'Not Assigned' | 'INDIVIDUAL';
  assignedTeam?: {
    id: string;
    name: string;
    tournamentName?: string;
    sportName?: string;
    department?: string;
    gender?: string;
    captainName?: string;
    members?: Array<{ id: string; name: string; registerNumber: string; role?: string }>;
  } | null;
}

interface SportCompetition {
  id: string;
  name: string;
  sportName: string;
  type: 'Individual Event' | 'Team Event' | 'Individual' | 'Team';
  date: string;
  startTime?: string;
  endTime?: string;
  registrationEnd: string;
  venue: string;
  maxParticipants?: number;
  currentRegistrations?: number;
  status: string;
  description?: string;
  bannerImage?: string;
}

interface Tournament {
  id: string;
  tournamentName: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  bannerImage: string;
  status: string;
  sports: SportCompetition[];
}

const DEFAULT_SPORTS: SportCompetition[] = [
  { id: 'spark_cricket', name: 'Men\'s Cricket Championship', sportName: 'Cricket', type: 'Team Event', date: '2026-10-12', registrationEnd: '2026-10-08', venue: 'College Main Ground', maxParticipants: 60, currentRegistrations: 14, status: 'Registration Open', description: 'Inter-department T20 Cricket championship.' },
  { id: 'spark_football', name: 'Inter-Dept Football League', sportName: 'Football', type: 'Team Event', date: '2026-10-13', registrationEnd: '2026-10-09', venue: 'Football Field', maxParticipants: 48, currentRegistrations: 22, status: 'Registration Open', description: '11-a-side football tournament.' },
  { id: 'spark_volleyball', name: 'Volleyball Rolling Trophy', sportName: 'Volleyball', type: 'Team Event', date: '2026-10-14', registrationEnd: '2026-10-10', venue: 'Volleyball Court', maxParticipants: 36, currentRegistrations: 18, status: 'Registration Open', description: 'Annual volleyball championship.' },
  { id: 'spark_basketball', name: 'Basketball Championship', sportName: 'Basketball', type: 'Team Event', date: '2026-10-14', registrationEnd: '2026-10-10', venue: 'Basketball Court', maxParticipants: 40, currentRegistrations: 12, status: 'Registration Open', description: 'Full court 5v5 tournament.' },
  { id: 'spark_badminton', name: 'Badminton Singles & Doubles', sportName: 'Badminton', type: 'Individual Event', date: '2026-10-11', registrationEnd: '2026-10-07', venue: 'Indoor Stadium Court 1', maxParticipants: 32, currentRegistrations: 16, status: 'Registration Open', description: 'Badminton singles and doubles competition.' },
  { id: 'spark_kabaddi', name: 'Kabaddi State Selection', sportName: 'Kabaddi', type: 'Team Event', date: '2026-10-15', registrationEnd: '2026-10-11', venue: 'Kabaddi Mud Mat', maxParticipants: 40, currentRegistrations: 28, status: 'Registration Open', description: 'Inter-department Kabaddi tournament.' },
  { id: 'spark_athletics', name: '100m Track Sprint', sportName: 'Athletics', type: 'Individual Event', date: '2026-10-10', registrationEnd: '2026-10-06', venue: '400m Track Field', maxParticipants: 24, currentRegistrations: 8, status: 'Registration Open', description: '100m track sprint event.' },
  { id: 'spark_handball', name: 'Handball Championship', sportName: 'Handball', type: 'Team Event', date: '2026-10-15', registrationEnd: '2026-10-11', venue: 'Outdoor Handball Court', maxParticipants: 30, currentRegistrations: 10, status: 'Registration Open', description: 'Handball team event.' },
  { id: 'spark_throwball', name: 'Women\'s Throwball Cup', sportName: 'Throwball', type: 'Team Event', date: '2026-10-12', registrationEnd: '2026-10-08', venue: 'Throwball Court', maxParticipants: 36, currentRegistrations: 15, status: 'Registration Open', description: 'Inter-department women throwball tournament.' },
  { id: 'spark_tennis', name: 'Lawn Tennis Singles', sportName: 'Tennis', type: 'Individual Event', date: '2026-10-13', registrationEnd: '2026-10-09', venue: 'Lawn Tennis Court', maxParticipants: 16, currentRegistrations: 6, status: 'Registration Open', description: 'Lawn tennis singles competition.' },
];

const DEFAULT_TOURNAMENT: Tournament = {
  id: 'tour_spark_2026',
  tournamentName: 'SPARK 2026',
  description: 'Annual College Sports Fest featuring 10 major sports competitions.',
  startDate: '2026-10-10',
  endDate: '2026-10-15',
  venue: 'GASC Idappadi Sports Complex',
  bannerImage: '/images/sports/tournament.png',
  status: 'Registration Open',
  sports: DEFAULT_SPORTS
};

const sportEmoji: Record<string, string> = {
  Cricket: '🏏', Football: '⚽', Volleyball: '🏐', Basketball: '🏀',
  Badminton: '🏸', Kabaddi: '🤼', Athletics: '🏃', Handball: '🤾',
  Throwball: '🏐', Tennis: '🎾', Chess: '♟️', Carrom: '🎯', Running: '🏃'
};

const CompetitionsPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([DEFAULT_TOURNAMENT]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & View States
  type TabType = 'All' | 'Upcoming' | 'Open' | 'Closed' | 'Mine';
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [searchSport, setSearchSport] = useState('');
  
  // Registration Flow Modals
  const [selectedSport, setSelectedSport] = useState<SportCompetition | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState<RegistrationItem | null>(null);
  const [registering, setRegistering] = useState(false);

  // Authenticated Student Profile
  const [studentUser, setStudentUser] = useState<any>({
    id: 'usr_lokesh_csc013',
    name: 'Lokesh Krishnan',
    registerNumber: 'C24UG183CSC013',
    department: 'Computer Science',
    year: 'III Year',
    gender: 'Male',
    mobile: '+91 98421 54321',
    email: 'c24ug183csc013@gascidappadi.edu.in'
  });

  // Assigned Teams
  const [myAssignedTeams, setMyAssignedTeams] = useState<any[]>([]);

  // Track Registrations (Mapped by sport competition ID)
  const [myRegistrations, setMyRegistrations] = useState<Record<string, RegistrationItem>>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Switch student profile for Viva / Demo
  const switchStudentProfile = (studentKey: 'lokesh' | 'ajay') => {
    if (studentKey === 'lokesh') {
      const u = {
        id: 'usr_lokesh_csc013',
        name: 'Lokesh Krishnan',
        registerNumber: 'C24UG183CSC013',
        department: 'Computer Science',
        year: 'III Year',
        gender: 'Male',
        mobile: '+91 98421 54321',
        email: 'c24ug183csc013@gascidappadi.edu.in'
      };
      setStudentUser(u);
      localStorage.setItem('gasc_user', JSON.stringify(u));
    } else {
      const u = {
        id: 'usr_cs_b_12',
        name: 'Ajay K',
        registerNumber: '23UGCS103',
        department: 'Computer Science',
        year: 'II Year',
        gender: 'Male',
        mobile: '+91 98421 54322',
        email: '23ugcs103@gascidappadi.edu.in'
      };
      setStudentUser(u);
      localStorage.setItem('gasc_user', JSON.stringify(u));
    }
    setMyRegistrations({});
    setMyAssignedTeams([]);
  };

  // ── 1. Load Student Profile & Auto-Token ────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gasc_user');
      let token = localStorage.getItem('gasc_token') || localStorage.getItem('token');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.registerNumber || u.register_number)) {
          setStudentUser({
            id: u.id || u._id || 'usr_lokesh_csc013',
            name: u.name || 'Lokesh Krishnan',
            registerNumber: u.registerNumber || u.register_number || 'C24UG183CSC013',
            department: u.department || 'Computer Science',
            year: u.year || 'III Year',
            gender: u.gender || 'Male',
            mobile: u.mobile || '+91 98421 54321',
            email: u.email || 'c24ug183csc013@gascidappadi.edu.in'
          });
        }
      } else {
        const defaultU = {
          id: 'usr_lokesh_csc013',
          name: 'Lokesh Krishnan',
          registerNumber: 'C24UG183CSC013',
          department: 'Computer Science',
          year: 'III Year',
          gender: 'Male',
          mobile: '+91 98421 54321',
          email: 'c24ug183csc013@gascidappadi.edu.in'
        };
        localStorage.setItem('gasc_user', JSON.stringify(defaultU));
      }

      if (!token) {
        fetch('/api/auth/session-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registerNumber: 'C24UG183CSC013' })
        })
          .then(r => r.json())
          .then(d => {
            if (d.success && d.token) {
              localStorage.setItem('gasc_token', d.token);
              if (d.user) {
                localStorage.setItem('gasc_user', JSON.stringify(d.user));
              }
            }
          })
          .catch(() => {});
      }
    } catch { /* use default fallback */ }
  }, []);

  // ── 2. Fetch Tournaments and Group Sports ──────────────────────────────────
  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/competitions');
      const data = await res.json();
      const rawList = data.competitions || data.data;

      if (data.success && Array.isArray(rawList) && rawList.length > 0) {
        // Group competitions by tournament_name
        const groupMap: Record<string, Tournament> = {};

        rawList.forEach((c: any) => {
          const tName = c.tournamentName || c.tournament_name || (c.name || '').split('-')[0].trim() || 'SPARK 2026';
          const tId = c.tournamentId || c.tournament_id || `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const sName = c.sportName || c.sport_name || (c.sportId?.name) || c.name || 'General';

          if (!groupMap[tName]) {
            groupMap[tName] = {
              id: tId,
              tournamentName: tName,
              description: c.description || 'Annual College Sports Tournament with multiple sports competitions.',
              startDate: c.date ? new Date(c.date).toISOString().split('T')[0] : '2026-10-10',
              endDate: c.registrationEnd ? new Date(c.registrationEnd).toISOString().split('T')[0] : '2026-10-15',
              venue: c.venue || 'GASC Idappadi Sports Complex',
              bannerImage: c.bannerImage || '/images/sports/tournament.png',
              status: c.status || 'Registration Open',
              sports: []
            };
          }

          groupMap[tName].sports.push({
            id: String(c.id || c._id),
            name: c.name || `${sName} Event`,
            sportName: sName,
            type: c.type && c.type.includes('Team') ? 'Team Event' : 'Individual Event',
            date: c.date ? new Date(c.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Oct 12, 2026',
            startTime: c.startTime || '09:00 AM',
            endTime: c.endTime || '05:00 PM',
            registrationEnd: c.registrationEnd ? new Date(c.registrationEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Oct 08, 2026',
            venue: c.venue || groupMap[tName].venue,
            maxParticipants: c.maxParticipants || 50,
            currentRegistrations: c.currentRegistrations || 0,
            status: c.status || 'Registration Open',
            description: c.description || `${sName} competition inside ${tName}.`
          });
        });

        const list = Object.values(groupMap);
        setTournaments(list);
      }
    } catch { /* keep defaults */ }
    setLoading(false);
  };

  // ── 3. Fetch Student Registrations & Official Team Assignment Status ──────
  const fetchMyRegistrations = async () => {
    try {
      const token = localStorage.getItem('gasc_token') || localStorage.getItem('token') || localStorage.getItem('studentToken');
      const regNo = studentUser.registerNumber || '23CS001';
      const sId = studentUser.id || 'usr_cs_b_1';

      // 1. Fetch official team status first
      let teamStatusMap: Record<string, any> = {};
      try {
        const teamRes = await fetch(`/api/teams/student-status?studentId=${encodeURIComponent(sId)}&registerNumber=${encodeURIComponent(regNo)}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-student-id': sId,
            'x-register-number': regNo
          }
        });
        const teamData = await teamRes.json();
        if (teamData.success) {
          if (Array.isArray(teamData.myTeams)) {
            setMyAssignedTeams(teamData.myTeams);
          }
          if (Array.isArray(teamData.registrations)) {
            teamData.registrations.forEach((r: any) => {
              const k = (r.sportName || '').toLowerCase().trim();
              teamStatusMap[k] = r;
            });
          }
        }
      } catch (e) {
        console.warn('Team status fetch notice:', e);
      }

      // 2. Fetch my applications
      const res = await fetch('/api/competitions/my-applications', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-student-id': sId,
          'x-register-number': regNo
        }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.registrations)) {
        const map: Record<string, RegistrationItem> = {};
        data.registrations.forEach((r: any) => {
          const compId = String(r.competitionId?.id || r.competitionId?._id || r.competition_id || r.competitionId || r.id);
          const tName = r.competitionId?.tournamentName || r.competitionId?.tournament_name || r.tournamentName || 'SPARK 2026';
          const sName = r.competitionId?.sportName || r.competitionId?.sport_name || r.sportName || 'Sports Event';
          const sKey = sName.toLowerCase().trim();
          const tInfo = teamStatusMap[sKey];

          const isTeam = tInfo ? tInfo.isTeamEvent : (r.competitionId?.type?.includes('Team') || ['cricket','football','kabaddi','volleyball','basketball','handball'].some(s => sKey.includes(s)));

          map[compId] = {
            id: String(r.id || r._id),
            registrationCode: r.registrationCode || r.registration_code || `SPARK26-${sName.substring(0, 3).toUpperCase()}-REG`,
            tournamentName: tName,
            sportName: sName,
            status: r.status === 'Approved' ? 'Approved' : (r.status === 'Rejected' ? 'Rejected' : 'Registered'),
            registeredAt: r.registrationDate ? new Date(r.registrationDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 27, 2026',
            venue: r.competitionId?.venue || 'GASC Campus',
            remarks: r.adminRemarks || r.remarks || 'Confirmed entry',
            isTeamEvent: isTeam,
            teamStatus: tInfo ? tInfo.teamStatus : (!isTeam ? 'INDIVIDUAL' : 'Not Assigned'),
            assignedTeam: tInfo?.assignedTeam || null
          };
        });
        setMyRegistrations(prev => ({ ...prev, ...map }));
      }
    } catch { /* keep existing */ }
  };

  // ── 4. Live Polling ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTournaments();
    fetchMyRegistrations();
    pollRef.current = setInterval(() => {
      fetchTournaments();
      fetchMyRegistrations();
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [studentUser.registerNumber, studentUser.id]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── 5. One-Click Confirm Registration ──────────────────────────────────────
  const handleConfirmRegistration = async () => {
    if (!selectedSport) return;
    setRegistering(true);

    const compId = selectedSport.id;
    const parentTName = activeTournament ? activeTournament.tournamentName : 'SPARK 2026';
    const sName = selectedSport.sportName;

    // Generate unique code for instant display
    const cleanT = parentTName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tCode = cleanT.includes('SPARK') ? 'SPARK26' : (cleanT.substring(0, 5) + '26');
    const sCode = sName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
    const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const generatedCode = `${tCode}-${sCode}-${hex}`;

    try {
      let token = localStorage.getItem('gasc_token') || localStorage.getItem('token') || localStorage.getItem('studentToken');

      // If token is missing, retrieve active session token dynamically
      if (!token) {
        try {
          const sRes = await fetch('/api/auth/session-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registerNumber: studentUser.registerNumber || 'C24UG183CSC013' })
          });
          const sData = await sRes.json();
          if (sData.success && sData.token) {
            token = sData.token;
            localStorage.setItem('gasc_token', sData.token);
            if (sData.user) localStorage.setItem('gasc_user', JSON.stringify(sData.user));
          }
        } catch { /* proceed */ }
      }

      const res = await fetch(`/api/competitions/${compId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-register-number': studentUser.registerNumber || 'C24UG183CSC013',
          'x-student-id': studentUser.id || 'usr_lokesh_csc013'
        },
        body: JSON.stringify({
          remarks: 'Confirmed via Student 1-Click Registration',
          registerNumber: studentUser.registerNumber || 'C24UG183CSC013',
          studentId: studentUser.id || 'usr_lokesh_csc013',
          studentName: studentUser.name || 'Lokesh Krishnan',
          department: studentUser.department || 'Computer Science',
          year: studentUser.year || 'III Year',
          gender: studentUser.gender || 'Male',
          mobile: studentUser.mobile || '+91 98421 54321',
          email: studentUser.email || `${(studentUser.registerNumber || 'c24ug183csc013').toLowerCase()}@gascidappadi.edu.in`
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.message && data.message.toLowerCase().includes('already registered')) {
          showToast(data.message, 'error');
        } else {
          showToast(data.message || 'Registration failed. Please try again.', 'error');
        }
        setRegistering(false);
        return;
      }

      const regCode = data.registration?.registrationCode || data.registrationCode || generatedCode;
      const newRegItem: RegistrationItem = {
        id: data.registration?.id || `reg_${Date.now()}`,
        registrationCode: regCode,
        tournamentName: data.registration?.tournamentName || parentTName,
        sportName: data.registration?.sportName || sName,
        status: data.registration?.status || 'Registered',
        registeredAt: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        venue: selectedSport.venue
      };

      setMyRegistrations(prev => ({
        ...prev,
        [compId]: newRegItem
      }));

      setShowConfirmModal(false);
      setSuccessRegistration(newRegItem);
      fetchMyRegistrations();
    } catch (err: any) {
      showToast(err.message || 'Network error during registration.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  // Filtered Tournaments
  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'Upcoming') return t.status === 'Upcoming';
    if (activeTab === 'Open') return t.status === 'Registration Open' || t.status === 'Open';
    if (activeTab === 'Closed') return t.status === 'Registration Closed' || t.status === 'Completed';
    return true;
  });

  const myRegList = Object.values(myRegistrations);

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: toast.type === 'success' ? '#0f5132' : '#5c1a1a',
            border: `1px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: '#FFFFFF', padding: '12px 20px', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          {toast.type === 'success' ? <CheckCircle style={{ width: 18, height: 18, color: '#22c55e' }} /> : <AlertCircle style={{ width: 18, height: 18, color: '#ef4444' }} />}
          {toast.message}
        </div>
      )}

      {/* ── VIEW 1: MY REGISTRATIONS TAB ─────────────────────────────────────── */}
      {activeTab === 'Mine' ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h1 className="section-title" style={{ fontSize: 28, margin: 0 }}>
                MY <span style={{ color: '#38A7FF' }}>REGISTRATIONS</span> & SQUAD STATUS
              </h1>
              <p className="section-subtitle" style={{ margin: '4px 0 0' }}>Official tournament entries and Sports Mam team formations.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Quick Profile Switcher for Viva / Demo Testing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(11,27,58,0.7)', padding: '6px 10px', borderRadius: 12, border: '1px solid rgba(56,167,255,0.25)', fontSize: 12 }}>
                <span style={{ color: '#6E86A5', fontWeight: 600 }}>Demo Profile:</span>
                <button
                  type="button"
                  onClick={() => switchStudentProfile('lokesh')}
                  style={{
                    background: studentUser.registerNumber === '23CS001' ? '#0284c7' : 'transparent',
                    color: '#FFF', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                    boxShadow: studentUser.registerNumber === '23CS001' ? '0 2px 8px rgba(2,132,199,0.5)' : 'none'
                  }}
                >
                  Lokesh (23CS001 • Team Selected)
                </button>
                <button
                  type="button"
                  onClick={() => switchStudentProfile('ajay')}
                  style={{
                    background: studentUser.registerNumber === '23CS012' ? '#ea580c' : 'transparent',
                    color: '#FFF', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                    boxShadow: studentUser.registerNumber === '23CS012' ? '0 2px 8px rgba(234,88,12,0.5)' : 'none'
                  }}
                >
                  Ajay (23CS012 • Not in Team)
                </button>
              </div>

              <button onClick={() => setActiveTab('All')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Back to Tournaments
              </button>
            </div>
          </div>

          {/* ── SECTION 1: MY OFFICIAL COLLEGE TEAM (IF SELECTED) ───────────── */}
          {myAssignedTeams.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Trophy style={{ width: 22, height: 22, color: '#f59e0b' }} />
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                  MY <span style={{ color: '#38A7FF' }}>COLLEGE TEAM</span>
                </h2>
                <span className="badge badge-green" style={{ fontSize: 11, background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981' }}>
                  ✓ TEAM CREATED
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 20 }}>
                {myAssignedTeams.map((team: any) => (
                  <div
                    key={team.id}
                    className="glass-card animate-fade-up"
                    style={{
                      borderRadius: 22,
                      border: '1px solid rgba(16,185,129,0.4)',
                      background: 'linear-gradient(135deg, rgba(6,78,59,0.35) 0%, rgba(11,27,58,0.95) 100%)',
                      padding: 24,
                      boxShadow: '0 12px 36px rgba(0,0,0,0.45)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                          Official Formed Squad
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFF', margin: '0 0 4px' }}>
                          {team.name}
                        </h3>
                        <div style={{ fontSize: 12, color: '#93c5fd' }}>
                          🏆 {team.tournamentName || 'SPARK 2026'} • 🏅 {team.sportName || 'Cricket'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-green" style={{ fontSize: 11 }}>
                          TEAM CREATED
                        </span>
                        <div style={{ fontSize: 11, color: '#a7f3d0', marginTop: 6, fontWeight: 600 }}>
                          Size: {team.members?.length || 11} Players
                        </div>
                      </div>
                    </div>

                    {/* Department, Gender & Captain Badges */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>
                        🏢 {team.department}
                      </span>
                      <span className="badge badge-purple" style={{ fontSize: 11 }}>
                        👤 {team.gender || 'Boys'}
                      </span>
                      <span className="badge" style={{ fontSize: 11, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                        👑 Captain: {team.captainName}
                      </span>
                    </div>

                    {/* Team Members List */}
                    <div style={{ background: 'rgba(6,18,37,0.7)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6E86A5', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Team Members ({team.members?.length || 0}):</span>
                        <span style={{ color: '#34d399', fontSize: 11 }}>Squad Confirmed by Sports Mam</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        {team.members?.map((m: any, idx: number) => {
                          const isMe = m.id === studentUser.id || m.registerNumber === studentUser.registerNumber || m.name?.toLowerCase() === studentUser.name?.toLowerCase();
                          return (
                            <div
                              key={m.id || idx}
                              style={{
                                background: isMe ? 'rgba(56,167,255,0.25)' : 'rgba(255,255,255,0.04)',
                                border: isMe ? '1px solid #38A7FF' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 10,
                                padding: '6px 10px',
                                fontSize: 12
                              }}
                            >
                              <div style={{ fontWeight: isMe ? 800 : 600, color: isMe ? '#38A7FF' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idx + 1}. {m.name}</span>
                                {m.role === 'Captain' && <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 4 }}>👑</span>}
                              </div>
                              <div style={{ fontSize: 10, color: isMe ? '#93c5fd' : '#94a3b8', fontFamily: 'monospace' }}>
                                {m.registerNumber} {isMe && '(You)'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 2: REGISTERED DISCIPLINES ───────────────────────────── */}
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              REGISTERED <span style={{ color: '#38A7FF' }}>DISCIPLINES</span> ({myRegList.length})
            </h2>
          </div>

          {myRegList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6E86A5', background: 'rgba(11,27,58,0.4)', borderRadius: 20, border: '1px solid rgba(55,140,255,0.15)' }}>
              <Trophy style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.4, color: '#38A7FF' }} />
              <h3 style={{ color: '#FFF', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No Registrations Found</h3>
              <p style={{ fontSize: 13, marginBottom: 18 }}>Explore available tournaments and choose your sport discipline to register.</p>
              <button onClick={() => setActiveTab('All')} className="btn btn-primary">Browse Tournaments</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
              {myRegList.map((reg) => (
                <div key={reg.id} className="glass-card" style={{ padding: 22, border: '1px solid rgba(55,140,255,0.25)', borderRadius: 20, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className="badge badge-blue" style={{ fontSize: 11, letterSpacing: '0.5px' }}>
                        🏆 {reg.tournamentName}
                      </span>
                      <span className={`badge ${reg.status === 'Approved' ? 'badge-green' : 'badge-orange'}`}>
                        {reg.status === 'Approved' ? '✓ Approved' : '✓ Registered'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(56,167,255,0.12)', border: '1px solid rgba(56,167,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                        {sportEmoji[reg.sportName] || '🏅'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{reg.sportName}</h3>
                        <div style={{ fontSize: 12, color: '#38A7FF', fontWeight: 600 }}>{reg.tournamentName}</div>
                      </div>
                    </div>

                    {/* Registration Card Meta */}
                    <div style={{ background: 'rgba(6,18,37,0.6)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: '#6E86A5' }}>Registration ID:</span>
                        <span style={{ color: '#22D3EE', fontFamily: 'monospace', fontWeight: 700 }}>{reg.registrationCode}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: '#6E86A5' }}>Registered Date:</span>
                        <span style={{ color: '#FFF' }}>{reg.registeredAt}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#6E86A5' }}>Venue:</span>
                        <span style={{ color: '#FFF' }}>{reg.venue || 'GASC Ground'}</span>
                      </div>
                    </div>

                    {/* Requirement 23: Team Status Box */}
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      marginBottom: 14,
                      border: '1px solid',
                      ...(reg.teamStatus === 'TEAM CREATED'
                        ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)' }
                        : reg.isTeamEvent
                        ? { background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.35)' }
                        : { background: 'rgba(56,167,255,0.12)', borderColor: 'rgba(56,167,255,0.35)' })
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#AFC4DF' }}>
                          {reg.isTeamEvent ? 'Team Status' : 'Registration Type'}
                        </span>
                        <span className={`badge ${
                          reg.teamStatus === 'TEAM CREATED' ? 'badge-green' : reg.isTeamEvent ? 'badge-orange' : 'badge-blue'
                        }`} style={{ fontSize: 11 }}>
                          {reg.teamStatus === 'TEAM CREATED' ? '✓ TEAM CREATED' : reg.isTeamEvent ? 'Not Assigned' : 'Individual Sport'}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        {reg.teamStatus === 'TEAM CREATED' ? (
                          <div style={{ color: '#34d399' }}>
                            ✓ Selected into <strong>{reg.assignedTeam?.name || 'Department College Squad'}</strong>
                          </div>
                        ) : reg.isTeamEvent ? (
                          <div style={{ color: '#fdba74' }}>
                            Registration Status: <strong style={{ color: '#4ade80' }}>Registered</strong><br />
                            Team Status: <strong>Not Assigned</strong> (Squad selection pending by Sports Mam)
                          </div>
                        ) : (
                          <div style={{ color: '#93c5fd' }}>
                            Individual sport discipline. No team formation required.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)' }}>
                    <ShieldCheck style={{ width: 14, height: 14 }} /> Verified Student Entry Pass Active
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTournament ? (
        /* ── VIEW 2: TOURNAMENT DETAILS PAGE ("CHOOSE YOUR SPORT") ──────────── */
        <div>
          {/* Back Button */}
          <button
            onClick={() => setActiveTournament(null)}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to All Tournaments
          </button>

          {/* Tournament Hero Header */}
          <div
            className="glass-card animate-fade-up"
            style={{
              padding: 28, borderRadius: 24, marginBottom: 28,
              border: '1px solid rgba(55,140,255,0.3)',
              background: 'linear-gradient(135deg, rgba(11,27,58,0.9) 0%, rgba(6,18,37,0.95) 100%)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ maxWidth: 680 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span className="badge badge-blue">
                    🏆 OFFICIAL TOURNAMENT CONTAINER
                  </span>
                  <span className="badge badge-green">
                    {activeTournament.status}
                  </span>
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {activeTournament.tournamentName}
                </h1>
                <p style={{ color: '#AFC4DF', fontSize: 14, margin: '0 0 18px', lineHeight: 1.6 }}>
                  {activeTournament.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, color: '#E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar style={{ width: 15, height: 15, color: '#38A7FF' }} />
                    <span style={{ color: '#6E86A5' }}>Duration:</span>
                    <strong>{activeTournament.startDate} – {activeTournament.endDate}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin style={{ width: 15, height: 15, color: '#38A7FF' }} />
                    <span style={{ color: '#6E86A5' }}>Venue:</span>
                    <strong>{activeTournament.venue}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy style={{ width: 15, height: 15, color: '#FF8A50' }} />
                    <span style={{ color: '#6E86A5' }}>Available Sports:</span>
                    <strong>{activeTournament.sports.length} Competitions</strong>
                  </div>
                </div>
              </div>

              {/* Tournament emblem preview */}
              <div style={{ width: 120, height: 120, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(56,167,255,0.3)', background: '#0b1329', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={getTournamentCoverImage(activeTournament.tournamentName, activeTournament.bannerImage)} alt={activeTournament.tournamentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/sports/tournament.png'; }} />
              </div>
            </div>
          </div>

          {/* Section: Choose Your Sport */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                CHOOSE YOUR <span style={{ color: '#38A7FF' }}>SPORT</span>
              </h2>
              <p style={{ color: '#6E86A5', fontSize: 13, margin: '2px 0 0' }}>Select a sport discipline below to complete 1-click registration for {activeTournament.tournamentName}.</p>
            </div>

            {/* Sport Search */}
            <div style={{ position: 'relative', width: 260 }}>
              <Search style={{ width: 15, height: 15, color: '#6E86A5', position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder="Search sport inside tournament..."
                value={searchSport}
                onChange={e => setSearchSport(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', borderRadius: 12,
                  background: 'rgba(11,27,58,0.6)', border: '1px solid rgba(55,140,255,0.25)',
                  color: '#FFF', fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Grid of Sports Glass Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {activeTournament.sports
              .filter(s => s.name.toLowerCase().includes(searchSport.toLowerCase()) || s.sportName.toLowerCase().includes(searchSport.toLowerCase()))
              .map((s, idx) => {
                const reg = myRegistrations[s.id];
                const isRegistered = !!reg;

                return (
                  <div
                    key={s.id || idx}
                    className="glass-card animate-fade-up"
                    style={{
                      padding: 20, borderRadius: 20,
                      border: isRegistered ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(55,140,255,0.2)',
                      background: isRegistered ? 'linear-gradient(135deg, rgba(15,81,50,0.2) 0%, rgba(6,18,37,0.9) 100%)' : 'rgba(11,27,58,0.6)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)', transition: 'all 0.3s ease'
                    }}
                  >
                    <div>
                      {/* Card Header: Emoji & Type Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ fontSize: 32, width: 48, height: 48, borderRadius: 14, background: 'rgba(56,167,255,0.12)', border: '1px solid rgba(56,167,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sportEmoji[s.sportName] || '🏅'}
                        </div>
                        <span className={`badge ${s.type.includes('Team') ? 'badge-purple' : 'badge-blue'}`}>
                          {s.type}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                        {s.name}
                      </h3>
                      <div style={{ fontSize: 12, color: '#38A7FF', fontWeight: 600, marginBottom: 12 }}>
                        {s.sportName} Discipline
                      </div>

                      {/* Event Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#AFC4DF', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar style={{ width: 13, height: 13, color: '#38A7FF' }} />
                          <span style={{ color: '#6E86A5' }}>Date:</span> {s.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin style={{ width: 13, height: 13, color: '#38A7FF' }} />
                          <span style={{ color: '#6E86A5' }}>Venue:</span> {s.venue}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock style={{ width: 13, height: 13, color: '#FF8A50' }} />
                          <span style={{ color: '#6E86A5' }}>Deadline:</span> {s.registrationEnd}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      {isRegistered ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4ade80', background: 'rgba(34,197,94,0.15)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)' }}>
                            <CheckCircle style={{ width: 15, height: 15 }} /> ✓ Already Registered
                          </div>
                          <button
                            onClick={() => setActiveTab('Mine')}
                            className="btn btn-outline"
                            style={{ width: '100%', fontSize: 12, padding: '7px' }}
                          >
                            View Registration
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setSelectedSport(s); setShowConfirmModal(true); }}
                          className="btn btn-primary"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                        >
                          Select Sport <ArrowRight style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* ── VIEW 3: MAIN TOURNAMENTS DIRECTORY VIEW ────────────────────────── */
        <div>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 className="section-title" style={{ fontSize: 28 }}>
              OFFICIAL <span style={{ color: '#38A7FF' }}>TOURNAMENTS</span>
            </h1>
            <p className="section-subtitle">Parent tournament events hosting multiple sports competitions inside.</p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setActiveTab('All')} className={`filter-tab ${activeTab === 'All' ? 'active' : ''}`}>
              All Tournaments ({tournaments.length})
            </button>
            <button onClick={() => setActiveTab('Open')} className={`filter-tab ${activeTab === 'Open' ? 'active' : ''}`}>
              Registration Open
            </button>
            <button onClick={() => setActiveTab('Upcoming')} className={`filter-tab ${activeTab === 'Upcoming' ? 'active' : ''}`}>
              Upcoming
            </button>
            <button onClick={() => setActiveTab('Closed')} className={`filter-tab ${activeTab === 'Closed' ? 'active' : ''}`}>
              Registration Closed
            </button>
            <button onClick={() => setActiveTab('Mine')} className={`filter-tab ${(activeTab as string) === 'Mine' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter style={{ width: 14, height: 14, color: '#38A7FF' }} /> My Registrations ({myRegList.length})
            </button>
          </div>

          {/* Grid of Parent Tournaments */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 320, borderRadius: 22, background: 'rgba(55,140,255,0.05)', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 }}>
              {filteredTournaments.map((t) => (
              <div
                key={t.id}
                className="glass-card animate-fade-up"
                style={{
                  borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(55,140,255,0.25)',
                  background: 'rgba(11,27,58,0.7)', boxShadow: '0 10px 32px rgba(0,0,0,0.35)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                {/* Hero Header Image */}
                <div style={{ position: 'relative', height: 160, overflow: 'hidden', background: '#0b1329' }}>
                  <img src={getTournamentCoverImage(t.tournamentName, t.bannerImage)} alt={t.tournamentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/sports/tournament.png'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,27,58,0.95) 0%, transparent 60%)' }} />

                  {/* Badges */}
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <span className="badge badge-blue">
                      🏆 Parent Tournament
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span className="badge badge-green">
                      {t.status}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
                    <span className="badge badge-purple" style={{ fontSize: 11 }}>
                      {t.sports.length} Sports Competitions Inside
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      🏆 {t.tournamentName}
                    </h3>
                    <p style={{ color: '#AFC4DF', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#E2E8F0', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar style={{ width: 14, height: 14, color: '#38A7FF' }} />
                        <span style={{ color: '#6E86A5' }}>Duration:</span>
                        <span>{t.startDate} – {t.endDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin style={{ width: 14, height: 14, color: '#38A7FF' }} />
                        <span style={{ color: '#6E86A5' }}>Venue:</span>
                        <span>{t.venue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Explore Button */}
                  <button
                    onClick={() => setActiveTournament(t)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}
                  >
                    Explore Tournament <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: 1-CLICK CONFIRMATION MODAL ─────────────────────────────── */}
      {showConfirmModal && selectedSport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,13,29,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: 520, borderRadius: 24, padding: 26, border: '1px solid rgba(55,140,255,0.3)', background: 'linear-gradient(135deg, rgba(11,27,58,0.95) 0%, rgba(6,18,37,0.98) 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trophy style={{ width: 22, height: 22, color: '#FF8A50' }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', margin: 0 }}>Confirm Registration</h3>
              </div>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Selected Sport Summary */}
            <div style={{ background: 'rgba(56,167,255,0.08)', borderRadius: 16, padding: 16, border: '1px solid rgba(56,167,255,0.2)', marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#38A7FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Selected Competition
              </div>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {sportEmoji[selectedSport.sportName] || '🏅'} {selectedSport.name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#AFC4DF', marginTop: 10 }}>
                <div><span style={{ color: '#6E86A5' }}>Tournament:</span> <strong>{activeTournament?.tournamentName}</strong></div>
                <div><span style={{ color: '#6E86A5' }}>Event Type:</span> <strong>{selectedSport.type}</strong></div>
                <div><span style={{ color: '#6E86A5' }}>Event Date:</span> {selectedSport.date}</div>
                <div><span style={{ color: '#6E86A5' }}>Deadline:</span> {selectedSport.registrationEnd}</div>
              </div>
            </div>

            {/* Student Profile Details */}
            <div style={{ background: 'rgba(6,18,37,0.7)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#22D3EE', marginBottom: 10 }}>
                <UserCheck style={{ width: 15, height: 15 }} /> Student Profile Details (Pre-filled)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6E86A5' }}>Name</div>
                  <div style={{ fontWeight: 700, color: '#FFF' }}>{studentUser.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6E86A5' }}>Register Number</div>
                  <div style={{ fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>{studentUser.registerNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6E86A5' }}>Department</div>
                  <div style={{ fontWeight: 700, color: '#FFF' }}>{studentUser.department}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6E86A5' }}>Year</div>
                  <div style={{ fontWeight: 700, color: '#FFF' }}>{studentUser.year}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6E86A5', marginTop: 10, fontStyle: 'italic' }}>
                * Your student credentials are pre-filled from your authenticated profile. No re-typing required.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirmModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleConfirmRegistration}
                disabled={registering}
                className="btn btn-primary"
                style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {registering ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REGISTRATION SUCCESS SCREEN ─────────────────────────────── */}
      {successRegistration && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,13,29,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: 480, borderRadius: 24, padding: 28, textAlign: 'center', border: '1px solid rgba(34,197,94,0.4)', background: 'linear-gradient(135deg, rgba(15,81,50,0.3) 0%, rgba(6,18,37,0.98) 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.4)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle style={{ width: 36, height: 36 }} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFF', margin: '0 0 6px' }}>
              ✅ Registration Successful!
            </h2>
            <p style={{ fontSize: 13, color: '#AFC4DF', margin: '0 0 20px' }}>
              Your sport entry pass has been generated and confirmed.
            </p>

            {/* Details Summary Card */}
            <div style={{ background: 'rgba(6,18,37,0.8)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Tournament:</span>
                <strong style={{ color: '#FFF' }}>{successRegistration.tournamentName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Sport:</span>
                <strong style={{ color: '#38A7FF' }}>{successRegistration.sportName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Student:</span>
                <strong style={{ color: '#FFF' }}>{studentUser.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Register Number:</span>
                <strong style={{ color: '#FFF', fontFamily: 'monospace' }}>{studentUser.registerNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Registration Date:</span>
                <strong style={{ color: '#FFF' }}>{successRegistration.registeredAt}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 13 }}>
                <span style={{ color: '#6E86A5' }}>Registration ID:</span>
                <strong style={{ color: '#22D3EE', fontFamily: 'monospace', fontSize: 14 }}>{successRegistration.registrationCode}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setSuccessRegistration(null); setActiveTab('Mine'); }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                View My Registrations
              </button>
              <button
                onClick={() => setSuccessRegistration(null)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Back to Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionsPage;
