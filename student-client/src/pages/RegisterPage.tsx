import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  BookOpen, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Static College Roster dataset as high-reliability fallback
const MASTER_ROSTER = [
  { register_number: '23UGCS101', name: 'Arun Kumar S', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGCS102', name: 'Priya Dharshini R', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGCS103', name: 'Balaji K', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGCS104', name: 'Divya M', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGCS105', name: 'Gokulnath P', department: 'Computer Science', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGMA101', name: 'Karthik V', department: 'Maths', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGMA102', name: 'Deepika S', department: 'Maths', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGCO101', name: 'Sanjay R', department: 'B.Com', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGCO102', name: 'Ananya M', department: 'B.Com', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGBB101', name: 'Vignesh P', department: 'BBA', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGBB102', name: 'Sneha K', department: 'BBA', year: 'II Year', section: 'A', gender: 'Female' },
  { register_number: '23UGEN101', name: 'Praveen Kumar T', department: 'English', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '23UGTA101', name: 'Manikandan C', department: 'Tamil', year: 'II Year', section: 'A', gender: 'Male' },
  { register_number: '24UGCS201', name: 'Naveen Kumar M', department: 'Computer Science', year: 'I Year', section: 'B', gender: 'Male' },
  { register_number: '24UGCS202', name: 'Keerthana R', department: 'Computer Science', year: 'I Year', section: 'B', gender: 'Female' },
  { register_number: '24UGCO205', name: 'Dhanush S', department: 'B.Com', year: 'I Year', section: 'B', gender: 'Male' },
  { register_number: '24UGMA210', name: 'Pavithra G', department: 'Maths', year: 'I Year', section: 'A', gender: 'Female' },
  { register_number: 'C24UG183CSC013', name: 'Lokesh Krishnan', department: 'Computer Science', year: 'I Year', section: 'A', gender: 'Male' }
];

function getRegisterNumberVariants(regNo: string): string[] {
  if (!regNo) return [];
  const raw = regNo.trim().toUpperCase();
  const variants = new Set<string>();
  variants.add(raw);
  const withoutLeadingZeroesInNumber = raw.replace(/(?<=[A-Z])0+(?=[0-9]+$)/, '');
  variants.add(withoutLeadingZeroesInNumber);
  const match = raw.match(/^([A-Z0-9]+?)([0-9]+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    variants.add(`${prefix}${num}`);
    variants.add(`${prefix}${String(num).padStart(3, '0')}`);
    variants.add(`${prefix}${String(num).padStart(4, '0')}`);
  }
  return Array.from(variants);
}

const DEPARTMENTS = [
  'Computer Science',
  'Maths',
  'B.Com',
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

  // Touched state for live field validation
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

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
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [maskedEmail, setMaskedEmail] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Field validation helpers
  const isEmailValid = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  const isPhoneValid = (phone: string) => /^[6-9]\d{9}$/.test(phone.trim());
  const isNameValid = (name: string) => name.trim().length >= 3 && /^[a-zA-Z\s.]*$/.test(name.trim());
  const isPasswordValid = (pw: string) => pw.length >= 6;
  const isPasswordMatch = formData.password.length > 0 && formData.password === formData.confirm_password;

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

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

        // 1. First, check if student has ALREADY registered an active account:
        let isAlreadyRegistered = false;
        let registeredName = '';

        // Check A: competition_registrations table (publicly accessible on Supabase)
        try {
          const { data: regAcc } = await supabase
            .from('competition_registrations')
            .select('student_name, register_number')
            .eq('competition_id', '__STUDENT_ACCOUNT__')
            .in('register_number', variants);

          if (regAcc && regAcc.length > 0) {
            isAlreadyRegistered = true;
            registeredName = regAcc[0].student_name;
          }
        } catch (e) {}

        // Check B: backend API verification if server is running
        if (!isAlreadyRegistered) {
          try {
            const res = await fetch(`/api/auth/verify-student/${encodeURIComponent(cleanRegNo)}`);
            const data = await res.json();
            if (data && data.isRegistered) {
              isAlreadyRegistered = true;
              registeredName = data.message?.includes('"') ? data.message.split('"')[1] : 'Student Athlete';
            }
          } catch (e) {}
        }

        // 2. Query Supabase notifications table for Real-Time Roster (instant next-second detection!)
        let rosterMatch: any = null;
        try {
          const { data: notifRows } = await supabase
            .from('notifications')
            .select('*')
            .eq('category', 'roster')
            .in('title', variants);

          if (notifRows && notifRows.length > 0) {
            const matchRow = notifRows[0];
            try {
              const parsed = JSON.parse(matchRow.message);
              rosterMatch = {
                register_number: parsed.registerNumber || matchRow.title,
                name: parsed.name,
                department: parsed.department,
                year: parsed.year,
                section: parsed.section,
                gender: parsed.gender,
                isRegistered: parsed.isRegistered || matchRow.sender === 'registered'
              };
            } catch (pErr) {
              rosterMatch = {
                register_number: matchRow.title,
                name: matchRow.title,
                department: matchRow.target_type,
                year: matchRow.target_audience,
                gender: matchRow.priority,
                isRegistered: matchRow.sender === 'registered'
              };
            }
          }
        } catch (e) {
          console.warn('Real-time Supabase roster check error:', e);
        }

        // Fallback: Check static roster if Supabase had no match
        if (!rosterMatch) {
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

          const staticMatch = rosterList.find(r => {
            const rVariants = getRegisterNumberVariants(r.register_number);
            return variants.some(v => rVariants.includes(v));
          });
          if (staticMatch) {
            rosterMatch = staticMatch;
          }
        }

        // 3. Handle results
        if (isAlreadyRegistered || (rosterMatch && rosterMatch.isRegistered)) {
          const displayName = registeredName || (rosterMatch ? rosterMatch.name : 'Student Athlete');
          setVerifyStatus({
            verified: false,
            isPreEnrolled: false,
            isRegistered: true,
            message: `Student "${displayName}" (${cleanRegNo}) already exists! Please proceed to Login.`
          });
          setVerifying(false);
          return;
        }

        if (rosterMatch) {
          // Pre-enrolled in Roster and NOT yet registered -> ALLOW REGISTRATION!
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
          // Register number not found in College Student Roster -> REJECT!
          setVerifyStatus({
            verified: false,
            isPreEnrolled: false,
            isRegistered: false,
            message: `Registration Not Allowed: Register Number (${cleanRegNo}) is not found in the official College Student Roster. Only enrolled GASC students are permitted to register.`
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

  // Handle Form Submit -> Dispatches Real OTP Email
  const handleSubmitAndSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields touched
    setTouched({
      register_number: true,
      name: true,
      email: true,
      phone: true,
      password: true,
      confirm_password: true,
      termsAgreed: true
    });

    const cleanRegNo = formData.register_number.trim().toUpperCase();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phone.trim();

    if (!cleanRegNo || cleanRegNo.length < 4) {
      setError('Please enter a valid College Register Number.');
      return;
    }

    if (verifyStatus?.isRegistered) {
      setError('An account with this register number already exists. Please proceed to login.');
      return;
    }

    if (!verifyStatus?.isPreEnrolled) {
      setError('Registration Not Allowed: Your Register Number is not found in the official College Student Roster. Only pre-enrolled GASC students can register.');
      return;
    }

    if (!isNameValid(formData.name)) {
      setError('Please enter your full official name (minimum 3 characters, letters and spaces only).');
      return;
    }

    if (!isEmailValid(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@gascidappadi.edu.in or student@gmail.com).');
      return;
    }

    if (!isPhoneValid(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!isPasswordValid(formData.password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    if (!formData.termsAgreed) {
      setError('Please agree to the Athletics Code of Conduct & Terms to continue.');
      return;
    }

    setLoading(true);

    try {
      let sentSuccess = false;
      let returnedToken: string | null = null;
      let emailMask = cleanEmail;

      // Call Vercel Serverless / Express API endpoint to dispatch real email
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
          emailMask = data.maskedEmail || cleanEmail;
          returnedToken = data.otpToken || null;
        } else if (data && data.message) {
          setError(data.message);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API send-otp call failed:', e);
      }

      if (sentSuccess) {
        setMaskedEmail(emailMask);
        setOtpToken(returnedToken);
        setOtpValues(['', '', '', '', '', '']);
        setOtpError('');
        setResendTimer(60);
        setShowOtpModal(true);

        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 300);
      } else {
        setError('Unable to send OTP verification email. Please check your internet connection or email address.');
      }
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError('Unable to send OTP email: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP Email
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpLoading(true);
    setOtpError('');

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
        setOtpToken(data.otpToken || null);
        setResendTimer(60);
        setOtpError('');
      } else {
        setOtpError(data?.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setOtpError('Failed to resend OTP. Please check your connection.');
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

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

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
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanReg = formData.register_number.trim().toUpperCase();

      // Step 1: Verify OTP code via Serverless / Backend verify-otp
      if (otpToken) {
        try {
          const vRes = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              otp: otpToVerify,
              otpToken: otpToken
            })
          });
          const vData = await vRes.json();
          if (!vData || !vData.success) {
            setOtpError(vData?.message || 'Invalid or expired OTP code. Please check your email.');
            setOtpLoading(false);
            return;
          }
        } catch (e) {
          console.warn('verify-otp API check notice:', e);
        }
      }

      // Step 2: Register account
      let regSuccess = false;
      let userData: any = null;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            registerNumber: cleanReg,
            email: cleanEmail,
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
        } else if (data && data.message && !otpToken) {
          setOtpError(data.message);
          setOtpLoading(false);
          return;
        }
      } catch (e) {}

      // Fallback: Register directly into Supabase
      if (!regSuccess) {
        const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const userRecord = {
          id: newUserId,
          name: formData.name.trim(),
          register_number: cleanReg,
          email: cleanEmail,
          role: 'student',
          department: formData.department,
          year: formData.year,
          section: formData.section,
          gender: formData.gender,
          mobile: formData.phone.trim(),
          status: 'Active',
          created_at: new Date().toISOString()
        };

        try {
          await supabase.from('users').upsert(userRecord, { onConflict: 'register_number' });
        } catch (insErr) {
          console.warn('Supabase upsert warning:', insErr);
        }

        userData = userRecord;
        localStorage.setItem('gasc_token', `gasc_student_jwt_${Date.now()}`);
        regSuccess = true;
      }

      // Sync registered account to competition_registrations table for instant registration status across clients
      try {
        await supabase.from('competition_registrations').insert({
          id: `acc_${Date.now()}_${cleanReg}`,
          competition_id: '__STUDENT_ACCOUNT__',
          student_id: `usr_${cleanReg}`,
          student_name: formData.name.trim(),
          register_number: cleanReg,
          department: formData.department,
          gender: formData.gender,
          remarks: cleanEmail,
          status: 'Active'
        });
      } catch (accErr) {
        console.warn('Account sync error:', accErr);
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

  const isFormSubmittable = 
    verifyStatus?.isPreEnrolled === true &&
    !verifyStatus?.isRegistered &&
    isNameValid(formData.name) &&
    isEmailValid(formData.email) &&
    isPhoneValid(formData.phone) &&
    isPasswordValid(formData.password) &&
    isPasswordMatch &&
    formData.termsAgreed &&
    !loading &&
    !verifying;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #061938 0%, #020817 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative' }}>

      {/* Ambient background glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '780px', background: 'rgba(8, 27, 53, 0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(55,140,255,0.25)', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)', position: 'relative', zIndex: 10 }}>

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
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <span style={{ fontSize: '11px', color: '#6E86A5' }}>Instant College Roster Verification</span>
            </div>

            <div style={{ position: 'relative' }}>
              <BookOpen style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
              <input
                type="text"
                required
                className="input-dark"
                placeholder="e.g. 23UGCS101 or 24UGCO205"
                value={formData.register_number}
                onBlur={() => markTouched('register_number')}
                onChange={e => setFormData({ ...formData, register_number: e.target.value.toUpperCase() })}
                style={{ 
                  paddingLeft: '42px', 
                  paddingRight: verifying ? '42px' : '14px', 
                  fontSize: '15px', 
                  fontWeight: 700, 
                  letterSpacing: '0.5px', 
                  textTransform: 'uppercase',
                  borderColor: verifyStatus?.isPreEnrolled ? '#34D399' : (verifyStatus ? '#F87171' : undefined)
                }}
              />
              {verifying && (
                <Loader2 style={{ width: 18, height: 18, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF', animation: 'spin 1s linear infinite' }} />
              )}
            </div>

            {/* Dynamic Status Indicator */}
            {verifyStatus && (
              <div style={{ marginTop: '10px' }}>
                {verifyStatus.isRegistered ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#F87171' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <span>{verifyStatus.message}</span>
                    </div>
                    <Link to="/student/login" style={{ color: '#38A7FF', fontWeight: 700, textDecoration: 'none', marginLeft: '10px', whiteSpace: 'nowrap' }}>
                      Login Now →
                    </Link>
                  </div>
                ) : verifyStatus.isPreEnrolled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#34D399' }}>
                    <ShieldCheck style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{verifyStatus.message} — Details auto-filled!</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#F87171' }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{verifyStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── STEP 2: STUDENT DETAILS WITH VERIFICATION & VALIDATION ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>

            {/* Full Name */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#AFC4DF' }}>
                  Full Name (Official) <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                {touched.name && isNameValid(formData.name) && (
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle style={{ width: 12, height: 12 }} /> Valid
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <User style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. Arun Kumar S"
                  style={{ 
                    paddingLeft: '38px',
                    borderColor: touched.name && !isNameValid(formData.name) ? '#F87171' : undefined
                  }}
                  value={formData.name}
                  onBlur={() => markTouched('name')}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              {touched.name && !isNameValid(formData.name) && (
                <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                  Name must be at least 3 characters (letters and dots only).
                </span>
              )}
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
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

            {/* Section */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                Section <span style={{ color: '#FF6A21' }}>*</span>
              </label>
              <select
                className="input-dark"
                value={formData.section}
                onChange={e => setFormData({ ...formData, section: e.target.value })}
                style={{ cursor: 'pointer', background: '#031126' }}
              >
                {SECTIONS.map(s => (
                  <option key={s} value={s} style={{ background: '#031126', color: '#FFF' }}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
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

            {/* Mobile Number */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#AFC4DF' }}>
                  Mobile Number (10 Digits) <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                {touched.phone && isPhoneValid(formData.phone) && (
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle style={{ width: 12, height: 12 }} /> Valid
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Phone style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="tel"
                  required
                  className="input-dark"
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  style={{ 
                    paddingLeft: '38px',
                    borderColor: touched.phone && !isPhoneValid(formData.phone) ? '#F87171' : undefined
                  }}
                  value={formData.phone}
                  onBlur={() => markTouched('phone')}
                  onChange={e => {
                    const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, phone: onlyNums });
                  }}
                />
              </div>
              {touched.phone && !isPhoneValid(formData.phone) && (
                <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                  Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.
                </span>
              )}
            </div>

            {/* Email Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#AFC4DF' }}>
                  Email Address (Verification OTP will be sent here) <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                {touched.email && isEmailValid(formData.email) && (
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle style={{ width: 12, height: 12 }} /> Valid email format
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Mail style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="email"
                  required
                  className="input-dark"
                  placeholder="student@gmail.com or your_name@gascidappadi.edu.in"
                  style={{ 
                    paddingLeft: '38px',
                    borderColor: touched.email && !isEmailValid(formData.email) ? '#F87171' : undefined
                  }}
                  value={formData.email}
                  onBlur={() => markTouched('email')}
                  onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                />
              </div>
              {touched.email && !isEmailValid(formData.email) && (
                <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                  Please enter a valid email address (e.g. name@domain.com).
                </span>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#AFC4DF' }}>
                  Password (min 6 chars) <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                {touched.password && isPasswordValid(formData.password) && (
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle style={{ width: 12, height: 12 }} /> Good
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                  style={{ 
                    paddingLeft: '38px', 
                    paddingRight: '38px',
                    borderColor: touched.password && !isPasswordValid(formData.password) ? '#F87171' : undefined
                  }}
                  value={formData.password}
                  onBlur={() => markTouched('password')}
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
              {touched.password && !isPasswordValid(formData.password) && (
                <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                  Password must be at least 6 characters long.
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#AFC4DF' }}>
                  Confirm Password <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                {touched.confirm_password && isPasswordMatch && (
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle style={{ width: 12, height: 12 }} /> Passwords match
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                  style={{ 
                    paddingLeft: '38px', 
                    paddingRight: '38px',
                    borderColor: touched.confirm_password && !isPasswordMatch ? '#F87171' : undefined
                  }}
                  value={formData.confirm_password}
                  onBlur={() => markTouched('confirm_password')}
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
              {touched.confirm_password && !isPasswordMatch && (
                <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                  Passwords do not match. Please verify your password.
                </span>
              )}
            </div>
          </div>

          {/* Terms checkbox */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#AFC4DF' }}>
              <input
                type="checkbox"
                required
                checked={formData.termsAgreed}
                onChange={e => {
                  setFormData({ ...formData, termsAgreed: e.target.checked });
                  markTouched('termsAgreed');
                }}
                style={{ marginTop: '2px', accentColor: '#1677FF', width: 16, height: 16 }}
              />
              <span>I confirm that I am a bonafide student of GASC Idappadi and agree to adhere to the official College Sports Code of Conduct.</span>
            </label>
            {touched.termsAgreed && !formData.termsAgreed && (
              <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '4px' }}>
                You must accept the Code of Conduct & Terms to register.
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormSubmittable}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              justifyContent: 'center',
              opacity: isFormSubmittable ? 1 : 0.6,
              cursor: isFormSubmittable ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                <span>Sending Email Verification OTP...</span>
              </>
            ) : verifyStatus && !verifyStatus.isPreEnrolled ? (
              <>
                <AlertCircle style={{ width: 18, height: 18 }} />
                <span>Registration Not Allowed (Not in College Roster)</span>
              </>
            ) : (
              <>
                <span>Send Email Verification OTP</span>
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

            {/* Key Icon */}
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

            <div style={{ background: 'rgba(56,167,255,0.08)', border: '1px solid rgba(56,167,255,0.2)', padding: '10px 14px', borderRadius: '10px', marginBottom: '20px', fontSize: '12px', color: '#AFC4DF', textAlign: 'center' }}>
              📩 Please check your <strong>Inbox</strong> and <strong>Spam folder</strong>.
            </div>

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
                  <span>Verifying Code & Logging In...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Complete Registration</span>
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
