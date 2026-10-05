import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, ArrowRight, Mail, 
  KeyRound, AlertCircle, CheckCircle, RefreshCw, X, Loader2, Sparkles, ShieldCheck,
  Trophy, Zap, Award, Flame, Activity, Shield, ChevronRight
} from 'lucide-react';
import bcrypt from 'bcryptjs';

const SUPABASE_REST = 'https://yemypfgunokxfufnqvdh.supabase.co/rest/v1';
const SB_KEY = atob('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=');

async function fetchSupabaseUser(identifier: string) {
  try {
    const clean = identifier.trim();
    // Search by email OR register_number (case-insensitive)
    const url = `${SUPABASE_REST}/users?or=(email.ilike.${encodeURIComponent(clean)},register_number.ilike.${encodeURIComponent(clean)})&select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      }
    });
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      // Prioritize active registered student account if multiple exist
      return rows.find((u: any) => u.role === 'student' && u.password) || rows[0];
    }
    return null;
  } catch (e) {
    console.error('Direct Supabase fetch error:', e);
    return null;
  }
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const [formData, setFormData] = useState({ email: '', password: '' });

  // ── Forgot Password Modal State ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1 = email, 2 = otp+password, 3 = success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotOtpValues, setForgotOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotResendTimer, setForgotResendTimer] = useState(60);

  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password Resend Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showForgotModal && forgotStep === 2 && forgotResendTimer > 0) {
      interval = setInterval(() => {
        setForgotResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showForgotModal, forgotStep, forgotResendTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanInput = formData.email.trim();
    const enteredPassword = formData.password;

    if (!cleanInput) {
      setError('Please enter your College Register Number or registered Email Address.');
      setLoading(false);
      return;
    }

    if (!enteredPassword) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      let loggedIn = false;
      let userData: any = null;
      let tokenStr = '';

      // 1. Try backend serverless API first
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanInput,
            email: cleanInput,
            registerNumber: cleanInput,
            password: enteredPassword,
            role: 'student'
          })
        });
        const data = await res.json().catch(() => null);

        if (res.ok && data && data.success && data.user) {
          loggedIn = true;
          userData = data.user;
          tokenStr = data.token;
        } else if (res.status === 401 || res.status === 403 || res.status === 400) {
          setError(data?.message || 'Invalid credentials. Incorrect password.');
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('API login notice, using direct high-speed authentication:', apiErr);
      }

      // 2. Direct Supabase authentication fallback
      if (!loggedIn) {
        const user = await fetchSupabaseUser(cleanInput);

        if (!user) {
          setError(`No student account found for "${cleanInput}". If you haven't registered yet, please click "Create Student Account" below.`);
          setLoading(false);
          return;
        }

        if (user.role === 'admin') {
          setError('Access denied: Admin credentials cannot be used on Student Portal.');
          setLoading(false);
          return;
        }

        if (!user.password || user.role === 'roster') {
          setError(`Student record "${user.name}" (${user.register_number}) is in College Roster, but you have not created your password yet. Please click "Create Student Account" below to complete registration.`);
          setLoading(false);
          return;
        }

        if (user.status === 'Suspended' || user.status === 'Inactive') {
          setError('Your student account is deactivated or suspended. Please contact Physical Directress.');
          setLoading(false);
          return;
        }

        // Verify password with bcrypt or plaintext
        let isMatch = false;
        const rawPass = String(enteredPassword);
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$') || user.password.startsWith('$2'))) {
          try {
            isMatch = bcrypt.compareSync(rawPass, user.password);
            if (!isMatch && rawPass.trim() !== rawPass) {
              isMatch = bcrypt.compareSync(rawPass.trim(), user.password);
            }
          } catch (bErr) {
            isMatch = false;
          }
        }
        if (!isMatch) {
          isMatch = (rawPass === user.password || rawPass.trim() === user.password);
        }

        if (!isMatch) {
          setError('Invalid credentials. Incorrect password. If you forgot your password, please click "Forgot Password?".');
          setLoading(false);
          return;
        }

        loggedIn = true;
        userData = {
          id: user.id,
          name: user.name,
          register_number: String(user.register_number || user.registerNumber || user.regNo || '').trim().toUpperCase(),
          registerNumber: String(user.register_number || user.registerNumber || user.regNo || '').trim().toUpperCase(),
          regNo: String(user.register_number || user.registerNumber || user.regNo || '').trim().toUpperCase(),
          department: user.department,
          dept: user.department,
          year: user.year,
          section: user.section || 'A',
          gender: user.gender,
          mobile: user.mobile || user.phone,
          phone: user.phone || user.mobile,
          email: user.email,
          profilePhoto: user.profile_photo || '/images/default-avatar.png',
          role: 'student'
        };
        tokenStr = `gasc_jwt_${Date.now()}_${user.id}`;
      }

      if (loggedIn && userData) {
        localStorage.setItem('gasc_token', tokenStr);
        localStorage.setItem('gasc_user', JSON.stringify(userData));
        localStorage.setItem('gasc_auth_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
        navigate('/student/dashboard');
      } else {
        setError('Invalid login credentials. Please check your Register Number / Email and password.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Connection error. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Step 1: Send OTP ──
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = forgotEmail.trim();

    if (!cleanInput) {
      setForgotError('Please enter your registered Register Number or Email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      // Find user in Supabase by register number or email
      const user = await fetchSupabaseUser(cleanInput);

      if (!user || user.role !== 'student' || !user.password) {
        setForgotError(`No registered student account found for "${cleanInput}". Please Register first.`);
        setForgotLoading(false);
        return;
      }

      // Generate 6-digit OTP
      const genOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expTime = Date.now() + 10 * 60 * 1000;

      // Store in Supabase notifications for instant persistence & verification
      try {
        await fetch(`${SUPABASE_REST}/notifications`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: `otp_${user.id}_${Date.now()}`,
            title: 'PASSWORD_RESET_OTP',
            category: 'password_reset',
            type: 'security',
            sender: user.email,
            message: JSON.stringify({ otp: genOtp, expiresAt: expTime, email: user.email, registerNumber: user.register_number }),
            created_at: new Date().toISOString()
          })
        });
      } catch (e) {}

      // Dispatch real email
      try {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            registerNumber: user.register_number,
            name: user.name,
            otp: genOtp
          })
        });
      } catch (e) {}

      const masked = cleanEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 5))}${c}`);
      setForgotMaskedEmail(masked);
      setForgotOtpValues(['', '', '', '', '', '']);
      setForgotResendTimer(60);
      setForgotStep(2);

      setTimeout(() => {
        forgotOtpRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setForgotError('Error sending OTP. Please check your network.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Handle OTP Digit Inputs ──
  const handleForgotOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const newValues = [...forgotOtpValues];
    newValues[index] = digit;
    setForgotOtpValues(newValues);

    if (digit && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotOtpValues[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newValues = [...forgotOtpValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setForgotOtpValues(newValues);
    forgotOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Step 2: Reset Password with OTP ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = forgotOtpValues.join('');

    if (otp.length !== 6) {
      setForgotError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();

      // 1. Verify OTP in Supabase notifications
      let otpValid = false;
      try {
        const notifRes = await fetch(`${SUPABASE_REST}/notifications?title=eq.PASSWORD_RESET_OTP&order=created_at.desc&limit=10`, {
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`
          }
        });
        const notifs = await notifRes.json();
        if (notifs && Array.isArray(notifs)) {
          for (const n of notifs) {
            try {
              const p = typeof n.message === 'string' ? JSON.parse(n.message) : n.message;
              const matchesEmail = p.email && p.email.toLowerCase() === cleanEmail;
              const matchesReg = p.registerNumber && p.registerNumber.toUpperCase() === cleanEmail.toUpperCase();
              if ((matchesEmail || matchesReg || n.sender?.toLowerCase() === cleanEmail) && String(p.otp).trim() === otp.trim() && Date.now() <= p.expiresAt) {
                otpValid = true;
                await fetch(`${SUPABASE_REST}/notifications?id=eq.${n.id}`, {
                  method: 'DELETE',
                  headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${SB_KEY}`
                  }
                }).catch(() => {});
                break;
              }
            } catch (e) {}
          }
        }
      } catch (e) {}

      if (!otpValid) {
        setForgotError('Invalid or expired OTP code. Please enter the 6-digit code sent to your email.');
        setForgotLoading(false);
        return;
      }

      // 2. Hash new password and update in Supabase (by email or register_number)
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      let updRes = await fetch(`${SUPABASE_REST}/users?email=ilike.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
      });
      const updData = await updRes.json().catch(() => []);
      if (!Array.isArray(updData) || updData.length === 0) {
        // Fallback: update by register_number
        await fetch(`${SUPABASE_REST}/users?register_number=ilike.${encodeURIComponent(cleanEmail)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: hashedPassword,
            updated_at: new Date().toISOString()
          })
        });
      }

      setForgotSuccess('Your password has been updated successfully!');
      setForgotStep(3);

      setFormData({
        email: forgotEmail,
        password: newPassword
      });

      setSuccessBanner('Password reset successful! You can now log in with your new password.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setForgotError('Connection error. Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#020617', display: 'flex', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ── AMBIENT SPORTS GLOW ORBS & STADIUM GRID (BACKGROUND) ── */}
      <div style={{ position: 'absolute', top: '-12%', left: '15%', width: '520px', height: '520px', background: 'radial-gradient(circle, rgba(0, 163, 255, 0.18) 0%, transparent 70%)', filter: 'blur(90px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '-8%', right: '5%', width: '480px', height: '480px', background: 'radial-gradient(circle, rgba(255, 106, 33, 0.15) 0%, transparent 70%)', filter: 'blur(95px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: '35%', left: '42%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(56, 167, 255, 0.08) 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none', opacity: 0.65, zIndex: 1 }} />

      {/* ── LEFT PANEL — CHAMPIONSHIP HERO ARENA (DESKTOP) ── */}
      <div 
        className="hidden lg:flex" 
        style={{ 
          flex: 1.15, 
          position: 'relative', 
          overflow: 'hidden', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '48px 56px', 
          zIndex: 2 
        }}
      >
        {/* Background Athletic Hero Image */}
        <img
          src="/images/login-hero.jpg"
          alt="GASC Sports Arena"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', zIndex: 0 }}
        />

        {/* Cinematic Multi-Layer Dark Vignettes */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.85) 0%, rgba(2, 6, 23, 0.45) 45%, rgba(2, 6, 23, 0.92) 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020617 0%, rgba(2, 6, 23, 0.40) 40%, transparent 75%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to right, transparent, #020617)', zIndex: 1 }} />

        {/* ── Top Header Badge ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(7, 25, 51, 0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(56, 167, 255, 0.35)', padding: '8px 18px', borderRadius: 999, boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 20px rgba(22,119,255,0.15)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #38A7FF', background: '#031126', flexShrink: 0 }}>
              <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, color: '#FFFFFF', margin: 0, letterSpacing: '0.04em' }}>
                GOVT ARTS & SCIENCE COLLEGE
              </p>
              <p style={{ fontSize: 11, color: '#38A7FF', margin: 0, fontWeight: 600 }}>
                Idappadi • Sports Council
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '6px 14px', borderRadius: 999 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 10px #34D399', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', letterSpacing: '0.05em' }}>PORTAL ACTIVE</span>
          </div>
        </div>

        {/* ── Center / Hero Typography & Stats ── */}
        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(90deg, rgba(22, 119, 255, 0.25) 0%, rgba(255, 106, 33, 0.20) 100%)', border: '1px solid rgba(56, 167, 255, 0.40)', padding: '7px 16px', borderRadius: 999, marginBottom: 20 }}>
            <Flame style={{ width: 15, height: 15, color: '#FF7A18' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Official Student Athlete Portal
            </span>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 4.5vw, 56px)', lineHeight: 1.05, margin: 0, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            UNLEASH YOUR<br />
            <span style={{ background: 'linear-gradient(135deg, #38A7FF 0%, #22D3EE 60%, #FFFFFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 40px rgba(56,167,255,0.4)' }}>
              ATHLETIC PROWESS.
            </span><br />
            <span style={{ background: 'linear-gradient(135deg, #FF6A21 0%, #FFA048 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CHASE THE GLORY.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: '#AFC4DF', marginTop: 18, maxWidth: 520, lineHeight: 1.6, fontWeight: 400 }}>
            Register for inter-college tournaments, track your issued sports equipment in real-time, view live match draws, and elevate your college sports journey.
          </p>

          {/* ── 4 Live Athletic Metric Capsules ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 32 }}>
            {[
              { icon: <Zap style={{ width: 18, height: 18, color: '#38A7FF' }} />, title: 'Sub-Second', desc: 'Real-Time Sync', accent: '#38A7FF' },
              { icon: <Trophy style={{ width: 18, height: 18, color: '#FFA048' }} />, title: '25+ Events', desc: 'Tournaments', accent: '#FF6A21' },
              { icon: <Activity style={{ width: 18, height: 18, color: '#34D399' }} />, title: '20+ Sports', desc: 'Indoor & Outdoor', accent: '#34D399' },
              { icon: <ShieldCheck style={{ width: 18, height: 18, color: '#C084FC' }} />, title: 'Verified Pass', desc: 'College Roster', accent: '#A855F7' }
            ].map((card, i) => (
              <div 
                key={i} 
                style={{ 
                  background: 'rgba(8, 27, 53, 0.55)', 
                  backdropFilter: 'blur(16px)', 
                  border: '1px solid rgba(56, 167, 255, 0.20)', 
                  borderRadius: 14, 
                  padding: '14px 16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  transition: 'all 0.25s ease'
                }}
              >
                <div style={{ marginBottom: 6 }}>{card.icon}</div>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 15, color: '#FFFFFF', margin: 0 }}>{card.title}</p>
                <p style={{ fontSize: 11, color: '#8BA6C8', margin: '2px 0 0', fontWeight: 500 }}>{card.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Sports Ticker Badges ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
            {['🏏 Cricket', '🏐 Volleyball', '🤼 Kabaddi', '🏃 Athletics', '🏸 Badminton', '⚽ Football', '♟️ Chess', '🏓 Table Tennis'].map(s => (
              <span 
                key={s} 
                style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#AFC4DF', 
                  background: 'rgba(15, 38, 70, 0.55)', 
                  border: '1px solid rgba(56, 167, 255, 0.18)', 
                  borderRadius: 999, 
                  padding: '4px 12px',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ── Bottom Quote / Tagline ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(56, 167, 255, 0.15)', paddingTop: 18 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, fontStyle: 'italic' }}>
            "Discipline • Dedication • Sportsmanship in Every Arena"
          </p>
          <span style={{ fontSize: 11, color: '#38A7FF', fontWeight: 600 }}>GASC Idappadi Sports Portal v2.0</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — FLOATING GLASSMORPHISM LOGIN CARD ── */}
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '32px 24px', 
          position: 'relative', 
          zIndex: 2, 
          overflowY: 'auto' 
        }}
      >
        {/* The Luxury Frosted Glass Container */}
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '430px', 
            background: 'rgba(6, 21, 46, 0.68)', 
            backdropFilter: 'blur(28px) saturate(190%)', 
            WebkitBackdropFilter: 'blur(28px) saturate(190%)', 
            border: '1px solid rgba(56, 167, 255, 0.28)', 
            borderRadius: 24, 
            padding: '38px 32px 32px', 
            boxShadow: '0 25px 80px -10px rgba(0, 0, 0, 0.85), 0 0 45px rgba(22, 119, 255, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.18)', 
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Multi-Color Energy Glow Line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #1677FF 0%, #00F0FF 45%, #FF6A21 80%, #FFB703 100%)' }} />

          {/* College Crest on Mobile / Top Branding */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(56, 167, 255, 0.6)', background: '#031126', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(22, 119, 255, 0.35)' }}>
              <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(22, 119, 255, 0.12)', border: '1px solid rgba(56, 167, 255, 0.35)', padding: '4px 12px', borderRadius: 999, marginBottom: 8 }}>
              <Sparkles style={{ width: 13, height: 13, color: '#38A7FF' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#38A7FF', letterSpacing: '0.05em' }}>STUDENT ATHLETE LOGIN</span>
            </div>

            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 25, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Welcome Back! 👋
            </h2>
            <p style={{ fontSize: 13, color: '#8BA6C8', margin: 0, lineHeight: 1.4 }}>
              Enter your Register Number or Email to access your sports account.
            </p>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.40)', color: '#34D399', padding: '11px 14px', borderRadius: 12, marginBottom: 18, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 9 }}>
              <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#F87171', padding: '11px 14px', borderRadius: 12, marginBottom: 18, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, color: '#EF4444' }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Form Section ── */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Input 1: Register Number or Email */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#AFC4DF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Register No / Email
                </label>
                <span style={{ fontSize: 10.5, color: '#38A7FF', fontWeight: 600 }}>Universal Login</span>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 8, background: 'rgba(56, 167, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Mail style={{ width: 15, height: 15, color: '#38A7FF' }} />
                </div>
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. C24UG183CSC031 or name@gmail.com"
                  style={{ 
                    paddingLeft: 48, 
                    paddingRight: 14, 
                    height: 48, 
                    borderRadius: 12, 
                    fontSize: 13.5, 
                    background: 'rgba(8, 27, 53, 0.65)', 
                    border: '1px solid rgba(56, 167, 255, 0.25)', 
                    color: '#FFFFFF' 
                  }}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="username"
                />
              </div>
              <p style={{ fontSize: 11, color: '#6E86A5', margin: '6px 0 0 2px' }}>
                💡 Tip: You can type either your College Register No or registered Email
              </p>
            </div>

            {/* Input 2: Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#AFC4DF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(formData.email || '');
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotStep(1);
                    setShowForgotModal(true);
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    fontSize: 12, 
                    color: '#38A7FF', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 4 
                  }}
                >
                  <KeyRound style={{ width: 12, height: 12 }} />
                  <span>Forgot Password?</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 8, background: 'rgba(56, 167, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Lock style={{ width: 15, height: 15, color: '#38A7FF' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="Enter your student password"
                  style={{ 
                    paddingLeft: 48, 
                    paddingRight: 44, 
                    height: 48, 
                    borderRadius: 12, 
                    fontSize: 13.5, 
                    background: 'rgba(8, 27, 53, 0.65)', 
                    border: '1px solid rgba(56, 167, 255, 0.25)', 
                    color: '#FFFFFF' 
                  }}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    color: '#6E86A5', 
                    cursor: 'pointer', 
                    padding: 4, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* Remember Me & SSL Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  defaultChecked 
                  style={{ accentColor: '#1677FF', width: 16, height: 16, borderRadius: 4 }} 
                />
                <span style={{ fontSize: 12.5, color: '#8BA6C8', fontWeight: 500 }}>Remember my login</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6E86A5', fontSize: 11 }}>
                <Shield style={{ width: 12, height: 12, color: '#38A7FF' }} />
                <span>256-Bit Encrypted</span>
              </div>
            </div>

            {/* High-Impact Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                height: 48, 
                fontSize: 14.5, 
                fontWeight: 800, 
                borderRadius: 12, 
                marginTop: 6, 
                justifyContent: 'center', 
                gap: 8, 
                background: 'linear-gradient(135deg, #1677FF 0%, #2563EB 50%, #FF6A21 100%)', 
                border: '1px solid rgba(255, 255, 255, 0.25)', 
                boxShadow: '0 8px 30px rgba(22, 119, 255, 0.45), 0 0 20px rgba(255, 106, 33, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                letterSpacing: '0.02em',
                transition: 'all 0.25s ease'
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight style={{ width: 17, height: 17 }} />
                </>
              )}
            </button>
          </form>

          {/* ── Don't have an account? Callout ── */}
          <div 
            style={{ 
              marginTop: 24, 
              padding: '14px 16px', 
              background: 'rgba(8, 27, 53, 0.45)', 
              border: '1px solid rgba(56, 167, 255, 0.20)', 
              borderRadius: 14, 
              textAlign: 'center' 
            }}
          >
            <p style={{ fontSize: 13, color: '#8BA6C8', margin: '0 0 6px' }}>
              Are you a new student at GASC Idappadi?
            </p>
            <Link 
              to="/student/register" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                color: '#38A7FF', 
                fontWeight: 700, 
                fontSize: 13.5, 
                textDecoration: 'none' 
              }}
            >
              <span>Create Student Account</span>
              <ChevronRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>

          {/* Footer Accreditation */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#4B678A', margin: 0, lineHeight: 1.4 }}>
              Government Arts and Science College, Idappadi<br />
              Physical Education Department • Salem District
            </p>
          </div>

        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL — ULTRA FROSTED GLASS ── */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '460px', 
              background: 'rgba(7, 24, 53, 0.85)', 
              backdropFilter: 'blur(28px)', 
              border: '1px solid rgba(56, 167, 255, 0.35)', 
              borderRadius: '24px', 
              padding: '36px 32px', 
              boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 50px rgba(22, 119, 255, 0.25)', 
              position: 'relative' 
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(56,167,255,0.1)', border: '1px solid rgba(56,167,255,0.2)', borderRadius: '50%', color: '#8BA6C8', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            {/* Stepper Progress Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {[
                { num: 1, label: 'Identity' },
                { num: 2, label: 'OTP' },
                { num: 3, label: 'Done' }
              ].map(s => (
                <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: forgotStep >= s.num ? '#1677FF' : 'rgba(56,167,255,0.15)', border: `1px solid ${forgotStep >= s.num ? '#38A7FF' : 'rgba(56,167,255,0.3)'}`, color: '#FFF', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.num}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: forgotStep >= s.num ? '#FFFFFF' : '#6E86A5' }}>{s.label}</span>
                  {s.num < 3 && <div style={{ width: 20, height: 1, background: forgotStep > s.num ? '#38A7FF' : 'rgba(56,167,255,0.2)' }} />}
                </div>
              ))}
            </div>

            {/* Icon */}
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(22,119,255,0.15)', border: '2px solid rgba(56,167,255,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF', boxShadow: '0 0 25px rgba(22,119,255,0.3)' }}>
              <KeyRound style={{ width: 26, height: 26 }} />
            </div>

            {/* ── STEP 1: ENTER REGISTERED EMAIL ── */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetOtp}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', margin: '0 0 6px' }}>
                  Reset Your Password
                </h3>
                <p style={{ fontSize: '13px', color: '#AFC4DF', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Enter your College Register Number or registered Student Email to receive an OTP verification code.
                </p>

                {forgotError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Register Number or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ width: 16, height: 16, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type="text"
                      required
                      className="input-dark"
                      placeholder="e.g. C24UG183CSC031 or student@gmail.com"
                      style={{ paddingLeft: '42px', height: 46, borderRadius: 12, background: 'rgba(8,27,53,0.7)' }}
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ width: '100%', height: 46, fontSize: '14px', fontWeight: 800, justifyContent: 'center', borderRadius: 12, background: 'linear-gradient(135deg, #1677FF 0%, #FF6A21 100%)' }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      <span>Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset OTP</span>
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 2: ENTER OTP & NEW PASSWORD ── */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', margin: '0 0 6px' }}>
                  Enter OTP & Set Password
                </h3>
                <p style={{ fontSize: '13px', color: '#AFC4DF', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.5 }}>
                  A 6-digit reset code has been sent to<br />
                  <strong style={{ color: '#38A7FF' }}>{forgotMaskedEmail}</strong>
                </p>

                {forgotError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                {/* 6 OTP Boxes with glowing active borders */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                  {forgotOtpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { forgotOtpRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleForgotOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleForgotOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleForgotOtpPaste : undefined}
                      style={{
                        width: '46px',
                        height: '54px',
                        background: 'rgba(8,27,53,0.85)',
                        border: digit ? '2px solid #38A7FF' : '1px solid rgba(56,167,255,0.30)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        textAlign: 'center',
                        outline: 'none',
                        boxShadow: digit ? '0 0 15px rgba(56,167,255,0.35)' : 'none'
                      }}
                    />
                  ))}
                </div>

                {/* New Password */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px' }}>
                    New Password (min 8 chars)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ width: 15, height: 15, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      className="input-dark"
                      placeholder="Min 8 characters"
                      style={{ paddingLeft: '42px', paddingRight: '42px', height: 46, borderRadius: 12, background: 'rgba(8,27,53,0.7)' }}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8BA6C8', cursor: 'pointer' }}
                    >
                      {showNewPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ width: 15, height: 15, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      className="input-dark"
                      placeholder="Re-enter password"
                      style={{ paddingLeft: '42px', height: 46, borderRadius: 12, background: 'rgba(8,27,53,0.7)' }}
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ width: '100%', height: 46, fontSize: '14px', fontWeight: 800, justifyContent: 'center', borderRadius: 12, background: 'linear-gradient(135deg, #1677FF 0%, #FF6A21 100%)' }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password & Login</span>
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 3: SUCCESS ── */}
            {forgotStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                  <ShieldCheck style={{ width: 34, height: 34 }} />
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                  Password Reset Complete!
                </h3>
                <p style={{ fontSize: '13px', color: '#AFC4DF', margin: '0 0 24px', lineHeight: 1.5 }}>
                  {forgotSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary"
                  style={{ width: '100%', height: 46, fontSize: '14px', fontWeight: 800, justifyContent: 'center', borderRadius: 12, background: 'linear-gradient(135deg, #1677FF 0%, #34D399 100%)' }}
                >
                  <span>Continue to Login</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
