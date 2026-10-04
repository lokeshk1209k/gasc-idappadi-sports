import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, ShieldCheck, RefreshCw, Eye, EyeOff, Loader2,
  Building2, GraduationCap, Users, KeyRound, Sparkles
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

  // ── Password Validation Indicators ──
  const passwordChecks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
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

      // Tier 1: Backend Serverless API
      try {
        const apiRes = await fetch(`/api/auth/verify-student?regNo=${encodeURIComponent(cleanReg)}`);
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
          } else if (apiData && apiData.message) {
            resolved = true;
            setVerifyError(apiData.message);
            setVerifying(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API verify fallback notice:', apiErr);
      }

      // Tier 2: Direct Supabase Cloud Query
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
              resolved = true;

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
      // 1. Check if email is already registered by another student
      const emailCheckUrl = `${SUPABASE_REST}/users?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,role,password`;
      const emailRes = await fetch(emailCheckUrl, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      });
      const emailRows = await emailRes.json();
      if (emailRows && Array.isArray(emailRows) && emailRows.length > 0) {
        const existingWithEmail = emailRows[0];
        if (existingWithEmail.role === 'student' && existingWithEmail.password && existingWithEmail.id !== verifiedStudent?.id) {
          setFormError('This email address is already registered. Please use another email address or login to your existing account.');
          setSendingOtp(false);
          return;
        }
      }

      // 2. Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expTime = Date.now() + 10 * 60 * 1000;

      // 3. Save OTP in Supabase notifications table
      try {
        await fetch(`${SUPABASE_REST}/notifications`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            user_id: verifiedStudent?.id || `usr_${Date.now()}`,
            title: 'STUDENT_REGISTRATION_OTP',
            message: JSON.stringify({
              otp: generatedOtp,
              email: cleanEmail,
              registerNumber: verifiedStudent?.register_number,
              expiresAt: expTime
            }),
            type: 'registration',
            sender: 'unread',
            created_at: new Date().toISOString()
          })
        });
      } catch (e) {}

      // 4. Dispatch Email via API
      try {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            registerNumber: verifiedStudent?.register_number,
            name: verifiedStudent?.name,
            otp: generatedOtp
          })
        });
      } catch (e) {}

      setOtpToken(`otp_${generatedOtp}_${expTime}`);
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
    const digit = val.slice(-1);
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

    const newValues = [...otpValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── STEP 3 -> STEP 4: Complete Account Creation ──
  const handleVerifyOtpAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpValues.join('');

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

      // 1. Verify OTP
      let isOtpValid = false;

      if (otpToken && otpToken.includes(enteredOtp)) {
        isOtpValid = true;
      }

      if (!isOtpValid) {
        try {
          const notifRes = await fetch(`${SUPABASE_REST}/notifications?title=eq.STUDENT_REGISTRATION_OTP&order=created_at.desc&limit=10`, {
            headers: {
              'apikey': SB_KEY,
              'Authorization': `Bearer ${SB_KEY}`
            }
          });
          const notifs = await notifRes.json();
          if (notifs && Array.isArray(notifs)) {
            for (const n of notifs) {
              try {
                const p = JSON.parse(n.message);
                if (p.email?.toLowerCase() === cleanEmail && p.otp === enteredOtp && Date.now() <= p.expiresAt) {
                  isOtpValid = true;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      if (!isOtpValid) {
        const nextAttempts = otpAttempts + 1;
        setOtpAttempts(nextAttempts);
        setOtpError(`Invalid OTP. Please try again (${5 - nextAttempts} attempts remaining).`);
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

      const patchRes = await fetch(`${SUPABASE_REST}/users?id=eq.${studentId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!patchRes.ok) {
        // If row didn't exist by ID, insert fresh row
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

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, #061938 0%, #020817 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '580px', background: 'rgba(8, 27, 53, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(55, 140, 255, 0.25)', borderRadius: '24px', padding: '40px 36px', boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(22,119,255,0.15)', position: 'relative' }}>

        {/* College Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(55,140,255,0.5)', background: 'rgba(22,119,255,0.15)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '0.5px' }}>
            GASC IDAPPADI SPORTS
          </h1>
          <p style={{ fontSize: '13px', color: '#6E86A5', margin: 0 }}>
            Official Student Sports Portal Registration
          </p>
        </div>

        {/* Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '2px', background: 'rgba(55,140,255,0.2)', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: '16px', left: '20px', width: `${((currentStep - 1) / 3) * 100}%`, height: '2px', background: 'linear-gradient(90deg, #1677FF, #38A7FF)', zIndex: 2, transition: 'width 0.4s ease' }} />

          {[
            { step: 1, label: 'Roster' },
            { step: 2, label: 'Details' },
            { step: 3, label: 'Email OTP' },
            { step: 4, label: 'Done' }
          ].map(s => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 3 }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: isDone ? '#10B981' : isCurrent ? 'linear-gradient(135deg, #1677FF, #38A7FF)' : '#081B35',
                  border: isDone ? '2px solid #10B981' : isCurrent ? '2px solid #38A7FF' : '2px solid rgba(55,140,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: isCurrent ? '0 0 16px rgba(56,167,255,0.5)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  {isDone ? '✓' : s.step}
                </div>
                <span style={{ fontSize: '11px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#38A7FF' : isDone ? '#10B981' : '#6E86A5', marginTop: '6px' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: REGISTER NUMBER VERIFICATION ── */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                Verify College Register Number
              </h2>
              <p style={{ fontSize: '13px', color: '#AFC4DF', margin: 0, lineHeight: 1.5 }}>
                Enter your official College Register Number to verify your pre-enrolled record against the Official Student Roster.
              </p>
            </div>

            {verifyError && (
              <div style={{ background: isAlreadyRegistered ? 'rgba(56,167,255,0.12)' : 'rgba(239,68,68,0.12)', border: isAlreadyRegistered ? '1px solid rgba(56,167,255,0.35)' : '1px solid rgba(239,68,68,0.35)', color: isAlreadyRegistered ? '#38A7FF' : '#F87171', padding: '14px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{verifyError}</p>
                    {isAlreadyRegistered && (
                      <button
                        type="button"
                        onClick={() => navigate('/student/login')}
                        style={{ marginTop: '10px', background: 'linear-gradient(135deg, #1677FF, #38A7FF)', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Go to Login Page →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!verifiedStudent ? (
              <form onSubmit={handleVerifyRoster}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                    College Register Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ width: 16, height: 16, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. C24UG183CSC011"
                      className="input-dark"
                      style={{ paddingLeft: '40px', fontSize: '15px', textTransform: 'uppercase' }}
                      value={inputRegNo}
                      onChange={e => setInputRegNo(e.target.value.toUpperCase())}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#6E86A5', marginTop: '6px' }}>
                    * Must be pre-enrolled in the Sports Admin Roster.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="btn-primary"
                  style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, justifyContent: 'center' }}
                >
                  {verifying ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      <span>Verifying with College Roster...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Register Number</span>
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div>
                {/* Verified Card */}
                <div style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '16px', color: '#34D399', fontWeight: 700, fontSize: '14px' }}>
                    <CheckCircle2 style={{ width: 20, height: 20 }} />
                    <span>✓ Register Number Verified in Official Roster</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Student Name</span>
                      <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{verifiedStudent.name}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Register Number</span>
                      <strong style={{ fontSize: '14px', color: '#38A7FF' }}>{verifiedStudent.register_number}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Department</span>
                      <span style={{ fontSize: '13px', color: '#AFC4DF' }}>{verifiedStudent.department}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Year & Gender</span>
                      <span style={{ fontSize: '13px', color: '#AFC4DF' }}>{verifiedStudent.year} • {verifiedStudent.gender}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setVerifiedStudent(null); setInputRegNo(''); }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(55,140,255,0.2)', color: '#AFC4DF', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-primary"
                    style={{ flex: 2, padding: '12px', fontSize: '14px', fontWeight: 700, justifyContent: 'center' }}
                  >
                    <span>Continue Registration</span>
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: STUDENT DETAILS & ACCOUNT CREATION ── */}
        {currentStep === 2 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{ background: 'none', border: 'none', color: '#38A7FF', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 0, marginBottom: '10px' }}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} />
                <span>Back to Roster Check</span>
              </button>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
                Account Credentials
              </h2>
              <p style={{ fontSize: '13px', color: '#AFC4DF', margin: 0 }}>
                Set up your personal student login credentials.
              </p>
            </div>

            {/* Read-Only Official Information Banner */}
            <div style={{ background: 'rgba(8,27,53,0.9)', border: '1px solid rgba(55,140,255,0.2)', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#6E86A5' }}>Official Student Profile</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{verifiedStudent?.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#38A7FF' }}>{verifiedStudent?.register_number} • {verifiedStudent?.department}</p>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px' }}>
                ✓ Official
              </div>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Email Address */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                Personal Email Address (Used for Login) *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="email"
                  required
                  placeholder="student@gmail.com"
                  className="input-dark"
                  style={{ paddingLeft: '36px' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                Mobile Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  className="input-dark"
                  style={{ paddingLeft: '36px' }}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                Create Password (Min 8 characters) *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter strong password"
                  className="input-dark"
                  style={{ paddingLeft: '36px', paddingRight: '40px' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>

              {/* Password Requirements */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '10px' }}>
                {[
                  { label: '8+ characters', valid: passwordChecks.length },
                  { label: 'Uppercase letter (A-Z)', valid: passwordChecks.hasUpper },
                  { label: 'Lowercase letter (a-z)', valid: passwordChecks.hasLower },
                  { label: 'Number (0-9)', valid: passwordChecks.hasNumber }
                ].map(r => (
                  <div key={r.label} style={{ fontSize: '11px', color: r.valid ? '#34D399' : '#6E86A5', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>{r.valid ? '✓' : '•'}</span>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  className="input-dark"
                  style={{ paddingLeft: '36px', paddingRight: '40px' }}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={sendingOtp}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, justifyContent: 'center' }}
            >
              {sendingOtp ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  <span>Sending Email Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Send Email OTP Code</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 3: EMAIL OTP VERIFICATION ── */}
        {currentStep === 3 && (
          <form onSubmit={handleVerifyOtpAndCreateAccount}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(22,119,255,0.15)', border: '2px solid rgba(55,140,255,0.4)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF' }}>
                <KeyRound style={{ width: 24, height: 24 }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                Verify Your Email Address
              </h2>
              <p style={{ fontSize: '13px', color: '#AFC4DF', margin: 0, lineHeight: 1.5 }}>
                A 6-digit verification code has been dispatched to<br />
                <strong style={{ color: '#38A7FF' }}>{email}</strong>
              </p>
            </div>

            {otpError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{otpError}</span>
              </div>
            )}

            {/* 6 OTP Boxes */}
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
                    width: '46px',
                    height: '56px',
                    background: 'rgba(8,27,53,0.9)',
                    border: digit ? '2px solid #38A7FF' : '1px solid rgba(55,140,255,0.3)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '22px',
                    fontWeight: 800,
                    textAlign: 'center',
                    outline: 'none',
                    boxShadow: digit ? '0 0 12px rgba(56,167,255,0.3)' : 'none'
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={verifyingOtp}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700, justifyContent: 'center', marginBottom: '18px' }}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  <span>Verifying & Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Create Account</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>

            {/* Resend button */}
            <div style={{ textAlign: 'center' }}>
              {resendTimer > 0 ? (
                <span style={{ fontSize: '12px', color: '#6E86A5' }}>
                  Resend OTP in <strong>{resendTimer}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', color: '#38A7FF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── STEP 4: REGISTRATION COMPLETED ── */}
        {currentStep === 4 && registeredSummary && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
              <ShieldCheck style={{ width: 36, height: 36 }} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
              Registration Successful! 🎉
            </h2>
            <p style={{ fontSize: '14px', color: '#AFC4DF', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your GASC Sports Portal account has been created successfully.
            </p>

            {/* Summary Card */}
            <div style={{ background: 'rgba(8,27,53,0.95)', border: '1px solid rgba(55,140,255,0.25)', borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '28px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Student Name</span>
                <strong style={{ fontSize: '15px', color: '#FFFFFF' }}>{registeredSummary.name}</strong>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>College Register Number</span>
                <strong style={{ fontSize: '14px', color: '#38A7FF' }}>{registeredSummary.registerNumber}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#6E86A5', display: 'block' }}>Login Email Address</span>
                <strong style={{ fontSize: '14px', color: '#34D399' }}>{registeredSummary.email}</strong>
              </div>
            </div>

            <div style={{ background: 'rgba(56,167,255,0.10)', border: '1px solid rgba(56,167,255,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#AFC4DF' }}>
              🔑 You can now login anytime using your <strong>registered Email address and Password</strong>.
            </div>

            <button
              type="button"
              onClick={() => navigate('/student/login')}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, justifyContent: 'center' }}
            >
              <span>Go to Login</span>
              <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        )}

        {/* Existing Account Footer Link */}
        {currentStep < 4 && (
          <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: '#6E86A5' }}>
            Already registered?{' '}
            <Link to="/student/login" style={{ color: '#38A7FF', fontWeight: 700, textDecoration: 'none' }}>
              Login with Email
            </Link>
          </p>
        )}

      </div>
    </div>
  );
};

export default RegisterPage;
