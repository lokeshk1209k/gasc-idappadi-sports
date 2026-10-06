import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, ArrowRight, Mail, 
  KeyRound, AlertCircle, CheckCircle, RefreshCw, X, Loader2, 
  Sparkles, ShieldCheck, Trophy, Medal, Flame, Activity, Check
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

const FEATURED_SPORTS = [
  { name: 'Athletics & Track', icon: '🏃', color: '#38A7FF' },
  { name: 'Cricket', icon: '🏏', color: '#FF6A21' },
  { name: 'Football', icon: '⚽', color: '#10B981' },
  { name: 'Badminton', icon: '🏸', color: '#A855F7' },
  { name: 'Silambam', icon: '🥋', color: '#F59E0B' },
  { name: 'Kabaddi', icon: '🤼', color: '#EC4899' },
  { name: 'Volleyball', icon: '🏐', color: '#06B6D4' }
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [sportIndex, setSportIndex] = useState(0);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);

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

  // Rotate sports ticker on Hero side
  useEffect(() => {
    const timer = setInterval(() => {
      setSportIndex(prev => (prev + 1) % FEATURED_SPORTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

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

  // Click Ripple Effect Generator
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

  // Detect input type (Register No vs Email)
  const getInputTypeLabel = () => {
    const val = formData.email.trim();
    if (!val) return null;
    if (val.includes('@')) {
      return { type: 'Email', icon: '✉️', color: '#38A7FF' };
    }
    if (/^[A-Za-z0-9]+$/.test(val)) {
      return { type: 'College Reg No', icon: '🎓', color: '#10B981' };
    }
    return null;
  };

  const inputType = getInputTypeLabel();

  // Caps lock listener
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

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

      const targetEmail = user.email || cleanInput;
      const masked = targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 5))}${c}`);
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

      // 2. Hash new password and update in Supabase
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
          {/* Multi-layered cinematic glass scrims */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/90 via-[#020817]/60 to-[#020817]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/30 to-transparent" />
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
                  Portal v2.0
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
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Live Discipline</span>
              <span className="font-bold text-white tracking-wide transition-all duration-300" style={{ color: currentSport.color }}>
                {currentSport.name}
              </span>
            </div>
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse ml-1" />
          </div>
        </div>

        {/* Center Motivational Athletic Headline */}
        <div className="relative z-10 my-auto py-12 max-w-xl animate-hero-reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
              Empowering Student Athletes
            </span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black leading-[1.08] tracking-tight font-['Plus_Jakarta_Sans'] text-white">
            IGNITE YOUR <br />
            <span className="gradient-text-shimmer">ATHLETIC</span> <br />
            POTENTIAL.
          </h1>

          <p className="mt-5 text-base text-slate-300/85 leading-relaxed font-normal max-w-lg">
            Track tournament schedules, register for inter-collegiate championships, view sports achievements, and manage equipment requisitions in one seamless portal.
          </p>

          {/* Interactive Feature Highlights */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {['Official Team Roster', 'Live Match Schedules', 'E-Certificates', 'Equipment Vault'].map((feat, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-medium text-slate-200 transition-all duration-200 hover:border-blue-400/40 hover:-translate-y-0.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Athletic Achievement Stat Capsules */}
          <div className="grid grid-cols-3 gap-3.5 mt-10 pt-8 border-t border-white/10">
            {[
              { val: '12+', label: 'Sports Disciplines', icon: Trophy, color: '#38A7FF' },
              { val: '25+', label: 'Annual Tournaments', icon: Medal, color: '#FF6A21' },
              { val: '1000+', label: 'Active Students', icon: Flame, color: '#10B981' }
            ].map((stat, idx) => {
              const IconComp = stat.icon;
              return (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight" style={{ color: stat.color }}>
                      {stat.val}
                    </span>
                    <IconComp className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: stat.color }} />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 tracking-wide">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Hero Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            Active Session • College Intranet & Cloud Sync
          </span>
          <span className="font-mono text-[11px] opacity-70">
            Periyar University Affiliated
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL: ULTRA-GLASSMORPHIC LOGIN HUB ── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 relative flex flex-col justify-center items-center p-6 sm:p-10 z-10 overflow-y-auto">
        
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
            GASC SPORTS PORTAL
          </h2>
          <p className="text-xs text-blue-300/80 mt-0.5">
            Government Arts & Science College, Idappadi
          </p>
        </div>

        {/* Glassmorphic Auth Card Container */}
        <div className="w-full max-w-md animate-login-card">
          
          <div className="relative rounded-3xl p-7 sm:p-9 bg-slate-900/60 backdrop-blur-2xl border border-white/[0.14] shadow-[0_20px_70px_rgba(0,0,0,0.65),0_0_30px_rgba(22,119,255,0.15)] overflow-hidden">
            
            {/* Top radiant glow accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-orange-500 opacity-90" />

            {/* Subtle glass reflection sheen */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Auth Mode Toggle Pill (Login vs Register) */}
            <div className="flex p-1 mb-7 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <div className="flex-1 py-2 px-3 text-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                <span>Student Login</span>
              </div>
              <Link
                to="/student/register"
                onClick={triggerRipple}
                className="flex-1 py-2 px-3 text-center rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-all duration-200 hover:bg-white/[0.04] flex items-center justify-center gap-1 btn-interactive-ripple"
              >
                <span>New Register</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </Link>
            </div>

            {/* Card Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-2xl sm:text-[26px] font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                  Welcome Athlete! ⚡
                </h2>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300/80 leading-relaxed">
                Enter your <span className="text-blue-300 font-semibold">Register Number</span> or registered <span className="text-blue-300 font-semibold">Email</span> to access your sports dashboard.
              </p>
            </div>

            {/* Success Banner */}
            {successBanner && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-medium flex items-start gap-2.5 shadow-lg shadow-emerald-950/40 animate-hero-reveal">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-200">Operation Successful</p>
                  <p className="opacity-90">{successBanner}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSuccessBanner('')}
                  className="text-emerald-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Error Banner with shake feedback */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-start gap-2.5 shadow-lg shadow-rose-950/40 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-200">Authentication Alert</p>
                  <p className="opacity-90 leading-relaxed">{error}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setError('')}
                  className="text-rose-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Field 1: Register Number or Email */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>College Register No. / Email</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  {inputType && (
                    <span 
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/[0.07] border border-white/10 transition-all duration-200 flex items-center gap-1"
                      style={{ color: inputType.color }}
                    >
                      <span>{inputType.icon}</span>
                      <span>{inputType.type}</span>
                    </span>
                  )}
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400 group-focus-within:text-blue-300 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. C24UG183CSC024 or student@gmail.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all duration-200 shadow-inner focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Field 2: Password with CapsLock detection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Password</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      triggerRipple(e);
                      setForgotEmail(formData.email || '');
                      setForgotError('');
                      setForgotSuccess('');
                      setForgotStep(1);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors focus:outline-none hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400 group-focus-within:text-blue-300 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    onKeyDown={handlePasswordKeyDown}
                    onKeyUp={handlePasswordKeyDown}
                    placeholder="Enter your secret password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-blue-400/80 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all duration-200 shadow-inner focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Caps lock warning banner */}
                {capsLockActive && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
                    <span>⚠️</span>
                    <span>Caps Lock is ON</span>
                  </div>
                )}
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                    Remember my session
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">
                  SSL Encrypted 🔒
                </span>
              </div>

              {/* Submit Button with Interactive Ripple */}
              <button
                type="submit"
                disabled={loading}
                onClick={triggerRipple}
                className="w-full relative mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_25px_rgba(37,99,235,0.45)] hover:shadow-[0_10px_35px_rgba(37,99,235,0.65)] border border-white/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none btn-interactive-ripple"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Sports Portal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up / Create Account Redirection */}
            <div className="mt-7 pt-5 border-t border-white/[0.08] text-center">
              <p className="text-xs text-slate-400">
                New to Idappadi Sports Portal?{' '}
                <Link
                  to="/student/register"
                  onClick={triggerRipple}
                  className="font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 hover:underline ml-1"
                >
                  Create Student Account
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </p>
            </div>

          </div>

          {/* College Portal Trust & System Info Badge */}
          <div className="mt-5 text-center text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5 opacity-80">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>GASC Idappadi Sports Management System</span>
            </p>
            <p className="text-[10px] opacity-60">
              Department of Physical Education • Official Student Portal
            </p>
          </div>

        </div>

      </div>

      {/* ── FORGOT PASSWORD MODAL (ULTRA GLASS DIALOG) ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#020817]/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-hero-reveal">
          
          <div className="relative w-full max-w-md rounded-3xl p-7 sm:p-8 bg-slate-900/90 border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(37,99,235,0.25)] overflow-hidden">
            
            {/* Top Glow Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step Progress Pill Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[
                { num: 1, label: 'Identity' },
                { num: 2, label: 'OTP & Password' },
                { num: 3, label: 'Complete' }
              ].map(s => (
                <div 
                  key={s.num} 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    forgotStep === s.num 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                      : forgotStep > s.num 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20">
                    {forgotStep > s.num ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Modal Icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto mb-4 shadow-[0_0_20px_rgba(56,167,255,0.2)]">
              <KeyRound className="w-7 h-7" />
            </div>

            {/* ── STEP 1: ENTER REGISTERED EMAIL ── */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetOtp}>
                <h3 className="text-xl font-bold text-white text-center font-['Plus_Jakarta_Sans'] mb-1.5">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-300 text-center mb-5 leading-relaxed">
                  Enter your registered <strong className="text-blue-300">Register Number</strong> or <strong className="text-blue-300">Email Address</strong> to receive a 6-digit OTP verification code.
                </p>

                {forgotError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Register Number or Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                    <input
                      type="text"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="e.g. C24UG183CSC024 or student@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/15 focus:border-blue-400 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  onClick={triggerRipple}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/35 border border-white/20 flex items-center justify-center gap-2 btn-interactive-ripple cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 2: ENTER OTP & NEW PASSWORD ── */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword}>
                <h3 className="text-xl font-bold text-white text-center font-['Plus_Jakarta_Sans'] mb-1.5">
                  Verify & Set Password
                </h3>
                <p className="text-xs text-slate-300 text-center mb-4 leading-relaxed">
                  Enter the 6-digit OTP code sent to:<br />
                  <strong className="text-blue-300 font-mono text-sm">{forgotMaskedEmail}</strong>
                </p>

                {forgotError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {/* 6 OTP Boxes */}
                <div className="flex justify-center gap-2 mb-4">
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
                      className={`w-11 h-14 bg-white/[0.06] border ${
                        digit ? 'border-blue-400 shadow-[0_0_12px_rgba(56,167,255,0.4)]' : 'border-white/20'
                      } rounded-xl text-white text-2xl font-black text-center outline-none transition-all focus:border-blue-400 focus:scale-105`}
                    />
                  ))}
                </div>

                {/* Resend Timer */}
                <div className="text-center mb-4">
                  {forgotResendTimer > 0 ? (
                    <span className="text-xs text-slate-400 font-mono">
                      Resend OTP code in <strong className="text-blue-400">{forgotResendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={forgotLoading}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend OTP Code</span>
                    </button>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Password (min 8 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.05] border border-white/15 focus:border-blue-400 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/15 focus:border-blue-400 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  onClick={triggerRipple}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/35 border border-white/20 flex items-center justify-center gap-2 btn-interactive-ripple cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password & Complete</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP 3: SUCCESS CONFIRMATION ── */}
            {forgotStep === 3 && (
              <div className="text-center py-2 animate-hero-reveal">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">
                  Password Updated! 🎉
                </h3>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  {forgotSuccess || 'Your student portal password has been reset successfully. You can now log in.'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    triggerRipple(e);
                    setShowForgotModal(false);
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/35 border border-white/20 flex items-center justify-center gap-2 btn-interactive-ripple cursor-pointer"
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
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
