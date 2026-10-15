import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy, Calendar, MapPin, Users, User, Shield, AlertCircle,
  CheckCircle2, ArrowRight, ArrowLeft, Mail, Phone, Building,
  RefreshCw, FileText, Plus, Trash2, Award, Clock, Sparkles,
  ExternalLink, Printer, Download, Check
} from 'lucide-react';

interface TournamentData {
  id: string;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  venue: string;
  status: string;
  bannerImage: string;
  registrationToken: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  rules?: string;
  competitionsCount?: number;
}

interface CompetitionItem {
  id: string;
  name: string;
  tournamentName: string;
  tournamentId: string;
  sportName: string;
  eventName: string;
  gender: string;
  competitionMode: 'INDIVIDUAL' | 'TEAM';
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  registrationStart?: string;
  registrationDeadline?: string;
  requiredPlayers: number;
  substitutes: number;
  maxPlayers: number;
  maxColleges: number;
  maxTeams: number;
  currentRegistrations: number;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'FULL' | 'COMPLETED';
  description?: string;
  bannerImage: string;
  rules?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  registrationToken: string;
}

interface TeamPlayer {
  playerName: string;
  registerNumber: string;
  department: string;
  year: string;
  gender: string;
  role: string;
}

const OpenRegistrationPage: React.FC = () => {
  const params = useParams<{ tournamentToken?: string; competitionToken?: string }>();
  const tournamentToken = params.tournamentToken || params.competitionToken;

  // State: List of tournaments (if no token provided)
  const [tournamentsList, setTournamentsList] = useState<TournamentData[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // State: Single Tournament & its Competitions (if token provided)
  const [currentTournament, setCurrentTournament] = useState<TournamentData | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State: Active Registration Form Modal/Flow
  const [selectedComp, setSelectedComp] = useState<CompetitionItem | null>(null);
  const [step, setStep] = useState(1);

  // Form Fields: College Details
  const [collegeName, setCollegeName] = useState('');
  const [collegeAddress, setCollegeAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [collegePhone, setCollegePhone] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');

  // Form Fields: Team Details (if TEAM)
  const [teamName, setTeamName] = useState('');
  const [teamGender, setTeamGender] = useState('Boys');
  const [coachName, setCoachName] = useState('');
  const [coachPhone, setCoachPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);

  // Form Fields: Individual Details (if INDIVIDUAL)
  const [playerName, setPlayerName] = useState('');
  const [playerRollNumber, setPlayerRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('I Year');
  const [individualGender, setIndividualGender] = useState('Boys');

  // Form Fields: Contact Details
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');

  // OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');

  // Submission & Success
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRegId, setSubmittedRegId] = useState<string | null>(null);

  // OTP Timer countdown
  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Load Tournaments List if no token provided
  useEffect(() => {
    if (!tournamentToken) {
      const fetchTournaments = async () => {
        setListLoading(true);
        try {
          const res = await fetch('/api/open-registration/tournaments');
          const data = await res.json();
          if (data && data.success && Array.isArray(data.tournaments)) {
            setTournamentsList(data.tournaments);
          }
        } catch (e) {
          console.warn('Failed to load tournaments list:', e);
        } finally {
          setListLoading(false);
        }
      };
      fetchTournaments();
    }
  }, [tournamentToken]);

  // Load Tournament & Competitions if token provided
  useEffect(() => {
    if (tournamentToken) {
      const fetchTournamentDetails = async () => {
        setCompLoading(true);
        setLoadError(null);
        try {
          const res = await fetch(`/api/open-registration/tournament/${encodeURIComponent(tournamentToken)}`);
          const data = await res.json();
          if (data && data.success && data.tournament) {
            setCurrentTournament(data.tournament);
            const compsList: CompetitionItem[] = data.competitions || [];
            setCompetitions(compsList);

            // If a specific competition was targeted (either by activeCompetitionId or token match), open its registration form immediately!
            const targetComp = compsList.find(c =>
              (data.activeCompetitionId && c.id === data.activeCompetitionId) ||
              c.id === tournamentToken ||
              c.registrationToken === tournamentToken ||
              (c.rules && typeof c.rules === 'string' && c.rules.includes(tournamentToken))
            );
            if (targetComp && targetComp.status === 'OPEN') {
              startRegistrationForCompetition(targetComp);
            }
          } else {
            setLoadError(data?.message || 'Tournament not found or invalid registration token.');
          }
        } catch (e: any) {
          setLoadError(e.message || 'Error connecting to tournament server.');
        } finally {
          setCompLoading(false);
        }
      };
      fetchTournamentDetails();
    }
  }, [tournamentToken]);

  // Initialize player roster when competition is selected
  const startRegistrationForCompetition = (comp: CompetitionItem) => {
    if (comp.status !== 'OPEN') return;
    setSelectedComp(comp);
    setStep(1);
    setFormError(null);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode('');
    setSubmittedRegId(null);

    // If Team event, initialize required players list
    if (comp.competitionMode === 'TEAM') {
      const totalSlots = (comp.requiredPlayers || 11) + (comp.substitutes || 0);
      const initialRoster: TeamPlayer[] = [];
      for (let i = 0; i < totalSlots; i++) {
        const isSub = i >= (comp.requiredPlayers || 11);
        initialRoster.push({
          playerName: '',
          registerNumber: '',
          department: '',
          year: 'I Year',
          gender: comp.gender === 'Girls' ? 'Girls' : 'Boys',
          role: i === 0 ? 'Captain' : (i === 1 ? 'Vice Captain' : (isSub ? 'Substitute' : 'Player'))
        });
      }
      setPlayers(initialRoster);
      setTeamGender(comp.gender === 'Girls' ? 'Girls' : 'Boys');
    } else {
      setIndividualGender(comp.gender === 'Girls' ? 'Girls' : 'Boys');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper: Update player in team roster
  const updatePlayerField = (index: number, field: keyof TeamPlayer, value: string) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Helper: Add optional extra substitute player
  const addSubstitutePlayer = () => {
    if (!selectedComp) return;
    if (players.length >= selectedComp.maxPlayers) {
      alert(`Maximum squad limit is ${selectedComp.maxPlayers} players.`);
      return;
    }
    setPlayers(prev => [
      ...prev,
      {
        playerName: '',
        registerNumber: '',
        department: '',
        year: 'I Year',
        gender: selectedComp.gender === 'Girls' ? 'Girls' : 'Boys',
        role: 'Substitute'
      }
    ]);
  };

  // Helper: Remove extra substitute player
  const removeSubstitutePlayer = (index: number) => {
    if (!selectedComp) return;
    const required = selectedComp.requiredPlayers || 1;
    if (index < required) {
      alert('Cannot remove required starting players.');
      return;
    }
    setPlayers(prev => prev.filter((_, idx) => idx !== index));
  };

  // Send Email OTP
  const handleSendOtp = async () => {
    if (!participantEmail || !participantEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError(null);
    setOtpSending(true);

    try {
      const res = await fetch('/api/open-registration/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail.trim(),
          competitionToken: selectedComp?.registrationToken,
          collegeName: collegeName.trim(),
          participantName: selectedComp?.competitionMode === 'TEAM' ? teamName.trim() : playerName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpToken(data.otpToken);
        setMaskedEmail(data.maskedEmail || participantEmail);
        setOtpCooldown(60);
      } else {
        setFormError(data.message || 'Failed to dispatch OTP email.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Error connecting to OTP service.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setFormError('Please enter the 6-digit OTP code received in your email.');
      return;
    }
    setFormError(null);
    setOtpVerifying(true);

    try {
      const res = await fetch('/api/open-registration/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail.trim(),
          otp: otpCode.trim(),
          otpToken
        })
      });
      const data = await res.json();
      if (data.success) {
        setOtpVerified(true);
        setStep(6); // Proceed to Review step
      } else {
        setFormError(data.message || 'Invalid or expired OTP code.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Error verifying OTP.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Final Registration Submission
  const handleSubmitRegistration = async () => {
    if (!selectedComp || !currentTournament) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        competitionToken: selectedComp.registrationToken || selectedComp.id,
        tournamentToken: currentTournament.registrationToken || currentTournament.id,
        competitionId: selectedComp.id,
        tournamentId: currentTournament.id,
        tournamentName: currentTournament.name,
        sportName: selectedComp.sportName,
        eventName: selectedComp.eventName || selectedComp.name,
        registrationType: selectedComp.competitionMode,

        // College
        collegeName: collegeName.trim(),
        collegeAddress: collegeAddress.trim(),
        district: district.trim(),
        state: state.trim(),
        collegePhone: collegePhone.trim(),
        collegeEmail: collegeEmail.trim(),

        // Participant / Team
        teamName: selectedComp.competitionMode === 'TEAM' ? teamName.trim() : null,
        teamGender: selectedComp.competitionMode === 'TEAM' ? teamGender : null,
        coachName: coachName.trim(),
        coachPhone: coachPhone.trim(),
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),

        // Individual
        playerName: selectedComp.competitionMode === 'INDIVIDUAL' ? playerName.trim() : null,
        playerRollNumber: selectedComp.competitionMode === 'INDIVIDUAL' ? playerRollNumber.trim() : null,
        department: selectedComp.competitionMode === 'INDIVIDUAL' ? department.trim() : null,
        year: selectedComp.competitionMode === 'INDIVIDUAL' ? year : null,
        gender: selectedComp.competitionMode === 'INDIVIDUAL' ? individualGender : teamGender,

        // Contact
        participantEmail: participantEmail.trim(),
        participantPhone: participantPhone.trim(),

        // Players roster if team
        players: selectedComp.competitionMode === 'TEAM' ? players : [],

        // OTP verification token
        otpToken,
        otpVerified: true
      };

      const res = await fetch('/api/open-registration/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.registrationId) {
        setSubmittedRegId(data.registrationId);
        setStep(7); // Success Step
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError(data.message || 'Registration failed. Please check inputs and try again.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Submission error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // VIEW A: TOURNAMENTS DIRECTORY (When /open-registration is visited)
  // =========================================================================
  if (!tournamentToken) {
    return (
      <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
        {/* Top Navbar */}
        <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center p-1 overflow-hidden">
                <img src="/images/college-logo.png" alt="GASC" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">GOVERNMENT ARTS & SCIENCE COLLEGE, IDAPPADI</div>
                <h1 className="text-sm font-extrabold text-white leading-tight">Inter-College Open Registration</h1>
              </div>
            </div>
            <Link
              to="/student/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              GASC Student Login &rarr;
            </Link>
          </div>
        </header>

        {/* Hero Banner */}
        <div className="border-b border-slate-800 bg-gradient-to-b from-blue-950/30 to-transparent py-12 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Open to External Colleges & Universities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Inter-College Sports Championships 2026
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
              Welcome collegiate sports teams and athletes! Scan your tournament QR code or select an open inter-college championship below to register.
            </p>
          </div>
        </div>

        {/* Tournaments Grid */}
        <main className="max-w-6xl mx-auto w-full flex-1 px-4 py-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Available Inter-College Tournaments
          </h3>

          {listLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading inter-college tournaments...</p>
            </div>
          ) : tournamentsList.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No Open Tournaments at Present</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                There are currently no inter-college tournaments accepting open registrations. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournamentsList.map(t => (
                <div key={t.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group">
                  <div className="aspect-[16/9] w-full bg-slate-950 relative overflow-hidden">
                    <img
                      src={t.bannerImage || '/images/sports/tournament.png'}
                      alt={t.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/sports/tournament.png'; }}
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {t.status || 'REGISTRATION OPEN'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {t.description}
                      </p>
                      <div className="space-y-1.5 mt-3 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{t.venue}</span>
                        </div>
                        {t.startDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{new Date(t.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/open-registration/${t.registrationToken || t.id}`}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>View Competitions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
          <p>Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.</p>
          <p className="mt-1">Sports Department Portal • Powered by Supabase Cloud</p>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: SINGLE TOURNAMENT QR PAGE & REGISTRATION STEP FLOW
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center p-1 overflow-hidden">
              <img src="/images/college-logo.png" alt="GASC" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">GOVERNMENT ARTS & SCIENCE COLLEGE, IDAPPADI</div>
              <h1 className="text-sm font-extrabold text-white leading-tight">Inter-College Open Registration</h1>
            </div>
          </div>
          <Link
            to="/open-registration"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            All Tournaments
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto w-full flex-1 px-4 py-8">
        {compLoading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Identifying Tournament & Competitions...</p>
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900/60 border border-red-500/20 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Registration Link Unavailable</h3>
            <p className="text-xs text-slate-400 mt-2">{loadError}</p>
            <Link
              to="/open-registration"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
            >
              Browse Open Tournaments
            </Link>
          </div>
        ) : selectedComp ? (
          /* ═════════════════════════════════════════════════════════════
             STEP-BASED REGISTRATION FORM (When a competition is clicked)
             ═════════════════════════════════════════════════════════════ */
          <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-900/50 to-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                  {currentTournament?.name}
                </span>
                <h2 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  {selectedComp.name} Registration
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Mode: <strong className="text-slate-200">{selectedComp.competitionMode}</strong></span>
                  <span>Category: <strong className="text-slate-200">{selectedComp.gender}</strong></span>
                  {selectedComp.competitionMode === 'TEAM' && (
                    <span>Squad: <strong className="text-amber-300">{selectedComp.requiredPlayers} Players + {selectedComp.substitutes} Subs</strong></span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setSelectedComp(null); setStep(1); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
            </div>

            {/* Step Progress Tracker */}
            <div className="bg-slate-950/60 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between overflow-x-auto text-[11px]">
              {[
                { s: 1, label: 'Overview' },
                { s: 2, label: 'College' },
                { s: 3, label: selectedComp.competitionMode === 'TEAM' ? 'Team & Players' : 'Player Info' },
                { s: 4, label: 'Contact' },
                { s: 5, label: 'Email OTP' },
                { s: 6, label: 'Review' },
                { s: 7, label: 'Success' }
              ].map(st => (
                <div key={st.s} className={`flex items-center gap-1.5 shrink-0 ${step === st.s ? 'text-blue-400 font-bold' : (step > st.s ? 'text-emerald-400' : 'text-slate-500')}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    step === st.s
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : (step > st.s ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 text-slate-500')
                  }`}>
                    {step > st.s ? '✓' : st.s}
                  </span>
                  <span className="hidden sm:inline">{st.label}</span>
                </div>
              ))}
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="m-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-6">
              {/* STEP 1: Overview & Rules */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                    <h4 className="font-bold text-white text-sm">Competition Guidelines</h4>
                    <p className="text-slate-300 leading-relaxed">
                      This registration is strictly for external college participants. No account or password is required.
                      After submission, the Sports Board will review and approve your application.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-slate-400">
                      <div>Date: <strong className="text-slate-200">{new Date(selectedComp.date).toLocaleDateString('en-IN')}</strong></div>
                      <div>Venue: <strong className="text-slate-200">{selectedComp.venue}</strong></div>
                      <div>Reporting Time: <strong className="text-slate-200">{selectedComp.startTime}</strong></div>
                      <div>Gender: <strong className="text-slate-200">{selectedComp.gender}</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <span>Proceed to College Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: College Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-400" /> College / Institution Information
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">College Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Government Arts College, Salem"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">College Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Campus address, city, pincode"
                      value={collegeAddress}
                      onChange={(e) => setCollegeAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">District *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Salem"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">College Phone</label>
                      <input
                        type="tel"
                        placeholder="Landline or official mobile"
                        value={collegePhone}
                        onChange={(e) => setCollegePhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">College Email</label>
                      <input
                        type="email"
                        placeholder="principal@college.edu.in"
                        value={collegeEmail}
                        onChange={(e) => setCollegeEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!collegeName.trim() || !collegeAddress.trim() || !district.trim()) {
                          setFormError('Please enter College Name, Address, and District.');
                          return;
                        }
                        setFormError(null);
                        setStep(3);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>Continue to {selectedComp.competitionMode === 'TEAM' ? 'Team Details' : 'Player Details'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Player / Team Details */}
              {step === 3 && (
                <div className="space-y-4">
                  {selectedComp.competitionMode === 'INDIVIDUAL' ? (
                    /* INDIVIDUAL REGISTRATION */
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" /> Athlete Information
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Player / Athlete Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. K. Karthik"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">College Roll / Reg Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 23UCA104"
                            value={playerRollNumber}
                            onChange={(e) => setPlayerRollNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Department *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Computer Science"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Year of Study *</label>
                          <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          >
                            <option value="I Year">I Year</option>
                            <option value="II Year">II Year</option>
                            <option value="III Year">III Year</option>
                            <option value="PG I Year">PG I Year</option>
                            <option value="PG II Year">PG II Year</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Gender *</label>
                          <select
                            value={individualGender}
                            onChange={(e) => setIndividualGender(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          >
                            <option value="Boys">Boys / Men</option>
                            <option value="Girls">Girls / Women</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* TEAM REGISTRATION & SQUAD ROSTER */
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" /> Team & Squad Details
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Team Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Salem Tigers / GAC Cricket XI"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Coach Name</label>
                          <input
                            type="text"
                            placeholder="Physical Director / Coach"
                            value={coachName}
                            onChange={(e) => setCoachName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Coach Mobile</label>
                          <input
                            type="tel"
                            placeholder="Mobile number"
                            value={coachPhone}
                            onChange={(e) => setCoachPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Dynamic Player List */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Squad Players List ({players.length} Total: {selectedComp.requiredPlayers} Starting + {selectedComp.substitutes} Subs)
                          </label>
                          <button
                            type="button"
                            onClick={addSubstitutePlayer}
                            className="text-[11px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Extra Sub
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                          {players.map((p, idx) => {
                            const isStarting = idx < selectedComp.requiredPlayers;
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border text-xs ${
                                  isStarting
                                    ? 'bg-slate-950/60 border-slate-800'
                                    : 'bg-slate-950/30 border-dashed border-amber-500/30'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-[11px] font-bold ${isStarting ? 'text-blue-400' : 'text-amber-400'}`}>
                                    {isStarting ? `Starting Player #${idx + 1}` : `Substitute #${idx + 1 - selectedComp.requiredPlayers}`}
                                  </span>
                                  {!isStarting && idx >= (selectedComp.requiredPlayers + selectedComp.substitutes) && (
                                    <button
                                      type="button"
                                      onClick={() => removeSubstitutePlayer(idx)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    required={isStarting}
                                    placeholder="Player Name *"
                                    value={p.playerName}
                                    onChange={(e) => updatePlayerField(idx, 'playerName', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                                  />
                                  <input
                                    type="text"
                                    required={isStarting}
                                    placeholder="College Reg No *"
                                    value={p.registerNumber}
                                    onChange={(e) => updatePlayerField(idx, 'registerNumber', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Department"
                                    value={p.department}
                                    onChange={(e) => updatePlayerField(idx, 'department', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedComp.competitionMode === 'INDIVIDUAL') {
                          if (!playerName.trim() || !playerRollNumber.trim() || !department.trim()) {
                            setFormError('Please fill in Player Name, Roll Number, and Department.');
                            return;
                          }
                        } else {
                          if (!teamName.trim()) {
                            setFormError('Please enter Team Name.');
                            return;
                          }
                          // Verify all required starting players have names
                          const required = selectedComp.requiredPlayers || 1;
                          for (let i = 0; i < required; i++) {
                            if (!players[i]?.playerName.trim()) {
                              setFormError(`Please enter Player Name for Starting Player #${i + 1}.`);
                              return;
                            }
                          }
                        }
                        setFormError(null);
                        setStep(4);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>Continue to Contact Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Contact Details */}
              {step === 4 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" /> Participant / Representative Contact
                  </h4>
                  <p className="text-xs text-slate-400">
                    Important: A 6-digit OTP will be sent to this email to verify and lock your registration.
                    Approval status notifications will also be delivered here.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Address (for OTP & Notifications) *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. captain@gmail.com"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={participantPhone}
                      onChange={(e) => setParticipantPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!participantEmail.trim() || !participantEmail.includes('@') || !participantPhone.trim()) {
                          setFormError('Please enter a valid email address and mobile number.');
                          return;
                        }
                        setFormError(null);
                        setStep(5);
                        handleSendOtp();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>Proceed to OTP Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Email OTP Verification */}
              {step === 5 && (
                <div className="space-y-5 text-center max-w-md mx-auto py-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Verify Your Email</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter the 6-digit OTP sent to <strong className="text-slate-200">{maskedEmail || participantEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-48 py-3 text-center tracking-[10px] text-xl font-mono font-bold rounded-xl bg-slate-950 border border-blue-500 text-white focus:outline-none shadow-lg shadow-blue-500/10"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    {otpCooldown > 0 ? (
                      <span>Resend OTP in <strong className="text-amber-400">{otpCooldown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpSending}
                        className="text-blue-400 hover:text-blue-300 font-bold underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otpCode.length !== 6}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                        otpCode.length === 6
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {otpVerifying ? 'Verifying...' : 'Verify OTP & Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 6: Review Before Submission */}
              {step === 6 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" /> Review Registration Details
                    </h4>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Email Verified
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                      <div><span className="text-slate-500">Tournament:</span> <strong className="text-white block">{currentTournament?.name}</strong></div>
                      <div><span className="text-slate-500">Competition:</span> <strong className="text-white block">{selectedComp.name}</strong></div>
                      <div><span className="text-slate-500">Mode:</span> <strong className="text-white block">{selectedComp.competitionMode} ({selectedComp.gender})</strong></div>
                      <div><span className="text-slate-500">Venue:</span> <strong className="text-white block">{selectedComp.venue}</strong></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                      <div><span className="text-slate-500">College Name:</span> <strong className="text-white block">{collegeName}</strong></div>
                      <div><span className="text-slate-500">District:</span> <strong className="text-white block">{district}, {state}</strong></div>
                      <div><span className="text-slate-500">Contact Email:</span> <strong className="text-white block">{participantEmail}</strong></div>
                      <div><span className="text-slate-500">Contact Mobile:</span> <strong className="text-white block">{participantPhone}</strong></div>
                    </div>

                    {selectedComp.competitionMode === 'INDIVIDUAL' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Athlete Name:</span> <strong className="text-white block">{playerName}</strong></div>
                        <div><span className="text-slate-500">Register Number:</span> <strong className="text-white block">{playerRollNumber}</strong></div>
                        <div><span className="text-slate-500">Department:</span> <strong className="text-white block">{department} ({year})</strong></div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2">
                          <span className="text-slate-500">Team Name:</span> <strong className="text-white">{teamName}</strong>
                          {coachName && <span className="ml-4 text-slate-400">Coach: {coachName}</span>}
                        </div>
                        <span className="text-slate-500 block mb-1">Squad Players ({players.filter(p => p.playerName.trim()).length}):</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-300">
                          {players.filter(p => p.playerName.trim()).map((pl, i) => (
                            <div key={i} className="p-1 rounded bg-slate-900 border border-slate-800 truncate">
                              #{i + 1} {pl.playerName} ({pl.role})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitRegistration}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      {submitting ? 'Submitting...' : 'Confirm & Submit Registration'}
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 7: Success Screen */}
              {step === 7 && submittedRegId && (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Registration Submitted!</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Your entry has been registered successfully. A confirmation email has been dispatched.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-left">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-slate-500 font-bold">Registration ID:</span>
                      <span className="font-mono font-black text-sm text-amber-400">{submittedRegId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tournament:</span>
                      <span className="font-semibold text-white">{currentTournament?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Competition:</span>
                      <span className="font-semibold text-white">{selectedComp.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">College:</span>
                      <span className="font-semibold text-white">{collegeName}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-slate-500">Status:</span>
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        PENDING APPROVAL
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>
                    <a
                      href={`/api/open-registration/receipt/${submittedRegId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Official Receipt (PDF)</span>
                    </a>
                    <button
                      onClick={() => { setSelectedComp(null); setStep(1); }}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300"
                    >
                      Back to Competitions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════
             TOURNAMENT HEADER & LIST OF COMPETITIONS (Normal view after QR scan)
             ═════════════════════════════════════════════════════════════ */
          <div className="space-y-8">
            {/* Tournament Header Card */}
            {currentTournament && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> OFFICIAL INTER-COLLEGE TOURNAMENT
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {currentTournament.name}
                    </h2>
                    <p className="text-xs text-blue-300 font-semibold">
                      Hosted by Government Arts and Science College, Idappadi - 637 101, Salem
                    </p>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      {currentTournament.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>Venue: <strong>{currentTournament.venue}</strong></span>
                      </div>
                      {currentTournament.startDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>Event Date: <strong>{new Date(currentTournament.startDate).toLocaleDateString('en-IN')}</strong></span>
                        </div>
                      )}
                      {currentTournament.registrationDeadline && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-red-400" />
                          <span>Deadline: <strong>{new Date(currentTournament.registrationDeadline).toLocaleDateString('en-IN')}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-stretch md:self-auto p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1 text-slate-400">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tournament Incharge</div>
                    <div className="font-bold text-white">{currentTournament.contactPerson || 'Dr. R. ANITHA (Physical Director)'}</div>
                    <div>Phone: <strong className="text-slate-300">{currentTournament.contactPhone || '+91 94432 18765'}</strong></div>
                    <div>Email: <strong className="text-slate-300">{currentTournament.contactEmail || 'sportsgascidappadi@gmail.com'}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* Available Competitions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Available Competitions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a sport event to start your college registration.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  {competitions.length} Sport Events
                </span>
              </div>

              {competitions.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-300">No Competitions Added Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    The Sports Department is configuring competition events for this tournament. Please check back shortly!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {competitions.map(comp => {
                    const isUpcoming = comp.status === 'UPCOMING';
                    const isOpen = comp.status === 'OPEN';
                    const isClosed = comp.status === 'CLOSED';
                    const isFull = comp.status === 'FULL';
                    const isCompleted = comp.status === 'COMPLETED';

                    return (
                      <div
                        key={comp.id}
                        className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
                      >
                        {/* Competition Card Header & Badges */}
                        <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">
                                {comp.sportName}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-amber-500/20 uppercase">
                                {comp.competitionMode}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors">
                              {comp.name}
                            </h4>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${
                            isOpen
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : (isUpcoming
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : (isFull
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'))
                          }`}>
                            {isOpen ? 'OPEN' : (isUpcoming ? 'UPCOMING' : (isFull ? 'FULL' : 'CLOSED'))}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2 text-xs text-slate-400">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Gender / Category:</span>
                              <strong className="text-slate-200">{comp.gender}</strong>
                            </div>
                            {comp.competitionMode === 'TEAM' ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Required Players:</span>
                                  <strong className="text-slate-200">{comp.requiredPlayers} Players</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Substitutes:</span>
                                  <strong className="text-slate-200">{comp.substitutes} Players</strong>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Mode:</span>
                                <strong className="text-slate-200">Individual Athlete</strong>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Date:</span>
                              <strong className="text-slate-200">{new Date(comp.date).toLocaleDateString('en-IN')}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Venue:</span>
                              <strong className="text-slate-200 truncate max-w-[150px]">{comp.venue}</strong>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => startRegistrationForCompetition(comp)}
                            disabled={!isOpen}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                              isOpen
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <span>
                              {isOpen
                                ? 'Register Now'
                                : (isUpcoming
                                  ? 'Registration Not Started'
                                  : (isFull ? 'Registration Full' : 'Registration Closed'))}
                            </span>
                            {isOpen && <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.</p>
        <p className="mt-1">Sports Department Portal • Powered by Supabase Cloud</p>
      </footer>
    </div>
  );
};

export default OpenRegistrationPage;
