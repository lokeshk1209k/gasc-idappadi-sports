import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy, Calendar, MapPin, Clock, Users, User, Shield, AlertCircle,
  CheckCircle2, ArrowRight, ArrowLeft, Mail, Phone, Building, Send,
  RefreshCw, FileText, Plus, Trash2, Award, Info, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CompetitionData {
  id: string;
  name: string;
  tournamentName: string;
  sportName: string;
  participationType: string;
  competitionMode: 'INDIVIDUAL' | 'TEAM';
  gender: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  registrationEnd?: string;
  description?: string;
  rules?: string;
  bannerImage?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  requiredPlayers: number;
  substitutes: number;
  maxPlayers: number;
  maxColleges: number;
  maxTeams: number;
  status: string;
  isRegistrationOpen: boolean;
  isDeadlinePassed: boolean;
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

const InterCollegeRegisterPage: React.FC = () => {
  const { competitionToken } = useParams<{ competitionToken: string }>();
  const navigate = useNavigate();

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<CompetitionData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stepper State (1 to 5)
  const [step, setStep] = useState(1);

  // College Details Form
  const [collegeName, setCollegeName] = useState('');
  const [collegeAddress, setCollegeAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [collegePhone, setCollegePhone] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');

  // Team Details (if TEAM)
  const [teamName, setTeamName] = useState('');
  const [teamGender, setTeamGender] = useState('Boys');
  const [coachName, setCoachName] = useState('');
  const [coachPhone, setCoachPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);

  // Individual Details (if INDIVIDUAL)
  const [playerName, setPlayerName] = useState('');
  const [playerRegisterNumber, setPlayerRegisterNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('I Year');
  const [individualGender, setIndividualGender] = useState('Boys');
  const [supportingDocument, setSupportingDocument] = useState('');

  // Contact Details
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');

  // Player input buffer for dynamic team additions
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerReg, setNewPlayerReg] = useState('');
  const [newPlayerDept, setNewPlayerDept] = useState('');
  const [newPlayerYear, setNewPlayerYear] = useState('I Year');
  const [newPlayerGender, setNewPlayerGender] = useState('Boys');
  const [newPlayerRole, setNewPlayerRole] = useState('Player');

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch Competition by Token
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  useEffect(() => {
    const fetchCompetition = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // Try direct backend API first
        const res = await fetch(`/api/inter-college/competition/${competitionToken}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.competition) {
            setCompetition(json.competition);
            setTeamGender(json.competition.gender === 'All' ? 'Boys' : json.competition.gender);
            setIndividualGender(json.competition.gender === 'All' ? 'Boys' : json.competition.gender);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Continue to Supabase direct query fallback
      }

      // Supabase Direct Query & Static Fallback
      try {
        let data: any = null;
        const { data: dRules } = await supabase
          .from('competitions')
          .select('*')
          .ilike('rules', `%${competitionToken}%`)
          .maybeSingle();

        if (dRules) {
          data = dRules;
        } else {
          const { data: dId } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', competitionToken)
            .maybeSingle();
          if (dId) data = dId;
        }

        // Secondary fallback to static competitions.json
        if (!data) {
          try {
            const staticRes = await fetch('/competitions.json');
            if (staticRes.ok) {
              const staticJson = await staticRes.json();
              const list = staticJson.competitions || (Array.isArray(staticJson) ? staticJson : []);
              data = list.find((c: any) =>
                c.registration_token === competitionToken ||
                c.registrationToken === competitionToken ||
                c.id === competitionToken ||
                (c.rules && typeof c.rules === 'string' && c.rules.includes(competitionToken))
              );
            }
          } catch (e) {}
        }

        if (!data) {
          setErrorMsg('Invalid or expired competition link. Please check the QR code or contact GASC Sports Dept.');
          setLoading(false);
          return;
        }

        let extraConfig: any = {};
        if (data.rules && typeof data.rules === 'string' && data.rules.includes('{')) {
          try {
            const parsed = JSON.parse(data.rules);
            if (parsed.interCollegeConfig) extraConfig = parsed.interCollegeConfig;
          } catch(e) {}
        }

        const deadline = data.registration_end || data.registration_deadline || data.date;
        const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
        const isRegistrationOpen = data.external_registration_enabled !== false &&
          data.status !== 'Registration Closed' &&
          data.status !== 'Draft' &&
          !isDeadlinePassed;

        const mode = (extraConfig.competitionMode || data.competition_mode || (data.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase() as 'INDIVIDUAL' | 'TEAM';
        const reqPlayers = Number(extraConfig.requiredPlayers || data.required_players || (mode === 'TEAM' ? 11 : 1));
        const subPlayers = Number(extraConfig.substitutes !== undefined ? extraConfig.substitutes : (data.substitutes !== undefined ? data.substitutes : (mode === 'TEAM' ? 4 : 0)));

        setCompetition({
          id: data.id,
          name: data.name,
          tournamentName: data.tournament_name || data.name,
          sportName: data.sport_name || data.name,
          participationType: extraConfig.participationType || data.participation_type || 'INTER_COLLEGE',
          competitionMode: mode,
          gender: data.gender || 'All',
          date: data.date,
          venue: data.venue || 'GASC Idappadi Sports Ground',
          registrationEnd: deadline,
          description: data.description || '',
          rules: (data.rules && typeof data.rules === 'string' && data.rules.startsWith('{')) ? '' : (data.rules || ''),
          bannerImage: data.banner_image || '/images/sports/tournament.png',
          contactPerson: extraConfig.contactPerson || data.contact_person || 'Dr. R. ANITHA (Physical Director)',
          contactPhone: extraConfig.contactPhone || data.contact_phone || '+91 94432 18765',
          contactEmail: extraConfig.contactEmail || data.contact_email || 'sportsgascidappadi@gmail.com',
          requiredPlayers: reqPlayers,
          substitutes: subPlayers,
          maxPlayers: reqPlayers + subPlayers,
          maxColleges: extraConfig.maxColleges || data.max_colleges || 50,
          maxTeams: extraConfig.maxTeams || data.max_teams || 30,
          status: data.status || 'Registration Open',
          isRegistrationOpen,
          isDeadlinePassed,
          registrationToken: extraConfig.registrationToken || data.registration_token || competitionToken || ''
        });
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading competition details.');
      } finally {
        setLoading(false);
      }
    };

    if (competitionToken) {
      fetchCompetition();
    } else {
      setErrorMsg('No competition token provided.');
      setLoading(false);
    }
  }, [competitionToken]);

  // Handle adding team player
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      setFormError('Player name is required.');
      return;
    }
    if (!newPlayerReg.trim()) {
      setFormError('College register/roll number is required.');
      return;
    }
    if (!newPlayerDept.trim()) {
      setFormError('Department is required.');
      return;
    }

    if (players.some(p => p.registerNumber.toUpperCase() === newPlayerReg.trim().toUpperCase())) {
      setFormError(`Player with Register No "${newPlayerReg.toUpperCase()}" already added to squad.`);
      return;
    }

    const maxAllowed = competition ? competition.maxPlayers : 15;
    if (players.length >= maxAllowed) {
      setFormError(`Squad limit reached (${maxAllowed} players).`);
      return;
    }

    setPlayers([...players, {
      playerName: newPlayerName.trim(),
      registerNumber: newPlayerReg.trim().toUpperCase(),
      department: newPlayerDept.trim(),
      year: newPlayerYear,
      gender: newPlayerGender,
      role: newPlayerRole
    }]);

    // Reset buffer
    setNewPlayerName('');
    setNewPlayerReg('');
    setNewPlayerDept('');
    setNewPlayerRole('Player');
    setFormError(null);
  };

  // Remove player
  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  // Step Validation
  const handleNextStep = () => {
    setFormError(null);

    if (step === 1) {
      if (!competition?.isRegistrationOpen) {
        setFormError('Registration is currently closed for this competition.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      // Validate College details
      if (!collegeName.trim()) { setFormError('Please enter College Name'); return; }
      if (!collegeAddress.trim()) { setFormError('Please enter College Address'); return; }
      if (!district.trim()) { setFormError('Please enter College District'); return; }
      if (!state.trim()) { setFormError('Please enter College State'); return; }
      setStep(3);
      return;
    }

    if (step === 3) {
      // Validate Player / Team details
      if (competition?.competitionMode === 'INDIVIDUAL') {
        if (!playerName.trim()) { setFormError('Please enter Player Name'); return; }
        if (!playerRegisterNumber.trim()) { setFormError('Please enter College Register / Roll Number'); return; }
        if (!department.trim()) { setFormError('Please enter Department'); return; }
      } else {
        // Team mode
        if (!teamName.trim()) { setFormError('Please enter Team Name'); return; }
        const req = competition?.requiredPlayers || 1;
        if (players.length < req) {
          setFormError(`Please add at least ${req} squad players according to tournament rules (Currently: ${players.length}).`);
          return;
        }
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      // Validate Contact
      if (!participantEmail.trim() || !participantEmail.includes('@')) {
        setFormError('Please enter a valid participant email address.');
        return;
      }
      if (!participantPhone.trim() || participantPhone.length < 10) {
        setFormError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setStep(5);
      // Auto trigger OTP send if not already sent
      if (!otpSent) {
        handleSendOtp();
      }
      return;
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    setOtpSending(true);
    setFormError(null);

    try {
      const res = await fetch('/api/inter-college/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail.trim(),
          competitionToken,
          collegeName: collegeName.trim(),
          participantName: competition?.competitionMode === 'INDIVIDUAL' ? playerName.trim() : (coachName || managerName || teamName)
        })
      });

      const json = await res.json();
      if (json.success) {
        setOtpSent(true);
        setOtpToken(json.otpToken);
        setMaskedEmail(json.maskedEmail || participantEmail);
        setOtpCooldown(60); // 60s cooldown
      } else {
        setFormError(json.message || 'Failed to dispatch verification OTP.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error sending OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setFormError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setOtpVerifying(true);
    setFormError(null);

    try {
      const res = await fetch('/api/inter-college/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail.trim(),
          otp: otpCode.trim(),
          otpToken
        })
      });

      const json = await res.json();
      if (json.success) {
        setOtpVerified(true);
      } else {
        setFormError(json.message || 'Incorrect OTP code. Please verify and retry.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error verifying OTP.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Final Submit Registration
  const handleSubmitRegistration = async () => {
    if (!otpVerified) {
      setFormError('Please complete email OTP verification before submitting.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      competitionToken,
      collegeName: collegeName.trim(),
      collegeAddress: collegeAddress.trim(),
      district: district.trim(),
      state: state.trim(),
      collegePhone: collegePhone.trim() || undefined,
      collegeEmail: collegeEmail.trim() || undefined,
      registrationType: competition?.competitionMode || 'INDIVIDUAL',
      sportName: competition?.sportName || competition?.name,
      gender: competition?.competitionMode === 'INDIVIDUAL' ? individualGender : teamGender,
      teamName: teamName.trim() || undefined,
      coachName: coachName.trim() || undefined,
      coachPhone: coachPhone.trim() || undefined,
      managerName: managerName.trim() || undefined,
      managerPhone: managerPhone.trim() || undefined,
      playerName: playerName.trim() || undefined,
      playerRegisterNumber: playerRegisterNumber.trim().toUpperCase() || undefined,
      department: department.trim() || undefined,
      year,
      participantEmail: participantEmail.trim().toLowerCase(),
      participantPhone: participantPhone.trim(),
      supportingDocument: supportingDocument.trim() || undefined,
      players: competition?.competitionMode === 'TEAM' ? players : undefined,
      otpVerified: true
    };

    try {
      const res = await fetch('/api/inter-college/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success && json.registrationId) {
        // Registration success! Navigate to receipt screen
        navigate(`/inter-college/success/${json.registrationId}`, {
          state: { registration: json.registration, competition }
        });
      } else {
        setFormError(json.message || 'Registration failed. Please check errors.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error submitting registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-200">Loading Competition Registration...</h3>
        <p className="text-sm text-slate-400 mt-1">Verifying official QR code certificate</p>
      </div>
    );
  }

  if (errorMsg || !competition) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            {errorMsg || 'The competition registration link you scanned is invalid, cancelled, or no longer accepting submissions.'}
          </p>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-400 text-left mb-6">
            <p className="font-semibold text-slate-300 mb-1">🏛️ Need Help?</p>
            <p>Please contact Government Arts and Science College, Idappadi Sports Department or ask your college physical director.</p>
          </div>
          <Link
            to="/inter-college"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30"
          >
            <Trophy className="w-4 h-4" /> View All Inter-College Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ── Top Header Brand ── */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center p-1.5 overflow-hidden">
              <img
                src="/images/college-logo.png"
                alt="GASC"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-400 tracking-wider uppercase">GASC IDAPPADI</div>
              <h1 className="text-sm font-extrabold text-white leading-tight">Inter-College Registration</h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Official Registration
          </span>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* Stepper Indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 w-full z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />

            {[
              { num: 1, label: 'Overview' },
              { num: 2, label: 'College' },
              { num: 3, label: competition.competitionMode === 'TEAM' ? 'Team' : 'Player' },
              { num: 4, label: 'Contact' },
              { num: 5, label: 'Verify OTP' }
            ].map(s => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border-2 ${
                    step === s.num
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/40 scale-110'
                      : step > s.num
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[11px] mt-1.5 font-medium hidden sm:block ${step === s.num ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-300 font-medium">{formError}</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 1: COMPETITION DETAILS OVERVIEW
           ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Banner Image */}
            <div className="relative aspect-video sm:aspect-[21/9] w-full overflow-hidden bg-slate-950">
              <img
                src={competition.bannerImage}
                alt={competition.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/sports/tournament.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white uppercase tracking-wider">
                    {competition.sportName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {competition.competitionMode} MODE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Category: {competition.gender}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {competition.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Hosted by: Government Arts and Science College, Idappadi
                </p>
              </div>
            </div>

            {/* Key Information Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Event Date</div>
                    <div className="text-sm font-bold text-white">
                      {new Date(competition.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Venue</div>
                    <div className="text-sm font-bold text-white truncate max-w-[140px] sm:max-w-none" title={competition.venue}>
                      {competition.venue}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Deadline</div>
                    <div className="text-sm font-bold text-white">
                      {competition.registrationEnd ? new Date(competition.registrationEnd).toLocaleDateString('en-IN') : 'TBD'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Format</div>
                    <div className="text-sm font-bold text-white">
                      {competition.competitionMode === 'TEAM'
                        ? `${competition.requiredPlayers} Players (+${competition.substitutes} Sub)`
                        : 'Single Athlete'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Alert if closed */}
              {!competition.isRegistrationOpen && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">Registration is Closed</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {competition.isDeadlinePassed
                        ? 'The official registration deadline has passed for this championship.'
                        : 'Registration for this event is currently disabled by the Sports Board.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Description & Rules */}
              {competition.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Tournament</h4>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    {competition.description}
                  </p>
                </div>
              )}

              {competition.rules && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rules & Guidelines</h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    {competition.rules}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">GASC Sports Incharge</div>
                    <div className="text-sm font-bold text-white">{competition.contactPerson}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {competition.contactPhone && (
                    <a href={`tel:${competition.contactPhone}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                      <Phone className="w-3.5 h-3.5" /> {competition.contactPhone}
                    </a>
                  )}
                  {competition.contactEmail && (
                    <a href={`mailto:${competition.contactEmail}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                      <Mail className="w-3.5 h-3.5" /> {competition.contactEmail}
                    </a>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!competition.isRegistrationOpen}
                  onClick={handleNextStep}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl ${
                    competition.isRegistrationOpen
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {competition.isRegistrationOpen ? (
                    <>
                      <span>PROCEED TO REGISTRATION</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <span>REGISTRATION CLOSED</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2: COLLEGE DETAILS
           ══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Step 2 of 5</span>
              <h2 className="text-2xl font-bold text-white mt-1">College Information</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter official details of the institution representing this competition.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  College Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Government Arts College, Salem"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  College Address <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Full postal address with pincode"
                  value={collegeAddress}
                  onChange={(e) => setCollegeAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    District <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salem, Namakkal, Dharmapuri"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    College Office Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Landline / Official contact"
                    value={collegePhone}
                    onChange={(e) => setCollegePhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    College Official Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="sports@yourcollege.ac.in"
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
              >
                Continue to {competition.competitionMode === 'TEAM' ? 'Team Details' : 'Player Details'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3: PLAYER / TEAM DETAILS
           ══════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Step 3 of 5</span>
              <h2 className="text-2xl font-bold text-white mt-1">
                {competition.competitionMode === 'TEAM' ? 'Team & Squad Roster' : 'Athlete Details'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {competition.competitionMode === 'TEAM'
                  ? `Enter team name, officials, and add ${competition.requiredPlayers} playing members.`
                  : 'Enter participant student details from college roll.'}
              </p>
            </div>

            {/* ── MODE: INDIVIDUAL ATHLETE ── */}
            {competition.competitionMode === 'INDIVIDUAL' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Player Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name as in College ID"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      College Register / Roll Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 23UGCS101"
                      value={playerRegisterNumber}
                      onChange={(e) => setPlayerRegisterNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 uppercase transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Department <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Year of Study <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="I Year">I Year</option>
                      <option value="II Year">II Year</option>
                      <option value="III Year">III Year</option>
                      <option value="PG I Year">PG I Year</option>
                      <option value="PG II Year">PG II Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Gender <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={individualGender}
                      onChange={(e) => setIndividualGender(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="Boys">Boys / Men</option>
                      <option value="Girls">Girls / Women</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Accompanying Coach / PD Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prof. Murugan K"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Coach Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={coachPhone}
                      onChange={(e) => setCoachPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Supporting Document / Bonafide URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or document link"
                    value={supportingDocument}
                    onChange={(e) => setSupportingDocument(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Bonafide certificate or college sports seal letter (can also be produced at venue).
                  </span>
                </div>
              </div>
            ) : (
              /* ── MODE: TEAM SPORT ── */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Team Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Salem GAC Lions Cricket XI"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Team Category / Gender <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={teamGender}
                      onChange={(e) => setTeamGender(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="Boys">Boys / Men Team</option>
                      <option value="Girls">Girls / Women Team</option>
                      <option value="Mixed">Mixed Team</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Coach Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Coach Ramesh"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Coach Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={coachPhone}
                      onChange={(e) => setCoachPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Team Manager Name
                    </label>
                    <input
                      type="text"
                      placeholder="Physical Director / Faculty Manager"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Manager Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98421 12345"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* ── Dynamic Player Squad Builder ── */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        Team Squad Roster
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span>Required: <strong className="text-white">{competition.requiredPlayers}</strong></span>
                        <span>Selected: <strong className={players.length >= competition.requiredPlayers ? 'text-emerald-400' : 'text-amber-400'}>{players.length}</strong></span>
                        <span>Substitutes: <strong className="text-slate-300">{competition.substitutes}</strong></span>
                        <span>Maximum: <strong className="text-slate-300">{competition.maxPlayers}</strong></span>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      players.length >= competition.requiredPlayers
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {players.length >= competition.requiredPlayers
                        ? `✓ Required Met (${players.length}/${competition.requiredPlayers})`
                        : `Need ${competition.requiredPlayers - players.length} More Player(s)`}
                    </span>
                  </div>

                  {/* Add Player Input Box */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 mb-4">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Add Player #{players.length + 1}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Player Name *"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Register / Roll No *"
                        value={newPlayerReg}
                        onChange={(e) => setNewPlayerReg(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Department *"
                        value={newPlayerDept}
                        onChange={(e) => setNewPlayerDept(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={newPlayerYear}
                        onChange={(e) => setNewPlayerYear(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="I Year">I Year</option>
                        <option value="II Year">II Year</option>
                        <option value="III Year">III Year</option>
                        <option value="PG I Year">PG I Year</option>
                      </select>
                      <select
                        value={newPlayerRole}
                        onChange={(e) => setNewPlayerRole(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Player">Player</option>
                        <option value="Captain">Captain (C)</option>
                        <option value="Vice Captain">Vice Captain (VC)</option>
                        <option value="Goalkeeper / Raider / Wicketkeeper">Specialist</option>
                        <option value="Substitute">Substitute</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddPlayer}
                        className="py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Player to Squad
                      </button>
                    </div>
                  </div>

                  {/* Players Table / List */}
                  {players.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Player Name</th>
                            <th className="py-2.5 px-3">Reg No</th>
                            <th className="py-2.5 px-3">Dept & Year</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                          {players.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-white">{p.playerName}</td>
                              <td className="py-2.5 px-3 font-mono text-blue-400">{p.registerNumber}</td>
                              <td className="py-2.5 px-3">{p.department} ({p.year})</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.role === 'Captain'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : p.role === 'Vice Captain'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {p.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlayer(idx)}
                                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                                  title="Remove player"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                      No players added yet. Use the form above to add squad members.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
              >
                Continue to Contact Verification <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 4: CONTACT DETAILS
           ══════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Step 4 of 5</span>
              <h2 className="text-2xl font-bold text-white mt-1">Official Contact Information</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter the verified email address and mobile number where OTP code and official decisions will be sent.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Participant / Incharge Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="official.sports@yourcollege.ac.in or personal email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  A 6-digit OTP will be dispatched to this email for instant verification.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Mobile Number (WhatsApp Enabled) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={participantPhone}
                    onChange={(e) => setParticipantPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300">No Account Created:</strong> External college participants do not require passwords or portal user accounts. Your email is only used for OTP security, registration ID issuance, and tournament match notifications.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
              >
                Request Email OTP <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 5: OTP VERIFICATION & FINAL SUBMISSION
           ══════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Step 5 of 5</span>
              <h2 className="text-2xl font-bold text-white mt-1">Email OTP Verification</h2>
              <p className="text-xs text-slate-400 mt-1">
                A 6-digit one-time verification password was dispatched to <strong className="text-slate-200">{maskedEmail || participantEmail}</strong>.
              </p>
            </div>

            <div className="max-w-md mx-auto py-4 text-center">
              {!otpVerified ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-3xl font-mono tracking-[12px] py-4 rounded-xl bg-slate-950 border-2 border-blue-500/50 text-blue-400 focus:outline-none focus:border-blue-400 shadow-inner"
                    />
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      Code is valid for 10 minutes. Please check your Inbox and Spam folder.
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={otpVerifying || otpCode.length !== 6}
                      onClick={handleVerifyOtp}
                      className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        otpCode.length === 6 && !otpVerifying
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {otpVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Verify OTP Code
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={otpSending || otpCooldown > 0}
                      onClick={handleSendOtp}
                      className={`w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                        otpCooldown > 0 || otpSending
                          ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 cursor-pointer'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              ) : (
                /* OTP Verified state -> Ready to Submit */
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400">Email Verified Successfully!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Your identity and contact email are verified. Click below to submit your official registration.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 text-left text-xs space-y-2 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Competition:</span>
                      <strong className="text-white">{competition.name}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">College:</span>
                      <span className="font-semibold text-slate-200">{collegeName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Category:</span>
                      <span>{competition.competitionMode} ({competition.gender})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Participant:</span>
                      <span className="font-semibold text-white">
                        {competition.competitionMode === 'INDIVIDUAL' ? playerName : teamName}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitRegistration}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/30 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> Submitting Registration...
                      </>
                    ) : (
                      <>
                        <Award className="w-5 h-5" /> CONFIRM & COMPLETE REGISTRATION
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Change Email
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.</p>
        <p className="mt-1">Sports Department Portal • Powered by Supabase Cloud</p>
      </footer>
    </div>
  );
};

export default InterCollegeRegisterPage;
