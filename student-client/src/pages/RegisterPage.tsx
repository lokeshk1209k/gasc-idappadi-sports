import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, ShieldCheck, RefreshCw, Eye, EyeOff, Loader2,
  Building2, GraduationCap, Users, KeyRound, Sparkles, Trophy, Medal, Flame, Activity, Check, X
} from 'lucide-react';
import bcrypt from 'bcryptjs';

const SUPABASE_REST = 'https://yemypfgunokxfufnqvdh.supabase.co/rest/v1';
const SB_KEY = atob('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=');

interface VerifiedStudentData {
  id?: string;
  register_number: string;
  name: string;
  department: string;
  year: string;
  section: string;
  gender: string;
  status: string;
  isRegistered?: boolean;
}

const FEATURED_SPORTS = [
  { name: 'Athletics & Track', icon: '🏃', color: '#38A7FF' },
  { name: 'Cricket', icon: '🏏', color: '#FF6A21' },
  { name: 'Football', icon: '⚽', color: '#10B981' },
  { name: 'Badminton', icon: '🏸', color: '#A855F7' },
  { name: 'Silambam', icon: '🥋', color: '#F59E0B' },
  { name: 'Kabaddi', icon: '🤼', color: '#EC4899' },
  { name: 'Volleyball', icon: '🏐', color: '#06B6D4' }
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // Current Step: 1 (Roster Verification), 2 (Account Details), 3 (Email OTP), 4 (Completed)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Roster Verification
  const [inputRegNo, setInputRegNo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudentData | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  // Step 2: Account Form
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 3: OTP Verification
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [expectedOtp, setExpectedOtp] = useState<string>('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 4: Registered info for success display
  const [registeredSummary, setRegisteredSummary] = useState<{
    name: string;
    registerNumber: string;
    email: string;
  } | null>(null);

  // Hero ticker rotation
  const [sportIndex, setSportIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSportIndex(prev => (prev + 1) % FEATURED_SPORTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Resend Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 3 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, resendTimer]);

  // Click Ripple Effect
  const triggerRipple = (e: React.MouseEvent<HTMLElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('click-ripple');

    const ripple = button.getElementsByClassName('click-ripple')[0];
    if (ripple) {
      ripple.remove();
    }
    button.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 600);
  };

  // ── Password Validation Indicators ──
  const passwordChecks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const isPasswordValid = passwordChecks.length && passwordChecks.hasUpper && passwordChecks.hasLower && passwordChecks.hasNumber;

  // ── STEP 1: Verify Register Number Against Official College Roster ──
  const handleVerifyRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReg = inputRegNo.trim().toUpperCase();

    if (!cleanReg) {
      setVerifyError('Please enter your official College Register Number.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setIsAlreadyRegistered(false);
    setVerifiedStudent(null);

    try {
      let resolved = false;

      // Tier 1: Backend Serverless API (Supports both query param and route param)
      try {
        let apiRes = await fetch(`/api/auth/verify-student?regNo=${encodeURIComponent(cleanReg)}`);
        if (!apiRes.ok) {
          apiRes = await fetch(`/api/auth/verify-student/${encodeURIComponent(cleanReg)}`);
        }
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData && apiData.success && apiData.student) {
            resolved = true;
            setVerifiedStudent({
              id: apiData.student.id,
              register_number: apiData.student.registerNumber || cleanReg,
              name: apiData.student.name,
              department: apiData.student.department || 'Computer Science',
              year: apiData.student.year || 'I Year',
              section: apiData.student.section || 'A',
              gender: apiData.student.gender || 'Male',
              status: apiData.student.status || 'Active',
              isRegistered: false
            });
            setVerifying(false);
            return;
          } else if (apiData && apiData.isRegistered) {
            resolved = true;
            setIsAlreadyRegistered(true);
            setVerifyError(apiData.message || `An account already exists for Register Number (${cleanReg}). Please login.`);
            setVerifying(false);
            return;
          } else if (apiData && apiData.message && !apiData.success) {
            setVerifyError(apiData.message);
          }
        }
      } catch (apiErr) {
        console.warn('API verify fallback notice:', apiErr);
      }

      // Tier 2: Direct Supabase Cloud Query (users table)
      if (!resolved) {
        try {
          const url = `${SUPABASE_REST}/users?register_number=ilike.${encodeURIComponent(cleanReg)}&select=*`;
          const res = await fetch(url, {
            headers: {
              'apikey': SB_KEY,
              'Authorization': `Bearer ${SB_KEY}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const user = rows[0];

              if (user.status && user.status.toUpperCase() === 'INACTIVE') {
                setVerifyError('Your student record is currently inactive. Please contact the Sports Administration.');
                setVerifying(false);
                return;
              }

              if (user.role === 'student' && user.password) {
                setIsAlreadyRegistered(true);
                setVerifyError(`An account already exists for Register Number (${user.register_number || cleanReg}). Please login.`);
                setVerifying(false);
                return;
              }

              resolved = true;
              setVerifiedStudent({
                id: user.id,
                register_number: user.register_number || cleanReg,
                name: user.name,
                department: user.department || 'Computer Science',
                year: user.year || 'I Year',
                section: user.section || 'A',
                gender: user.gender || 'Male',
                status: user.status || 'Active',
                isRegistered: false
              });
              setVerifying(false);
              return;
            }
          }
        } catch (sbErr) {
          console.warn('Direct cloud database notice:', sbErr);
        }
      }

      // Tier 3: Local Roster JSON Fallback
      if (!resolved) {
        try {
          const rosterRes = await fetch('/roster.json');
          if (rosterRes.ok) {
            const rosterData = await rosterRes.json();
            const list = rosterData.roster || [];
            const found = list.find((s: any) =>
              (s.registerNumber && s.registerNumber.toUpperCase() === cleanReg) ||
              (s.register_number && s.register_number.toUpperCase() === cleanReg)
            );
            if (found) {
              resolved = true;
              setVerifiedStudent({
                id: found.id || `roster_${cleanReg}`,
                register_number: found.registerNumber || found.register_number || cleanReg,
                name: found.name,
                department: found.department || 'Computer Science',
                year: found.year || 'I Year',
                section: found.section || 'A',
                gender: found.gender || 'Male',
                status: found.status || 'Active',
                isRegistered: false
              });
              setVerifying(false);
              return;
            }
          }
        } catch (rErr) {
          console.warn('Roster JSON fallback notice:', rErr);
        }
      }

      // Tier 4: Supabase Roster Notifications Fallback
      if (!resolved) {
        try {
          const notifUrl = `${SUPABASE_REST}/notifications?category=eq.roster&or=(id.eq.roster_${encodeURIComponent(cleanReg)},title.ilike.${encodeURIComponent(cleanReg)})&select=*`;
          const notifRes = await fetch(notifUrl, {
            headers: {
              'apikey': SB_KEY,
              'Authorization': `Bearer ${SB_KEY}`
            }
          });
          if (notifRes.ok) {
            const notifs = await notifRes.json();
            if (Array.isArray(notifs) && notifs.length > 0) {
              const n = notifs[0];
              const p = typeof n.message === 'string' ? JSON.parse(n.message) : n.message;
              if (p && (p.name || n.title)) {
                resolved = true;
                setVerifiedStudent({
                  id: `roster_${cleanReg}`,
                  register_number: p.registerNumber || cleanReg,
                  name: p.name || 'Student Athlete',
                  department: p.department || n.target_type || 'Computer Science',
                  year: p.year || n.target_audience || 'I Year',
                  section: p.section || 'A',
                  gender: p.gender || n.priority || 'Male',
                  status: p.status || 'Active',
                  isRegistered: false
                });
                setVerifying(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      if (!resolved) {
        setVerifyError('Your Register Number was not found in the official college student roster. You cannot create a Student Portal account.');
      }
    } catch (err: any) {
      console.error('Roster verification error:', err);
      setVerifyError('Unable to verify your Register Number. Please check your internet connection or verify the Register Number with the Sports Department.');
    } finally {
      setVerifying(false);
    }
  };

  // ── STEP 2: Send Email OTP ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!isPasswordValid) {
      setFormError('Password must meet all security requirements (min 8 characters, upper, lower & number).');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setSendingOtp(true);

    try {
      // 1. Strict Unique Email Check against Supabase
      const emailCheckUrl = `${SUPABASE_REST}/users?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,name,register_number,email`;
      const emailRes = await fetch(emailCheckUrl, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      });
      const emailRows = await emailRes.json();
      if (emailRows && Array.isArray(emailRows) && emailRows.length > 0) {
        const conflict = emailRows.find((u: any) => {
          const uReg = (u.register_number || '').toUpperCase().trim();
          const curReg = (verifiedStudent?.register_number || '').toUpperCase().trim();
          return uReg !== curReg && u.id !== verifiedStudent?.id;
        });
        if (conflict) {
          setFormError(`This email address (${cleanEmail}) is already registered to another account. Each student must use their own unique email address.`);
          setSendingOtp(false);
          return;
        }
      }

      // 2. Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expTime = Date.now() + 10 * 60 * 1000;
      setExpectedOtp(generatedOtp);

      // 3. Dispatch Email via API
      const otpRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          registerNumber: verifiedStudent?.register_number,
          name: verifiedStudent?.name,
          otp: generatedOtp
        })
      });

      const otpData = await otpRes.json().catch(() => null);

      if (!otpRes.ok || (otpData && !otpData.success)) {
        setFormError(otpData?.message || 'Failed to dispatch verification email. Please check that the email address is correct.');
        setSendingOtp(false);
        return;
      }

      // 4. Save OTP in Supabase notifications table
      try {
        await fetch(`${SUPABASE_REST}/notifications`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: `otp_${cleanEmail}_${Date.now()}`,
            title: 'STUDENT_REGISTRATION_OTP',
            category: 'otp',
            type: 'registration',
            sender: cleanEmail,
            message: JSON.stringify({
              otp: generatedOtp,
              email: cleanEmail,
              registerNumber: verifiedStudent?.register_number,
              expiresAt: expTime
            }),
            created_at: new Date().toISOString()
          })
        });
      } catch (e) {}

      setOtpToken(otpData?.otpToken || `otp_${generatedOtp}_${expTime}`);
      setOtpValues(['', '', '', '', '', '']);
      setResendTimer(30);
      setOtpError(null);
      setCurrentStep(3);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      console.error('Send OTP error:', err);
      setFormError('Failed to send verification code. Please check your internet connection.');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── STEP 3: Handle OTP Change & Verification ──
  const handleOtpChange = (index: number, val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.length > 1) {
      const newValues = [...otpValues];
      for (let i = 0; i < cleanDigits.length && index + i < 6; i++) {
        newValues[index + i] = cleanDigits[i];
      }
      setOtpValues(newValues);
      const nextIdx = Math.min(index + cleanDigits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = cleanDigits.slice(-1);
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newValues = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── STEP 3 -> STEP 4: Complete Account Creation ──
  const handleVerifyOtpAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpValues.join('').trim();

    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (otpAttempts >= 5) {
      setOtpError('Too many incorrect attempts. Please request a new OTP.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      // 1. Multi-Layer OTP Verification
      let isOtpValid = false;

      // Layer 1: Direct match with session OTP
      if (expectedOtp && enteredOtp === expectedOtp.trim()) {
        isOtpValid = true;
      }

      // Layer 2: Verify via backend API /api/auth/verify-otp
      if (!isOtpValid) {
        try {
          const vRes = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              otp: enteredOtp,
              otpToken: otpToken || ''
            })
          });
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData && vData.success) {
              isOtpValid = true;
            }
          }
        } catch (e) {
          console.warn('API verify-otp notice:', e);
        }
      }

      // Layer 3: Direct Supabase notifications fallback
      if (!isOtpValid) {
        try {
          const sbRes = await fetch(`${SUPABASE_REST}/notifications?category=eq.otp&sender=eq.${encodeURIComponent(cleanEmail)}&order=created_at.desc&limit=5`, {
            headers: {
              'apikey': SB_KEY,
              'Authorization': `Bearer ${SB_KEY}`
            }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows)) {
              for (const r of rows) {
                try {
                  const p = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
                  if (p && String(p.otp).trim() === enteredOtp) {
                    const exp = p.expiresAt ? Number(p.expiresAt) : null;
                    if (!exp || Date.now() <= exp) {
                      isOtpValid = true;
                      break;
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      }

      if (!isOtpValid) {
        const nextAttempts = otpAttempts + 1;
        setOtpAttempts(nextAttempts);
        setOtpError(`Invalid OTP code. Please check the 6-digit code in your email and try again (${5 - nextAttempts} attempts remaining).`);
        setVerifyingOtp(false);
        return;
      }

      // 2. Hash Password with Bcrypt
      const hashedPassword = bcrypt.hashSync(password, 10);
      const studentId = verifiedStudent?.id || `roster_${verifiedStudent?.register_number}`;

      // 3. Update permanent student account in Supabase users table
      const updatePayload = {
        name: verifiedStudent?.name,
        register_number: verifiedStudent?.register_number,
        email: cleanEmail,
        password: hashedPassword,
        role: 'student',
        department: verifiedStudent?.department,
        year: verifiedStudent?.year,
        section: verifiedStudent?.section || 'A',
        gender: verifiedStudent?.gender,
        mobile: cleanPhone,
        status: 'Active',
        updated_at: new Date().toISOString()
      };

      let updatedOk = false;
      const patchRes = await fetch(`${SUPABASE_REST}/users?id=eq.${studentId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updatePayload)
      });
      if (patchRes.ok) {
        const rows = await patchRes.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > 0) {
          updatedOk = true;
        }
      }

      if (!updatedOk) {
        const patchRegRes = await fetch(`${SUPABASE_REST}/users?register_number=ilike.${encodeURIComponent(verifiedStudent?.register_number || '')}`, {
          method: 'PATCH',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updatePayload)
        });
        if (patchRegRes.ok) {
          const rows = await patchRegRes.json().catch(() => []);
          if (Array.isArray(rows) && rows.length > 0) {
            updatedOk = true;
          }
        }
      }

      if (!updatedOk) {
        await fetch(`${SUPABASE_REST}/users`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: studentId,
            created_at: new Date().toISOString(),
            ...updatePayload
          })
        });
      }

      // Also call serverless register endpoint to ensure server-side sync
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registerNumber: verifiedStudent?.register_number,
            email: cleanEmail,
            password: password,
            phone: cleanPhone
          })
        });
      } catch (e) {}

      // 4. Set summary and move to Step 4 (Completed)
      setRegisteredSummary({
        name: verifiedStudent?.name || '',
        registerNumber: verifiedStudent?.register_number || '',
        email: cleanEmail
      });

      setCurrentStep(4);
    } catch (err: any) {
      console.error('Account creation error:', err);
      setOtpError('Failed to complete registration. Please check your connection.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const currentSport = FEATURED_SPORTS[sportIndex];

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-[#020817] text-white select-none">
      
      {/* ── AMBIENT GLOWING ORBS IN BACKGROUND ── */}
      <div 
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[130px] opacity-40 z-0"
        style={{
          background: 'radial-gradient(circle, rgba(22, 119, 255, 0.55) 0%, rgba(56, 167, 255, 0.15) 60%, transparent 80%)',
          animation: 'ambientGlowOrb1 12s ease-in-out infinite'
        }}
      />
      <div 
        className="pointer-events-none absolute bottom-0 right-1/3 w-[550px] h-[550px] rounded-full blur-[140px] opacity-35 z-0"
        style={{
          background: 'radial-gradient(circle, rgba(108, 76, 255, 0.45) 0%, rgba(255, 106, 33, 0.20) 70%, transparent 80%)',
          animation: 'ambientGlowOrb2 15s ease-in-out infinite'
        }}
      />

      {/* Grid Pattern Mesh Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-15"
        style={{
          backgroundImage: `radial-gradient(rgba(56, 167, 255, 0.3) 1px, transparent 1px)`,
          backgroundSize: '36px 36px'
        }}
      />

      {/* ── LEFT PANEL: CINEMATIC SPORTS HERO EXPERIENCE ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-12 z-10">
        
        {/* Background Image with layered gradient overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/images/login-hero.jpg"
            alt="GASC Sports Athletes"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out hover:scale-100 filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/90 via-[#020817]/65 to-[#020817]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/35 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#020817_90%)]" />
        </div>

        {/* Top Header Badge */}
        <div className="relative z-10 animate-hero-reveal flex items-center justify-between">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-400/40 bg-blue-950/60 p-1 shadow-[0_0_25px_rgba(56,167,255,0.35)] transition-all duration-300 group-hover:border-blue-400 group-hover:scale-105">
                <img 
                  src="/images/college-logo.jpg" 
                  alt="GASC Idappadi" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020817] flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white font-['Plus_Jakarta_Sans']">
                  GASC SPORTS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
                  Registration
                </span>
              </div>
              <p className="text-xs text-blue-200/70 font-medium tracking-wide">
                Govt. Arts & Science College, Idappadi
              </p>
            </div>
          </div>

          {/* Dynamic Sports Ticker Chip */}
          <div className="hidden xl:flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-lg animate-float-badge">
            <span className="text-lg">{currentSport.icon}</span>
            <div className="text-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Active Category</span>
              <span className="font-bold text-white tracking-wide transition-all duration-300" style={{ color: currentSport.color }}>
                {currentSport.name}
              </span>
            </div>
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse ml-1" />
          </div>
        </div>

        {/* Center Motivational Headline & Step Roadmap */}
        <div className="relative z-10 my-auto py-8 max-w-xl animate-hero-reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 mb-5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
              Join The Official Sports Roster
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-[1.12] tracking-tight font-['Plus_Jakarta_Sans'] text-white">
            BECOME A <br />
            <span className="gradient-text-shimmer">COLLEGE CHAMPION</span> <br />
            TODAY.
          </h1>

          <p className="mt-4 text-sm text-slate-300/85 leading-relaxed font-normal max-w-lg">
            Complete your fast 4-step registration to access university tournaments, sports equipment booking, athletic tracking, and official certificates.
          </p>

          {/* Registration 4-Step Visual Roadmap */}
          <div className="mt-7 space-y-3">
            {[
              { num: '01', title: 'Roster Verification', desc: 'Automatic validation with College Admission records' },
              { num: '02', title: 'Profile Setup', desc: 'Create your unique student credentials and password' },
              { num: '03', title: 'Email OTP Verification', desc: 'Secure high-speed OTP email validation' },
              { num: '04', title: 'Athlete Dashboard Access', desc: 'Instant access to tournaments & equipment vault' }
            ].map((st, i) => {
              const active = currentStep === (i + 1);
              const done = currentStep > (i + 1);
              return (
                <div 
                  key={i}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300 border ${
                    active 
                      ? 'bg-blue-600/20 border-blue-400/50 shadow-lg shadow-blue-600/20 translate-x-1.5' 
                      : done 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-white/[0.03] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black font-mono flex-shrink-0 ${
                    done 
                      ? 'bg-emerald-500 text-white' 
                      : active 
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/40' 
                      : 'bg-white/10 text-slate-400'
                  }`}>
                    {done ? '✓' : st.num}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">{st.title}</h4>
                    <p className="text-[11px] text-slate-400">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats Capsules */}
          <div className="grid grid-cols-3 gap-3 mt-7 pt-6 border-t border-white/10">
            {[
              { val: '1000+', label: 'Athletes Enrolled', icon: Flame, color: '#FF6A21' },
              { val: '12+', label: 'Sports Disciplines', icon: Trophy, color: '#38A7FF' },
              { val: '100%', label: 'Verified Records', icon: ShieldCheck, color: '#10B981' }
            ].map((stat, idx) => {
              const IconComp = stat.icon;
              return (
                <div 
                  key={idx} 
                  className="p-3 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xl font-black font-['Plus_Jakarta_Sans']" style={{ color: stat.color }}>
                      {stat.val}
                    </span>
                    <IconComp className="w-3.5 h-3.5 opacity-60" style={{ color: stat.color }} />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Hero Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            Official Student Sports Portal Registration
          </span>
          <span className="font-mono text-[11px] opacity-70">
            Department of Physical Education
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL: ULTRA-GLASSMORPHIC REGISTRATION HUB ── */}
      <div className="w-full lg:w-[500px] xl:w-[560px] flex-shrink-0 relative flex flex-col justify-center items-center p-6 sm:p-10 z-10 overflow-y-auto min-h-screen">
        
        {/* Mobile Header / College Brand */}
        <div className="lg:hidden w-full max-w-sm mb-6 text-center animate-hero-reveal">
          <div className="inline-block relative mb-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-400/50 bg-blue-950/80 p-1 shadow-[0_0_25px_rgba(56,167,255,0.35)] mx-auto">
              <img 
                src="/images/college-logo.jpg" 
                alt="GASC Idappadi" 
                className="w-full h-full object-contain rounded-xl"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020817]" />
          </div>
          <h2 className="text-xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-wide">
            GASC SPORTS REGISTRATION
          </h2>
          <p className="text-xs text-blue-300/80 mt-0.5">
            Government Arts & Science College, Idappadi
          </p>
        </div>

        {/* Glassmorphic Auth Card Container */}
        <div className="w-full max-w-lg animate-login-card my-auto">
          
          <div className="relative rounded-3xl p-7 sm:p-9 bg-slate-900/60 backdrop-blur-2xl border border-white/[0.14] shadow-[0_20px_70px_rgba(0,0,0,0.65),0_0_30px_rgba(22,119,255,0.15)] overflow-hidden">
            
            {/* Radiant glow accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-orange-500 opacity-90" />

            {/* Subtle glass reflection sheen */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Mode Switcher Pill (Sign In vs Register) */}
            <div className="flex p-1 mb-6 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <Link
                to="/student/login"
                onClick={triggerRipple}
                className="flex-1 py-2 px-3 text-center rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-all duration-200 hover:bg-white/[0.04] flex items-center justify-center gap-1 btn-interactive-ripple"
              >
                <span>Student Login</span>
              </Link>
              <div className="flex-1 py-2 px-3 text-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>New Registration</span>
              </div>
            </div>

            {/* Modern Animated Stepper Indicator */}
            <div className="mb-7 px-2">
              <div className="flex items-center justify-between relative">
                
                {/* Stepper Connecting Background Line */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 z-0" />
                <div 
                  className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 z-0 transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / 3) * 90}%` }}
                />

                {[
                  { step: 1, label: 'Roster' },
                  { step: 2, label: 'Details' },
                  { step: 3, label: 'OTP' },
                  { step: 4, label: 'Done' }
                ].map(s => {
                  const isDone = currentStep > s.step;
                  const isCurrent = currentStep === s.step;
                  return (
                    <div key={s.step} className="flex flex-col items-center relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isDone 
                          ? 'bg-emerald-500 text-white border-2 border-emerald-400 shadow-md shadow-emerald-500/30 scale-100' 
                          : isCurrent 
                          ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-[0_0_15px_rgba(56,167,255,0.6)] scale-110' 
                          : 'bg-slate-900 text-slate-400 border border-white/20'
                      }`}>
                        {isDone ? '✓' : s.step}
                      </div>
                      <span className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                        isCurrent ? 'text-blue-300' : isDone ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 1: REGISTER NUMBER VERIFICATION ── */}
            {currentStep === 1 && (
              <div className="animate-hero-reveal">
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight mb-1">
                    Verify College Register Number
                  </h2>
                  <p className="text-xs text-slate-300/80 leading-relaxed">
                    Enter your official Register Number to verify that you are pre-enrolled in the Sports College Roster.
                  </p>
                </div>

                {verifyError && (
                  <div className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 shadow-lg ${
                    isAlreadyRegistered 
                      ? 'bg-blue-500/15 border border-blue-500/35 text-blue-200' 
                      : 'bg-rose-500/15 border border-rose-500/35 text-rose-300 animate-shake'
                  }`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{isAlreadyRegistered ? 'Existing Account' : 'Verification Alert'}</p>
                      <p className="opacity-90 leading-relaxed mt-0.5">{verifyError}</p>
                      {isAlreadyRegistered && (
                        <button
                          type="button"
                          onClick={(e) => { triggerRipple(e); navigate('/student/login'); }}
                          className="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 btn-interactive-ripple"
                        >
                          <span>Go to Login Page</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!verifiedStudent ? (
                  <form onSubmit={handleVerifyRoster} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5">
                          <span>College Register Number</span>
                          <span className="text-rose-400 font-bold">*</span>
                        </span>
                        <span className="text-[10px] text-blue-400 font-mono">Case-Insensitive</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400 group-focus-within:text-blue-300 transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={inputRegNo}
                          onChange={e => setInputRegNo(e.target.value.toUpperCase())}
                          placeholder="e.g. C24UG183CSC011"
                          className="w-full pl-10 pr-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-semibold tracking-wider uppercase outline-none transition-all duration-200 shadow-inner focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        * Must match your university register number in official college records.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={verifying}
                      onClick={triggerRipple}
                      className="w-full relative mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_25px_rgba(37,99,235,0.45)] hover:shadow-[0_10px_35px_rgba(37,99,235,0.65)] border border-white/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed btn-interactive-ripple"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Checking Official College Roster...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Register Number</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-5 animate-hero-reveal">
                    
                    {/* Official Verified Athlete Badge Card */}
                    <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-500/15 via-slate-900/80 to-blue-500/10 border border-emerald-500/35 shadow-lg shadow-emerald-950/30">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Student Record Verified in College Roster</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Student Name</span>
                          <strong className="text-white text-sm font-bold tracking-wide">{verifiedStudent.name}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Register Number</span>
                          <strong className="text-blue-300 text-sm font-bold font-mono">{verifiedStudent.register_number}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Department</span>
                          <span className="text-slate-200 font-semibold">{verifiedStudent.department}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Academic Year</span>
                          <span className="text-slate-200 font-semibold">{verifiedStudent.year} • Sec {verifiedStudent.section}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerRipple(e);
                          setVerifiedStudent(null);
                          setInputRegNo('');
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 font-semibold text-xs border border-white/10 transition-colors btn-interactive-ripple"
                      >
                        Change Number
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerRipple(e);
                          setCurrentStep(2);
                        }}
                        className="flex-[1.5] py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/35 border border-white/20 flex items-center justify-center gap-1.5 btn-interactive-ripple"
                      >
                        <span>Continue Registration</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: STUDENT DETAILS & ACCOUNT CREATION ── */}
            {currentStep === 2 && (
              <form onSubmit={handleSendOtp} className="space-y-4 animate-hero-reveal">
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      triggerRipple(e);
                      setCurrentStep(1);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 mb-2 focus:outline-none"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back to Roster Check</span>
                  </button>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight mb-1">
                    Set Up Your Password
                  </h2>
                  <p className="text-xs text-slate-300/80 leading-relaxed">
                    Configure your official student email and secret password for secure logins.
                  </p>
                </div>

                {/* Verified Mini Banner */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/25 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Registering for</span>
                    <strong className="text-white text-xs">{verifiedStudent?.name}</strong>{' '}
                    <span className="text-blue-300 text-[11px] font-mono">({verifiedStudent?.register_number})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ Verified
                  </span>
                </div>

                {formError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-start gap-2 shadow-lg animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span className="leading-relaxed">{formError}</span>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <span>Personal Student Email Address</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <span>Mobile Phone Number</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <span>Create Password (Min 8 characters)</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters, Upper, Lower & Number"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password requirement chips */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {[
                      { label: '8+ Characters', valid: passwordChecks.length },
                      { label: 'Uppercase (A-Z)', valid: passwordChecks.hasUpper },
                      { label: 'Lowercase (a-z)', valid: passwordChecks.hasLower },
                      { label: 'Number (0-9)', valid: passwordChecks.hasNumber }
                    ].map(ch => (
                      <div 
                        key={ch.label} 
                        className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${
                          ch.valid ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                          ch.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'
                        }`}>
                          {ch.valid ? '✓' : '•'}
                        </span>
                        <span>{ch.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <span>Confirm Password</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  onClick={triggerRipple}
                  className="w-full relative mt-3 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_25px_rgba(37,99,235,0.45)] border border-white/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed btn-interactive-ripple"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Email Verification OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Email OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 3: EMAIL OTP VERIFICATION ── */}
            {currentStep === 3 && (
              <form onSubmit={handleVerifyOtpAndCreateAccount} className="space-y-4 animate-hero-reveal">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-[0_0_20px_rgba(56,167,255,0.25)]">
                    <KeyRound className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight mb-1">
                    Verify Your Email Address
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A 6-digit confirmation code was dispatched to:<br />
                    <strong className="text-blue-300 font-mono text-sm">{email}</strong>
                  </p>
                </div>

                {/* Spam/Junk folder prompt */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
                  <Mail className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    Didn't receive the email in your inbox? Please check your <strong className="text-amber-300">Spam / Junk</strong> folder.
                  </div>
                </div>

                {otpError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2 shadow-lg animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* 6 OTP Boxes */}
                <div className="flex justify-center gap-2 sm:gap-2.5 py-1">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className={`w-11 sm:w-12 h-14 sm:h-16 bg-white/[0.06] border ${
                        digit 
                          ? 'border-blue-400 shadow-[0_0_15px_rgba(56,167,255,0.5)] scale-105' 
                          : 'border-white/20'
                      } rounded-xl text-white text-2xl font-black text-center outline-none transition-all focus:border-blue-400 focus:scale-105`}
                    />
                  ))}
                </div>

                {/* Resend Button & Timer */}
                <div className="text-center pt-1">
                  {resendTimer > 0 ? (
                    <span className="text-xs text-slate-400 font-mono">
                      Resend code available in <strong className="text-blue-400">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto focus:outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Code</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp}
                  onClick={triggerRipple}
                  className="w-full relative py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_25px_rgba(16,185,129,0.45)] border border-white/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed btn-interactive-ripple"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying & Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Account Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setCurrentStep(2); setOtpError(null); }}
                    className="text-xs text-slate-400 hover:text-slate-300 underline focus:outline-none"
                  >
                    Wrong email address? Change Email
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 4: REGISTRATION COMPLETED ── */}
            {currentStep === 4 && registeredSummary && (
              <div className="text-center py-2 animate-hero-reveal space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-bounce">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight mb-1">
                    Registration Complete! 🎉
                  </h2>
                  <p className="text-xs text-slate-300">
                    Your official athlete account has been registered in the GASC Sports Portal.
                  </p>
                </div>

                {/* Athlete Pass Card */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-slate-400">Athlete Name</span>
                    <strong className="text-white font-bold">{registeredSummary.name}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-slate-400">Register Number</span>
                    <strong className="text-blue-300 font-mono">{registeredSummary.registerNumber}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Login Email</span>
                    <strong className="text-emerald-400">{registeredSummary.email}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-xs text-blue-200/90 leading-relaxed">
                  🔑 You can now sign in anytime using your Register Number or Email.
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    triggerRipple(e);
                    navigate('/student/login');
                  }}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_8px_25px_rgba(37,99,235,0.45)] border border-white/20 flex items-center justify-center gap-2 btn-interactive-ripple cursor-pointer"
                >
                  <span>Proceed to Student Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Footer Sign-in redirection */}
            {currentStep < 4 && (
              <div className="mt-6 pt-4 border-t border-white/[0.08] text-center">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <Link
                    to="/student/login"
                    onClick={triggerRipple}
                    className="font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 hover:underline ml-1"
                  >
                    Login with Email / Reg No
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </p>
              </div>
            )}

          </div>

          {/* College Trust Badge */}
          <div className="mt-5 text-center text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5 opacity-80">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>GASC Idappadi Sports Management System</span>
            </p>
            <p className="text-[10px] opacity-60">
              Official University Sports Registry • Periyar University
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default RegisterPage;
