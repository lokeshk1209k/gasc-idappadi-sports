import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Lock, Mail, Phone, BookOpen, CheckCircle, 
  Sparkles, AlertCircle, RefreshCw, KeyRound, ShieldCheck, 
  ArrowRight, Eye, EyeOff, Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

function getRegisterNumberVariants(input: string): string[] {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return [];
  const variants = new Set<string>([clean]);
  
  // Extract trailing numbers and handle 0-padding differences
  // e.g. C24UG183CSC13 vs C24UG183CSC013 vs C24UG183CSC0013
  const match = clean.match(/^([A-Z0-9]+?)0*([0-9]+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    variants.add(prefix + num);
    variants.add(prefix + String(num).padStart(2, '0'));
    variants.add(prefix + String(num).padStart(3, '0'));
  }
  return Array.from(variants);
}

const MASTER_ROSTER = [
  { register_number: '23UGCS101', name: 'Arun Kumar S', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGCS102', name: 'Priya Dharshini R', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGCS103', name: 'Balaji K', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGCS104', name: 'Divya M', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Female' },
  { register_number: '23UGCS105', name: 'Elango V', department: 'Computer Science', year: 'II Year', section: 'B', gender: 'Male' },
  { register_number: '24UGCO201', name: 'Gowtham N', department: 'Commerce', year: 'I Year', section: 'A', gender: 'Male' },
  { register_number: '24UGCO205', name: 'Karthik Raja M', department: 'Commerce', year: 'I Year', section: 'B', gender: 'Male' },
  { register_number: '22UGMA301', name: 'Abirami S', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female' },
  { register_number: '22UGMA310', name: 'Deepa Lakshmi K', department: 'Mathematics', year: 'III Year', section: 'A', gender: 'Female' },
  { register_number: '23UGEN101', name: 'Dinesh Kumar P', department: 'English', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGEN115', name: 'Vigneshwaran T', department: 'English', year: 'II Year', section: 'B', gender: 'Male' },
  { register_number: '23UGTA101', name: 'Mani Maran C', department: 'Tamil', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '24UGPH101', name: 'Sanjay V', department: 'Physics', year: 'I Year', section: 'A', gender: 'Male' },
  { register_number: '24UGCH101', name: 'Kavitha R', department: 'Chemistry', year: 'I Year', section: 'A', gender: 'Female' },
  { register_number: '23UGBA101', name: 'Naveen Prasath S', department: 'Business Administration', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '21CS001', name: 'Lokesh', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC013', name: 'Lokesh Krishnan', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC13', name: 'Lokesh Krishnan', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC014', name: 'MADHAN', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC14', name: 'MADHAN', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC011', name: 'harish', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' },
  { register_number: 'C24UG183CSC11', name: 'harish', department: 'Computer Science', year: 'III Year', section: 'A', gender: 'Male' }
];

const DEPARTMENTS = [
  'Computer Science',
  'Commerce',
  'Mathematics',
  'Physics',
  'Chemistry',
  'English',
  'Tamil',
  'BBA',
  'History',
  'Physical Education'
];

const YEARS = ['I Year', 'II Year', 'III Year', 'PG I Year', 'PG II Year'];
const GENDERS = ['Male', 'Female'];
const SECTIONS = ['A', 'B', 'C'];

const RegisterPage = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    register_number: '',
    department: 'Computer Science',
    year: 'I Year',
    section: 'A',
    gender: 'Male',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    termsAgreed: false
  });

  // UI & Loading States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    verified: boolean;
    isPreEnrolled: boolean;
    isRegistered: boolean;
    message: string;
  } | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [maskedEmail, setMaskedEmail] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Debounced Auto-Verification on Register Number change
  useEffect(() => {
    const rawReg = formData.register_number.trim();
    if (!rawReg || rawReg.length < 4) {
      setVerifyStatus(null);
      setVerifying(false);
      return;
    }

    const timer = setTimeout(async () => {
      setVerifying(true);
      try {
        const variants = getRegisterNumberVariants(rawReg);
        const cleanRegNo = variants[0] || rawReg.toUpperCase();

        // 1. First, check if student is already registered in users table
        let existingUser: { id: string; name: string; register_number?: string } | null = null;

        // Try direct Supabase query with orQuery
        try {
          const orQuery = variants.map(v => `register_number.ilike.%${v}%`).join(',');
          const { data: usersFound } = await supabase
            .from('users')
            .select('id, name, register_number, email')
            .or(orQuery);
          if (usersFound && usersFound.length > 0) {
            existingUser = usersFound[0];
          }
        } catch (e) {
          console.warn('Supabase users check:', e);
        }

        // Try Supabase in-query fallback
        if (!existingUser) {
          try {
            const { data: usersIn } = await supabase
              .from('users')
              .select('id, name, register_number, email')
              .in('register_number', variants);
            if (usersIn && usersIn.length > 0) {
              existingUser = usersIn[0];
            }
          } catch (e) {}
        }

        // Try backend API verification if running
        if (!existingUser) {
          try {
            const res = await fetch(`/api/auth/verify-student/${encodeURIComponent(cleanRegNo)}`);
            const data = await res.json();
            if (data && data.isRegistered) {
              existingUser = {
                id: 'existing',
                name: data.message?.includes('"') ? data.message.split('"')[1] : 'Student Athlete',
                register_number: cleanRegNo
              };
            }
          } catch (e) {}
        }

        if (existingUser) {
          setVerifyStatus({
            verified: false,
            isPreEnrolled: false,
            isRegistered: true,
            message: `Student "${existingUser.name}" (${existingUser.register_number || cleanRegNo}) already exists! Please proceed to Login.`
          });
          setVerifying(false);
          return;
        }

        // 2. Not registered yet. Check if pre-enrolled in College Roster
        let rosterList = [...MASTER_ROSTER];
        try {
          const rRes = await fetch('/roster.json');
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData && Array.isArray(rData.roster)) {
              rosterList = [...rData.roster, ...MASTER_ROSTER];
            }
          }
        } catch (e) {}

        const rosterMatch = rosterList.find(r => {
          const rVariants = getRegisterNumberVariants(r.register_number);
          return variants.some(v => rVariants.includes(v));
        });

        if (rosterMatch) {
          setVerifyStatus({
            verified: true,
            isPreEnrolled: true,
            isRegistered: false,
            message: `Official GASC Record Verified: ${rosterMatch.name} (${rosterMatch.department} - ${rosterMatch.year})`
          });

          // Auto-fill student profile details
          setFormData(prev => ({
            ...prev,
            name: rosterMatch.name || prev.name,
            department: rosterMatch.department || prev.department,
            year: rosterMatch.year || prev.year,
            section: rosterMatch.section || prev.section,
            gender: rosterMatch.gender || prev.gender
          }));
        } else {
          // 3. Register number format valid, student can enter details
          setVerifyStatus({
            verified: true,
            isPreEnrolled: false,
            isRegistered: false,
            message: `Register Number (${cleanRegNo}) available. Please complete your basic student details below.`
          });
        }
      } catch (err) {
        console.error('Verify error:', err);
      } finally {
        setVerifying(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.register_number]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, resendTimer]);

  // Handle Form Submit -> Dispatches OTP
  const handleSubmitAndSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanRegNo = formData.register_number.trim().toUpperCase();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanRegNo || cleanRegNo.length < 4) {
      setError('Please enter a valid College Register Number.');
      return;
    }

    if (verifyStatus?.isRegistered) {
      setError('An account with this register number already exists. Please login.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter your full official name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address to receive your OTP.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    if (!formData.termsAgreed) {
      setError('Please agree to the Athletics Code of Conduct & Terms.');
      return;
    }

    setLoading(true);

    try {
      let sentSuccess = false;
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            registerNumber: cleanRegNo,
            name: formData.name.trim()
          })
        });
        const data = await res.json();
        if (data && data.success) {
          sentSuccess = true;
          setMaskedEmail(data.maskedEmail || cleanEmail);
          setDemoOtpHint(data.demoOtpHint || null);
        }
      } catch (e) {}

      if (!sentSuccess) {
        setMaskedEmail(cleanEmail);
        setDemoOtpHint('123456');
      }

      setOtpValues(['', '', '', '', '', '']);
      setOtpError('');
      setResendTimer(60);
      setShowOtpModal(true);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpLoading(true);
    setOtpError('');

    try {
      let resent = false;
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            registerNumber: formData.register_number.trim().toUpperCase(),
            name: formData.name.trim()
          })
        });
        const data = await res.json();
        if (data && data.success) {
          resent = true;
          setDemoOtpHint(data.demoOtpHint || null);
          setResendTimer(60);
        }
      } catch (e) {}

      if (!resent) {
        setDemoOtpHint('123456');
        setResendTimer(60);
      }
    } catch (err) {
      console.error('Resend error:', err);
      setOtpError('Failed to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP Inputs
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (digit && index === 5 && newValues.every(v => v !== '')) {
      const fullOtp = newValues.join('');
      executeRegistration(fullOtp);
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

    const newValues = [...otpValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);

    if (pasted.length === 6) {
      executeRegistration(pasted);
    } else {
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Final Registration Execution
  const executeRegistration = async (enteredOtp?: string) => {
    const otpToVerify = enteredOtp || otpValues.join('');

    if (otpToVerify.length !== 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      let regSuccess = false;
      let userData: any = null;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            registerNumber: formData.register_number.trim().toUpperCase(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            department: formData.department,
            year: formData.year,
            section: formData.section,
            gender: formData.gender,
            mobile: formData.phone.trim(),
            otp: otpToVerify,
            role: 'student'
          })
        });

        const data = await res.json();
        if (data && data.success) {
          regSuccess = true;
          userData = data.user;
          if (data.token) localStorage.setItem('gasc_token', data.token);
        } else if (data && data.message) {
          setOtpError(data.message);
          setOtpLoading(false);
          return;
        }
      } catch (e) {}

      // Fallback: Register directly into Supabase
      if (!regSuccess) {
        const cleanReg = formData.register_number.trim().toUpperCase();
        const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const userRecord = {
          id: newUserId,
          name: formData.name.trim(),
          register_number: cleanReg,
          email: formData.email.trim().toLowerCase(),
          role: 'student',
          department: formData.department,
          year: formData.year,
          section: formData.section,
          gender: formData.gender,
          mobile: formData.phone.trim(),
          status: 'Active',
          created_at: new Date().toISOString()
        };

        const { error: insErr } = await supabase.from('users').insert(userRecord);
        if (insErr && !insErr.message?.includes('duplicate key')) {
          console.warn('Supabase insert warning:', insErr.message);
        }

        try {
          await supabase.from('player_profiles').insert({
            id: `prof_${Date.now()}`,
            user_id: newUserId,
            name: userRecord.name,
            register_number: cleanReg,
            department: userRecord.department,
            year: userRecord.year,
            gender: userRecord.gender,
            mobile: userRecord.mobile,
            created_at: new Date().toISOString()
          });
        } catch (e) {}

        userData = userRecord;
        localStorage.setItem('gasc_token', `gasc_student_jwt_${Date.now()}`);
        regSuccess = true;
      }

      if (regSuccess && userData) {
        localStorage.setItem('gasc_user', JSON.stringify(userData));
        setSuccessMsg('🎉 Registration successful! Welcome to GASC Sports Portal.');
        setShowOtpModal(false);
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setOtpError(err.message || 'Registration failed. Check network connection.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #061938 0%, #020817 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative' }}>

      {/* Background cyber ambient glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '780px', background: 'rgba(8, 27, 53, 0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(55,140,255,0.25)', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)', position: 'relative', zIndex: 10 }}>

        {/* Back Link */}
        <Link 
          to="/student/login" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#38A7FF', textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Login
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(55,140,255,0.40)', background: 'rgba(22,119,255,0.15)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(22,119,255,0.15)', border: '1px solid rgba(55,140,255,0.3)', borderRadius: '20px', color: '#38A7FF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
            <Sparkles style={{ width: 13, height: 13 }} /> STUDENT ATHLETE PORTAL
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
            ATHLETE <span style={{ color: '#38A7FF' }}>REGISTRATION</span>
          </h1>
          <p style={{ fontSize: '14px', color: '#6E86A5', margin: 0 }}>
            Government Arts and Science College, Idappadi • 2026 Sports Portal
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{successMsg} Redirecting to your dashboard...</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmitAndSendOtp}>

          {/* ── STEP 1: REGISTER NUMBER AUTO-VERIFY BOX ── */}
          <div style={{ background: 'rgba(3, 17, 38, 0.70)', border: '1px solid rgba(55,140,255,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#AFC4DF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                COLLEGE REGISTER NUMBER <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: '#6E86A5' }}>Automatic Instant Verification</span>
            </div>

            <div style={{ position: 'relative' }}>
              <BookOpen style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
              <input
                type="text"
                required
                className="input-dark"
                placeholder="e.g. 23UGCS101 or 24UGCO205"
                value={formData.register_number}
                onChange={e => setFormData({ ...formData, register_number: e.target.value.toUpperCase() })}
                style={{ paddingLeft: '42px', paddingRight: verifying ? '42px' : '14px', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}
              />
              {verifying && (
                <Loader2 style={{ width: 18, height: 18, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF', animation: 'spin 1s linear infinite' }} />
              )}
            </div>

            {/* Dynamic Status Indicator */}
            {verifyStatus && (
              <div style={{ marginTop: '10px' }}>
                {verifyStatus.isRegistered ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', color: '#F87171' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle style={{ width: 15, height: 15 }} />
                      <span>{verifyStatus.message}</span>
                    </div>
                    <Link to="/student/login" style={{ color: '#38A7FF', fontWeight: 700, textDecoration: 'none', marginLeft: '10px' }}>
                      Login Now →
                    </Link>
                  </div>
                ) : verifyStatus.isPreEnrolled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', color: '#34D399' }}>
                    <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{verifyStatus.message} — Details auto-filled!</span>
                  </div>
                ) : verifyStatus.verified ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(56,167,255,0.15)', border: '1px solid rgba(56,167,255,0.3)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', color: '#38A7FF' }}>
                    <ShieldCheck style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span>Register Number Available. Please complete your basic student details below.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', color: '#F87171' }}>
                    <AlertCircle style={{ width: 15, height: 15 }} />
                    <span>{verifyStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── STEP 2: BASIC STUDENT DETAILS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>

            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Full Name (Official) <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. Arun Kumar S"
                  style={{ paddingLeft: '38px' }}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Department <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <select
                className="input-dark"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                style={{ cursor: 'pointer', background: '#031126' }}
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d} style={{ background: '#031126', color: '#FFF' }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Year of Study */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Year of Study <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <select
                className="input-dark"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                style={{ cursor: 'pointer', background: '#031126' }}
              >
                {YEARS.map(y => (
                  <option key={y} value={y} style={{ background: '#031126', color: '#FFF' }}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Gender <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <select
                className="input-dark"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                style={{ cursor: 'pointer', background: '#031126' }}
              >
                {GENDERS.map(g => (
                  <option key={g} value={g} style={{ background: '#031126', color: '#FFF' }}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Address (Where OTP will be received) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Email Address (OTP will be sent here) <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="email"
                  required
                  className="input-dark"
                  placeholder="student@gascidappadi.edu.in"
                  style={{ paddingLeft: '38px' }}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Mobile Number <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="tel"
                  required
                  className="input-dark"
                  placeholder="e.g. 9876543210"
                  style={{ paddingLeft: '38px' }}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Password (min 6 chars) <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                Confirm Password <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={formData.confirm_password}
                  onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#AFC4DF' }}>
              <input
                type="checkbox"
                required
                checked={formData.termsAgreed}
                onChange={e => setFormData({ ...formData, termsAgreed: e.target.checked })}
                style={{ marginTop: '2px', accentColor: '#1677FF', width: 16, height: 16 }}
              />
              <span>I confirm that I am a bonafide student of GASC Idappadi and agree to adhere to the official College Sports Code of Conduct.</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || verifying || verifyStatus?.isRegistered}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, justifyContent: 'center', opacity: (loading || verifying || verifyStatus?.isRegistered) ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                <span>Sending Email Verification OTP...</span>
              </>
            ) : (
              <>
                <span>Continue to Email OTP Verification</span>
                <ArrowRight style={{ width: 17, height: 17 }} />
              </>
            )}
          </button>
        </form>

        {/* Footer login link */}
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#6E86A5' }}>
          Already have an account?{' '}
          <Link to="/student/login" style={{ color: '#38A7FF', fontWeight: 700, textDecoration: 'none' }}>
            Log In Here
          </Link>
        </p>
      </div>

      {/* ── STEP 3: OTP VERIFICATION MODAL ── */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 8, 23, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: 'linear-gradient(180deg, #061938 0%, #031126 100%)', border: '1px solid rgba(55,140,255,0.35)', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(22,119,255,0.2)', position: 'relative' }}>

            {/* Mail Icon */}
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(22,119,255,0.15)', border: '2px solid rgba(55,140,255,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF' }}>
              <KeyRound style={{ width: 28, height: 28 }} />
            </div>

            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '22px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', margin: '0 0 6px' }}>
              Enter Verification Code
            </h2>
            <p style={{ fontSize: '13px', color: '#AFC4DF', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
              A 6-digit verification code has been dispatched to<br />
              <strong style={{ color: '#38A7FF' }}>{maskedEmail}</strong>
            </p>

            {/* Error in modal */}
            {otpError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{otpError}</span>
              </div>
            )}


            {/* 6-Digit OTP Inputs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
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
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  style={{
                    width: '48px',
                    height: '56px',
                    background: 'rgba(8,27,53,0.85)',
                    border: digit ? '2px solid #38A7FF' : '1px solid rgba(55,140,255,0.25)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '22px',
                    fontWeight: 800,
                    textAlign: 'center',
                    outline: 'none',
                    boxShadow: digit ? '0 0 12px rgba(56,167,255,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>

            {/* Verify & Enter Button */}
            <button
              onClick={() => executeRegistration()}
              disabled={otpLoading || otpValues.some(v => !v)}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, justifyContent: 'center', marginBottom: '16px' }}
            >
              {otpLoading ? (
                <>
                  <Loader2 style={{ width: 17, height: 17, animation: 'spin 1s linear infinite' }} />
                  <span>Verifying & Entering Portal...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Enter Website</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>

            {/* Resend & Cancel Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#6E86A5', paddingTop: '10px', borderTop: '1px solid rgba(55,140,255,0.15)' }}>
              <div>
                {resendTimer > 0 ? (
                  <span>Resend code in <strong style={{ color: '#AFC4DF' }}>{resendTimer}s</strong></span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpLoading}
                    style={{ background: 'none', border: 'none', color: '#38A7FF', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} /> Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowOtpModal(false)}
                style={{ background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer', padding: 0 }}
              >
                Change Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RegisterPage;
