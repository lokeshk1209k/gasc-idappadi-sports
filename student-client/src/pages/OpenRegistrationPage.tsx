import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Trophy, Calendar, MapPin, Users, User, Shield, AlertCircle,
  CheckCircle2, ArrowRight, ArrowLeft, Mail, Phone, Building,
  RefreshCw, FileText, Plus, Trash2, Award, Clock, Sparkles,
  ExternalLink, Printer, Download, Check, QrCode, Copy, CreditCard, Lock, Upload, Image
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface VerifiedPaymentData {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  method?: string;
  receiptNumber?: string;
}

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
  entryFee?: number;
  hasPayment?: boolean;
  isPaid?: boolean;
  competitionsCount?: number;
}

interface PaymentSettingsData {
  receiverName: string;
  gpayNumber: string;
  upiId: string;
  qrCodeUrl: string;
  instructions: string;
  paymentMode: string;
  isEnabled: boolean;
  teamFee: number;
  individualFee: number;
  configVersion: number;
  validFrom?: string | null;
  validUntil?: string | null;
}

interface CompetitionItem {
  id: string;
  name: string;
  tournamentName: string;
  tournamentId: string;
  sportName: string;
  eventName: string;
  category?: 'Men' | 'Women' | 'Mixed' | string;
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
  entryFee?: number;
  feeType?: string;
  hasPayment?: boolean;
  isPaid?: boolean;
  ourCollegeFeeEnabled?: boolean;
  ourCollegeFee?: number;
  otherCollegeFeeEnabled?: boolean;
  otherCollegeFee?: number;
  upiId?: string;
  gpayNumber?: string;
  receiverName?: string;
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
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || searchParams.get('t') || searchParams.get('tokenSlug');
  const tournamentToken = params.tournamentToken || params.competitionToken || queryToken;

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

  // Dynamic Payment Settings & Verification State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsData | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [paymentAgreed, setPaymentAgreed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentConfigMismatch, setPaymentConfigMismatch] = useState<string | null>(null);
  const [submittedPaymentData, setSubmittedPaymentData] = useState<{
    utr: string;
    amount: number;
    status: string;
    method: string;
  } | null>(null);

  // Online Razorpay Payment States
  const [paymentModeTab, setPaymentModeTab] = useState<'GATEWAY' | 'MANUAL_UPI'>('GATEWAY');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<VerifiedPaymentData | null>(null);
  const [activeOrderData, setActiveOrderData] = useState<any>(null);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [simulatedPaying, setSimulatedPaying] = useState(false);

  // Helper: Load Razorpay Checkout SDK Script Dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Helper: Fetch dynamic payment settings from serverless / local server
  const fetchPaymentSettings = async (silent = false): Promise<PaymentSettingsData | null> => {
    if (!silent) setPaymentLoading(true);
    try {
      let res = await fetch('/api/open-registration/payment-settings');
      let data = await res.json().catch(() => null);
      if (!data || !data.success) {
        res = await fetch('/api/inter-college/payment-settings');
        data = await res.json().catch(() => null);
      }
      if (data && data.success && data.settings) {
        setPaymentSettings(data.settings);
        return data.settings as PaymentSettingsData;
      }
    } catch (e) {
      console.warn('Failed to fetch payment settings:', e);
    } finally {
      if (!silent) setPaymentLoading(false);
    }
    return null;
  };

  // Helper: Get payable fee for current competition (External / Other College Students)
  const getPayableFee = (): number => {
    if (!selectedComp) return 0;

    // 1. Independent fee setting for Other College Students on Competition
    if (selectedComp.otherCollegeFeeEnabled !== undefined && selectedComp.otherCollegeFeeEnabled !== null) {
      if (!selectedComp.otherCollegeFeeEnabled) return 0;
      return Math.max(0, Number(selectedComp.otherCollegeFee !== undefined ? selectedComp.otherCollegeFee : (selectedComp.entryFee || 0)));
    }

    // 2. Independent fee setting for Other College Students on Parent Tournament
    if (currentTournament && (currentTournament as any).otherCollegeFeeEnabled !== undefined && (currentTournament as any).otherCollegeFeeEnabled !== null) {
      if (!(currentTournament as any).otherCollegeFeeEnabled) return 0;
      return Math.max(0, Number((currentTournament as any).otherCollegeFee !== undefined ? (currentTournament as any).otherCollegeFee : (currentTournament.entryFee || 0)));
    }

    // 3. Explicit Free checks on Competition or Parent Tournament
    if (selectedComp.entryFee === 0 || selectedComp.hasPayment === false || selectedComp.isPaid === false) {
      return 0;
    }
    if (currentTournament && (currentTournament.entryFee === 0 || currentTournament.hasPayment === false || currentTournament.isPaid === false)) {
      return 0;
    }

    // 4. Explicit fee configured on Competition
    if (selectedComp.entryFee !== undefined && selectedComp.entryFee !== null && Number(selectedComp.entryFee) > 0) {
      return Number(selectedComp.entryFee);
    }

    // 5. Explicit fee configured on Parent Tournament
    if (currentTournament && currentTournament.entryFee !== undefined && currentTournament.entryFee !== null && Number(currentTournament.entryFee) > 0) {
      return Number(currentTournament.entryFee);
    }

    // 6. If tournament or competition is explicitly marked as paid without fixed fee amount
    if (selectedComp.hasPayment === true || selectedComp.isPaid === true || (currentTournament && (currentTournament.hasPayment === true || currentTournament.isPaid === true))) {
      if (paymentSettings) {
        return selectedComp.competitionMode === 'TEAM'
          ? Number(paymentSettings.teamFee || 500)
          : Number(paymentSettings.individualFee || 100);
      }
      return selectedComp.competitionMode === 'TEAM' ? 500 : 100;
    }

    // 7. Default: If payment is enabled globally and not explicitly disabled on the tournament
    if (paymentSettings && paymentSettings.isEnabled && currentTournament?.hasPayment !== false && selectedComp.hasPayment !== false) {
      return selectedComp.competitionMode === 'TEAM'
        ? Number(paymentSettings.teamFee || 500)
        : Number(paymentSettings.individualFee || 100);
    }

    return 0;
  };

  // Helper: Copy string to clipboard with visual feedback
  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // Helper: Process screenshot image file into Base64
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Payment screenshot size must be less than 5MB.');
      return;
    }
    setScreenshotUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentScreenshot(reader.result as string);
      setScreenshotUploading(false);
    };
    reader.onerror = () => {
      alert('Error reading screenshot image.');
      setScreenshotUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Load payment settings on initial mount
  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  // OTP Timer countdown
  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Only fetch Tournaments Directory if NO tournamentToken is provided in URL
  useEffect(() => {
    if (!tournamentToken) {
      const fetchTournaments = async () => {
        setListLoading(true);
        try {
          let res = await fetch('/api/open-registration/tournaments');
          let data = await res.json().catch(() => null);
          if (!data || !data.success) {
            res = await fetch('/api/inter-college/tournaments');
            data = await res.json().catch(() => null);
          }
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
        setCurrentTournament(null);
        setCompetitions([]);
        try {
          let res = await fetch(`/api/open-registration/tournament/${encodeURIComponent(tournamentToken)}`);
          let data = await res.json().catch(() => null);
          if (!data || !data.success) {
            res = await fetch(`/api/open-registration/tournament?token=${encodeURIComponent(tournamentToken)}`);
            data = await res.json().catch(() => null);
          }
          if (!data || !data.success) {
            res = await fetch(`/api/inter-college/tournament?token=${encodeURIComponent(tournamentToken)}`);
            data = await res.json().catch(() => null);
          }
          if (data && data.success && data.tournament) {
            setCurrentTournament(data.tournament);
            const compsList: CompetitionItem[] = data.competitions || [];
            setCompetitions(compsList);

            // Only auto-open direct registration form if ?register=true is explicitly passed in URL;
            // Otherwise, keep selectedComp null so the complete Tournament Page overview is displayed!
            const shouldAutoRegister = typeof window !== 'undefined' && window.location.search.includes('register=true');
            if (shouldAutoRegister) {
              const targetComp = compsList.find(c =>
                (data.activeCompetitionId && c.id === data.activeCompetitionId) ||
                c.id === tournamentToken ||
                c.registrationToken === tournamentToken ||
                (c.rules && typeof c.rules === 'string' && c.rules.includes(tournamentToken))
              );
              if (targetComp && targetComp.status === 'OPEN') {
                startRegistrationForCompetition(targetComp);
              }
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
    setTransactionRef('');
    setPaymentScreenshot(null);
    setPaymentAgreed(false);
    setPaymentConfigMismatch(null);
    setSubmittedPaymentData(null);
    fetchPaymentSettings(true);

    // If Team event, initialize required players list
    const compCat = comp.category || comp.gender || 'Men';
    const normCat = /^girls?|^women$/i.test(compCat) ? 'Women' : (/^mixed|^all$/i.test(compCat) ? 'Mixed' : 'Men');

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
          gender: normCat === 'Women' ? 'Women' : 'Men',
          role: i === 0 ? 'Captain' : (i === 1 ? 'Vice Captain' : (isSub ? 'Substitute' : 'Player'))
        });
      }
      setPlayers(initialRoster);
      setTeamGender(normCat);
    } else {
      setIndividualGender(normCat);
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
    setPaymentConfigMismatch(null);

    const fee = getPayableFee();
    const cleanUtr = transactionRef.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Validate payment credentials if fee is applicable
    if (fee > 0 && paymentSettings && paymentSettings.isEnabled) {
      if (!cleanUtr || cleanUtr.length < 10) {
        setFormError('Please enter a valid 12-digit UPI / GPay Transaction Reference (UTR) number from your transfer receipt.');
        return;
      }
      if (!paymentAgreed) {
        setFormError('Please tick the confirmation checkbox to declare that you have transferred the entry fee and provided a genuine 12-digit UTR.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Re-fetch latest payment settings dynamically before submitting to ensure no mid-flight config changes
      let latestConfig = await fetchPaymentSettings(true);
      if (latestConfig && paymentSettings) {
        if (latestConfig.configVersion !== paymentSettings.configVersion) {
          setPaymentSettings(latestConfig);
          setPaymentConfigMismatch('Notice: The Sports Admin updated the payment details (UPI/GPay). Please verify your transfer against the updated receiver details shown above.');
          setFormError('Payment settings were updated by the administrator during your session. Please verify the updated payment receiver details before submitting.');
          setSubmitting(false);
          return;
        }
        if (!latestConfig.isEnabled && fee > 0) {
          setFormError('Registration fee payment is currently disabled or temporarily paused by the Sports Department. Please contact the administrator.');
          setSubmitting(false);
          return;
        }
      }

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
        otpVerified: true,

        // Payment Details (Dynamic GPay / UPI)
        entryFee: fee,
        feeAmount: fee,
        paymentMethod: 'UPI',
        transactionRef: cleanUtr || null,
        paymentScreenshot: paymentScreenshot || null,
        paymentConfigVersion: latestConfig?.configVersion || paymentSettings?.configVersion || 1
      };

      const res = await fetch('/api/open-registration/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Server communication error.' }));

      // Handle duplicate UTR error explicitly
      if (res.status === 409 || data.code === 'DUPLICATE_UTR' || (data.message && data.message.toLowerCase().includes('already registered'))) {
        setFormError(data.message || 'Duplicate UTR Detected: This Transaction Reference (UTR) has already been submitted for another registration. Please double check your GPay/UPI transfer receipt.');
        setSubmitting(false);
        return;
      }

      if (data.success && data.registrationId) {
        setSubmittedRegId(data.registrationId);
        setSubmittedPaymentData({
          utr: cleanUtr,
          amount: fee,
          status: 'PENDING_VERIFICATION',
          method: 'UPI'
        });
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

  // Online Payment: Verify server signature and confirm entry
  const handleVerifyOnlinePayment = async (orderId: string, paymentId: string, signature: string) => {
    if (!selectedComp || !currentTournament) return;
    setIsProcessingPayment(true);
    setFormError(null);

    const fee = getPayableFee();

    const payload = {
      orderId,
      paymentId,
      signature,
      competitionToken: selectedComp.registrationToken || selectedComp.id,
      tournamentToken: currentTournament.registrationToken || currentTournament.id,
      competitionId: selectedComp.id,
      tournamentId: currentTournament.id,
      tournamentName: currentTournament.name,
      sportName: selectedComp.sportName,
      eventName: selectedComp.eventName || selectedComp.name,
      registrationType: selectedComp.competitionMode,

      collegeName: collegeName.trim(),
      collegeAddress: collegeAddress.trim(),
      district: district.trim(),
      state: state.trim(),
      collegePhone: collegePhone.trim(),
      collegeEmail: collegeEmail.trim(),

      teamName: selectedComp.competitionMode === 'TEAM' ? teamName.trim() : null,
      teamGender: selectedComp.competitionMode === 'TEAM' ? teamGender : null,
      coachName: coachName.trim(),
      coachPhone: coachPhone.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),

      playerName: selectedComp.competitionMode === 'INDIVIDUAL' ? playerName.trim() : null,
      playerRollNumber: selectedComp.competitionMode === 'INDIVIDUAL' ? playerRollNumber.trim() : null,
      department: selectedComp.competitionMode === 'INDIVIDUAL' ? department.trim() : null,
      year: selectedComp.competitionMode === 'INDIVIDUAL' ? year : null,
      gender: selectedComp.competitionMode === 'INDIVIDUAL' ? individualGender : teamGender,

      participantEmail: participantEmail.trim(),
      participantPhone: participantPhone.trim(),
      players: selectedComp.competitionMode === 'TEAM' ? players : [],
      otpToken,
      entryFee: fee
    };

    try {
      let res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json().catch(() => null);

      if (!data || !data.success) {
        res = await fetch('/api/open-registration/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await res.json().catch(() => null);
      }

      if (data && data.success && data.verified) {
        setSubmittedRegId(data.registrationId);
        setVerifiedPaymentData({
          paymentId: data.paymentId || paymentId,
          orderId: data.orderId || orderId,
          amount: fee,
          currency: 'INR',
          status: 'SUCCESS',
          date: new Date().toISOString(),
          receiptNumber: data.receiptNumber || `RCP-${Date.now().toString().slice(-6)}`
        });
        setShowSandboxModal(false);
        setStep(7);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError(data?.message || 'Payment verification failed on the server. If your money was deducted, please contact the physical education department with your payment ID.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Payment verification server error.');
    } finally {
      setIsProcessingPayment(false);
      setSimulatedPaying(false);
    }
  };

  // Online Payment: Create order and open Razorpay checkout
  const handleProceedToOnlinePayment = async () => {
    if (!selectedComp || !currentTournament) return;
    setFormError(null);
    setIsProcessingPayment(true);

    const fee = getPayableFee();

    // If free registration, directly submit
    if (fee <= 0) {
      await handleSubmitRegistration();
      setIsProcessingPayment(false);
      return;
    }

    try {
      const orderPayload = {
        competitionId: selectedComp.id,
        tournamentId: currentTournament.id,
        registrationType: selectedComp.competitionMode,
        studentName: selectedComp.competitionMode === 'INDIVIDUAL' ? playerName.trim() : teamName.trim(),
        collegeName: collegeName.trim(),
        email: participantEmail.trim(),
        phone: participantPhone.trim()
      };

      let res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      let data = await res.json().catch(() => null);

      if (!data || !data.success) {
        res = await fetch('/api/open-registration/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        data = await res.json().catch(() => null);
      }

      if (!data || !data.success) {
        setFormError(data?.message || 'Could not initiate payment order from server.');
        setIsProcessingPayment(false);
        return;
      }

      setActiveOrderData(data);

      // Check if running in simulator mode (e.g. initial setup before keys configured in .env)
      if (data.isSandbox && (!data.keyId || data.keyId.includes('simulator') || !window.Razorpay)) {
        setFormError('Online gateway is temporarily unavailable. Please use the direct Google Pay / PhonePe UPI transfer option below.');
        setIsProcessingPayment(false);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        setFormError('Payment gateway checkout could not be loaded. Please use the direct Google Pay / PhonePe UPI transfer option below.');
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Government Arts and Science College, Idappadi',
        description: `Entry Fee: ${selectedComp.name} (${selectedComp.competitionMode})`,
        image: '/images/college-logo.png',
        order_id: data.orderId,
        prefill: {
          name: selectedComp.competitionMode === 'INDIVIDUAL' ? playerName.trim() : teamName.trim(),
          email: participantEmail.trim(),
          contact: participantPhone.trim()
        },
        notes: {
          college: collegeName.trim(),
          competition: selectedComp.name,
          tournament: currentTournament.name
        },
        theme: {
          color: '#2563eb'
        },
        handler: function (response: any) {
          handleVerifyOnlinePayment(
            response.razorpay_order_id || data.orderId,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setFormError(response.error?.description || 'Payment failed at gateway.');
        setIsProcessingPayment(false);
      });
      rzp.open();
    } catch (err: any) {
      setFormError(err.message || 'Payment initiation error.');
      setIsProcessingPayment(false);
    }
  };


  // =========================================================================
  // VIEW A: GENERAL TOURNAMENTS DIRECTORY (Only when /open-registration has NO token)
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
        ) : (loadError || !currentTournament) ? (
          /* Error State: Invalid, expired, or unpublished tournament */
          <div className="max-w-xl mx-auto py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400 shadow-lg shadow-red-500/5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Tournament Not Found or Expired</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {loadError || 'The registration link or QR code you followed is invalid, has expired, or is currently unpublished.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Please contact the Department of Physical Education, Government Arts and Science College, Idappadi.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/open-registration"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <span>Browse Open Tournaments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                GASC Home
              </Link>
            </div>
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
                { s: 6, label: 'Review & Pay' },
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

              {/* STEP 6: Review & Payment Before Submission */}
              {step === 6 && (
                <div className="space-y-6">
                  {/* Step Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" /> Review & Payment Details
                    </h4>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Email Verified
                    </span>
                  </div>

                  {/* Summary Details */}
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

                  {/* Config Mismatch Notice if updated mid-flight */}
                  {paymentConfigMismatch && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{paymentConfigMismatch}</span>
                    </div>
                  )}

                  {/* Payment Mode Selector & Details */}
                  {(() => {
                    const payableFee = getPayableFee();
                    const activeUpiId = (selectedComp?.upiId || currentTournament?.upiId || paymentSettings?.upiId || 'sportsgascidappadi@sbi').trim();
                    const activeGpayNumber = (selectedComp?.gpayNumber || currentTournament?.gpayNumber || paymentSettings?.gpayNumber || '9443218765').trim();
                    const activeReceiverName = (selectedComp?.receiverName || currentTournament?.receiverName || paymentSettings?.receiverName || 'Physical Education Dept, GASC Idappadi').trim();
                    const upiPayUri = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(activeReceiverName)}&am=${payableFee}&cu=INR&tn=${encodeURIComponent(`GASC Sports - ${selectedComp?.name || 'Tournament'}`)}`;
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiPayUri)}`;
                    const cleanUtr = transactionRef.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

                    return (
                      <div className="bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-blue-500/30 rounded-2xl p-5 space-y-6 shadow-2xl">
                        {/* Header Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                Tournament Entry Fee & Payment
                              </h4>
                              <p className="text-[11px] text-slate-400">Official Physical Education Department Account</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-600/20 text-blue-400 border border-blue-500/40">
                              Entry Fee: ₹{payableFee} INR
                            </span>
                            {payableFee > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Mandatory Fee
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                Free Entry
                              </span>
                            )}
                          </div>
                        </div>

                        {payableFee > 0 ? (
                          <div className="space-y-6">
                            {/* SECTION 1: ONE-TAP GPAY / PHONEPE LAUNCH (Mobile) */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/60 border border-emerald-500/40 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                  <span>📱</span> Instant Mobile Payment
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">GPay • PhonePe • Paytm • BHIM</span>
                              </div>

                              <a
                                href={upiPayUri}
                                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 transition-all text-center group cursor-pointer"
                              >
                                <span className="text-xl">⚡</span>
                                <span>Pay ₹{payableFee} via Google Pay / UPI App</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </a>
                              <p className="text-[11px] text-slate-400 text-center">
                                Tapping the button above will directly launch Google Pay or your UPI app on your phone with ₹{payableFee} and recipient details pre-filled.
                              </p>
                            </div>

                            {/* SECTION 2: QR CODE SCAN & UPI DETAILS (For Laptop or Other Device) */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <QrCode className="w-4 h-4 text-blue-400" /> Or Scan QR Code / Transfer Directly
                                </span>
                                <span className="text-[11px] font-mono text-emerald-400 font-bold">₹{payableFee} INR</span>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-5">
                                {/* Dynamic QR Code */}
                                <div className="shrink-0 text-center space-y-1.5">
                                  <div className="p-2 bg-white rounded-xl shadow-lg inline-block border-2 border-emerald-500/30">
                                    <img
                                      src={qrCodeUrl}
                                      alt="Tournament UPI Payment QR Code"
                                      className="w-36 h-36 object-contain"
                                    />
                                  </div>
                                  <span className="block text-[10px] text-slate-400 font-medium">Scan with any UPI App</span>
                                </div>

                                {/* Payment Receiver Credentials */}
                                <div className="flex-1 w-full space-y-2.5 text-xs">
                                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Authorized Payee</span>
                                      <span className="text-white font-bold">{activeReceiverName}</span>
                                    </div>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                                    <div className="overflow-hidden">
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block">UPI ID / VPA</span>
                                      <span className="text-emerald-400 font-mono font-bold truncate block">{activeUpiId}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(activeUpiId, 'upi')}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors"
                                    >
                                      {copiedKey === 'upi' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedKey === 'upi' ? 'Copied' : 'Copy UPI'}</span>
                                    </button>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Google Pay Number</span>
                                      <span className="text-white font-mono font-bold">{activeGpayNumber}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(activeGpayNumber, 'gpay')}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors"
                                    >
                                      {copiedKey === 'gpay' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedKey === 'gpay' ? 'Copied' : 'Copy Number'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SECTION 3: MANDATORY 12-DIGIT TRANSACTION ID (UTR) INPUT */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border-2 border-emerald-500/50 space-y-4 shadow-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-emerald-400" />
                                  <span>Step 2: Enter 12-Digit UPI Transaction ID (UTR)</span>
                                  <span className="text-rose-400 font-bold">*</span>
                                </span>
                                {cleanUtr.length >= 10 ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 self-start sm:self-auto">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for submission
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 self-start sm:self-auto">
                                    <AlertCircle className="w-3.5 h-3.5" /> 12 digits required
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-400">
                                After completing the transfer in Google Pay or PhonePe, open the payment receipt and enter the <strong>12-digit UPI Transaction ID / UTR number</strong> below:
                              </p>

                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  id="upi-transaction-utr"
                                  value={transactionRef}
                                  onChange={(e) => setTransactionRef(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                  maxLength={20}
                                  placeholder="e.g. 512345678901 (12-digit UTR)"
                                  className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm tracking-widest focus:border-emerald-500 focus:outline-none transition-colors"
                                />
                                <span className="text-[10px] text-slate-500 block">
                                  Found on your GPay / PhonePe receipt as "UPI transaction ID" or "Google transaction ID / Ref No."
                                </span>
                              </div>

                              {/* Payment Screenshot (Optional) */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Upload Payment Screenshot (Optional)</span>
                                  </span>
                                  {paymentScreenshot && (
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Screenshot Attached
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleScreenshotUpload}
                                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer"
                                />
                              </div>

                              {/* Declaration Checkbox */}
                              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={paymentAgreed}
                                  onChange={(e) => setPaymentAgreed(e.target.checked)}
                                  className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                                />
                                <span>
                                  I confirm that I have transferred <strong className="text-emerald-400">₹{payableFee} INR</strong> to <strong className="text-white">{activeReceiverName}</strong> ({activeUpiId}) and the 12-digit UTR reference entered above is genuine and belongs to this entry.
                                </span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* FREE ENTRY CONFIRMATION */
                          <div className="py-6 px-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                            <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-5 h-5" /> Free Competition Entry
                            </span>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                              No registration fee is required for this competition. Click below to submit your official registration.
                            </p>
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => setStep(5)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                          >
                            Back
                          </button>
                          {payableFee > 0 ? (
                            <button
                              type="button"
                              onClick={handleSubmitRegistration}
                              disabled={submitting || cleanUtr.length < 10 || !paymentAgreed}
                              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-800 transition-all"
                            >
                              {submitting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Verifying UTR & Completing Registration...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Verify UTR & Complete Registration (₹{payableFee})</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSubmitRegistration}
                              disabled={submitting}
                              className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-800 transition-all"
                            >
                              {submitting ? 'Confirming Entry...' : 'Complete Free Registration'}
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 7: Success Screen with Verified Payment Pass */}
              {step === 7 && submittedRegId && (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {verifiedPaymentData ? 'Payment Verified & Registration Confirmed!' : 'Registration Submitted!'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {verifiedPaymentData
                        ? 'Your entry fee has been cryptographically verified. An official digital receipt has been sent to your email.'
                        : 'Your entry has been recorded in the tournament registry. A confirmation email has been dispatched.'}
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-left shadow-lg">
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

                    {/* Verified Online Gateway Payment Info */}
                    {verifiedPaymentData ? (
                      <>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-500">Amount Paid:</span>
                          <span className="font-bold text-emerald-400">₹{verifiedPaymentData.amount} INR</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Payment ID:</span>
                          <span className="font-mono font-bold text-blue-400">{verifiedPaymentData.paymentId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Receipt No:</span>
                          <span className="font-mono text-slate-300">{verifiedPaymentData.receiptNumber}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-500">Payment Status:</span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED & CONFIRMED
                          </span>
                        </div>
                      </>
                    ) : submittedPaymentData && submittedPaymentData.amount > 0 ? (
                      <>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-500">Registration Fee:</span>
                          <span className="font-bold text-white">₹{submittedPaymentData.amount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Transaction UTR:</span>
                          <span className="font-mono font-bold text-emerald-400">{submittedPaymentData.utr}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <span className="text-slate-500">Payment Status:</span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING VERIFICATION
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                        <span className="text-slate-500">Status:</span>
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/20 text-emerald-400">
                          FREE ENTRY CONFIRMED
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Informational Notice */}
                  {verifiedPaymentData ? (
                    <div className="max-w-md mx-auto p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-left text-[11px] text-emerald-300 flex items-start gap-2.5">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p>
                        Your online payment has been authenticated and deposited directly into the official Physical Education Department account. Present your Registration ID upon reporting at the venue.
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-left text-[11px] text-slate-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p>
                        Your payment reference (UTR: <strong className="text-slate-200">{submittedPaymentData?.utr || transactionRef}</strong>) has been submitted for board verification.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                    <a
                      href={`/api/open-registration/receipt/${submittedRegId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </a>
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
                      onClick={() => { setSelectedComp(null); setStep(1); setVerifiedPaymentData(null); }}
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
                  <h4 className="text-sm font-bold text-slate-300">No competitions are available for this tournament.</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    The Sports Department has not added active sport events to this tournament yet. Please check back shortly or contact the Sports Incharge.
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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">
                                {comp.sportName}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-amber-500/20 uppercase">
                                {comp.competitionMode}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(comp.category || comp.gender) === 'Women' ? 'bg-pink-600/30 text-pink-300 border border-pink-500/30' : (comp.category || comp.gender) === 'Mixed' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'bg-blue-600/30 text-blue-300 border border-blue-500/30'}`}>
                                {comp.category || comp.gender || 'Men'}
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
                              <strong className="text-slate-200">{comp.category || comp.gender || 'Men'}</strong>
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
