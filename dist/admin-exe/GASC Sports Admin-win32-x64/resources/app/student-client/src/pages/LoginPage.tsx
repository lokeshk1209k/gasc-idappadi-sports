import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, ArrowRight, User, Mail, 
  KeyRound, AlertCircle, CheckCircle, RefreshCw, X, Loader2, Sparkles 
} from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [tab, setTab] = useState<'student' | 'staff'>('student');

  const [formData, setFormData] = useState({ identifier: '', password: '' });

  // ── Forgot Password Modal State ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1 = identifier, 2 = otp+password, 3 = success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotOtpValues, setForgotOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotDemoHint, setForgotDemoHint] = useState<string | null>(null);
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
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: tab === 'student' ? 'student' : 'staff' })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('gasc_token', data.token);
        localStorage.setItem('gasc_user', JSON.stringify(data.user));
        navigate('/student/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Step 1: Send OTP ──
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your College Register Number or registered Email.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });

      const data = await res.json();

      if (data.success) {
        setForgotEmail(data.email || forgotIdentifier.trim());
        setForgotMaskedEmail(data.maskedEmail || data.email || forgotIdentifier.trim());
        setForgotDemoHint(data.demoOtpHint || null);
        setForgotOtpValues(['', '', '', '', '', '']);
        setForgotResendTimer(60);
        setForgotStep(2);

        setTimeout(() => {
          forgotOtpRefs.current[0]?.focus();
        }, 300);
      } else {
        setForgotError(data.message || 'No registered student account found with this identifier.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotError('Connection error. Please check your network and server.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Resend Reset OTP ──
  const handleResendResetOtp = async () => {
    if (forgotResendTimer > 0) return;
    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotEmail || forgotIdentifier.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setForgotDemoHint(data.demoOtpHint || null);
        setForgotResendTimer(60);
      } else {
        setForgotError(data.message || 'Failed to resend OTP.');
      }
    } catch {
      setForgotError('Network error while resending OTP.');
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

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp,
          newPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        setForgotSuccess('Your password has been updated successfully!');
        setForgotStep(3);

        // Pre-fill login form with reset identifier & password
        setFormData({
          identifier: forgotIdentifier,
          password: newPassword
        });

        setSuccessBanner('Password reset successful! You can now log in with your new password.');
      } else {
        setForgotError(data.message || 'Failed to reset password. Please check your OTP.');
      }
    } catch {
      setForgotError('Connection error. Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020817', overflow: 'hidden' }}>

      {/* ── LEFT PANEL — Hero Image ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }} className="hidden lg:flex">
        <img
          src="/images/login-hero.jpg"
          alt="GASC Sports"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(2,8,23,0.40) 0%, rgba(2,8,23,0.10) 50%, rgba(2,8,23,0.70) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,8,23,0.90) 0%, rgba(2,8,23,0.20) 50%, transparent 80%)' }} />

        <div style={{ position: 'relative', zIndex: 10, padding: '0 48px 52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(55,140,255,0.50)', background: 'rgba(22,119,255,0.15)' }}>
              <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: '#FFFFFF', margin: 0 }}>GASC SPORTS</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Student Portal</p>
            </div>
          </div>

          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 52, color: '#FFFFFF', lineHeight: 1.05, margin: 0 }}>
              YOUR<br />
              <span style={{ color: '#38A7FF' }}>SPORTS</span><br />
              JOURNEY<br />
              <span style={{ color: '#FF6A21' }}>STARTS HERE</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 16, fontFamily: "'Inter',sans-serif" }}>
              Compete • Connect • Achieve
            </p>

            <div style={{ display: 'flex', gap: 20, marginTop: 28 }}>
              {[
                { label: 'Sports', value: '12+' },
                { label: 'Tournaments', value: '25' },
                { label: 'Students', value: '500+' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, color: '#38A7FF', margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 28, fontFamily: "'Inter',sans-serif" }}>
            Government Arts and Science College, Idappadi
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div style={{ width: '100%', maxWidth: 460, background: 'linear-gradient(180deg, #031126 0%, #020817 100%)', borderLeft: '1px solid rgba(55,140,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 40px', position: 'relative', overflowY: 'auto' }}>

        {/* Top logo for mobile */}
        <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(55,140,255,0.40)', background: 'rgba(22,119,255,0.10)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
          </div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: '#FFFFFF', margin: 0 }}>GASC SPORTS</h2>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: '#FFFFFF', margin: '0 0 6px' }}>Welcome Back! 👋</h2>
            <p style={{ fontSize: 14, color: '#6E86A5', margin: 0 }}>Login to your student sports portal</p>
          </div>

          {/* Tab selector */}
          <div style={{ display: 'flex', background: 'rgba(8,27,53,0.8)', border: '1px solid rgba(55,140,255,0.20)', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['student', 'staff'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  background: tab === t ? 'linear-gradient(135deg,#1677FF,#5B5CFF)' : 'transparent',
                  color: tab === t ? '#FFFFFF' : '#6E86A5',
                  border: 'none', cursor: 'pointer',
                  boxShadow: tab === t ? '0 4px 12px rgba(22,119,255,0.30)' : 'none',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {t === 'student' ? 'Student Login' : 'Staff Login'}
              </button>
            ))}
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', padding: '10px 14px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#EF4444', padding: '10px 14px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Register Number */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AFC4DF', marginBottom: 8, fontFamily: "'Inter',sans-serif" }}>
                Register Number
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. 23UGCS101"
                  style={{ paddingLeft: 36 }}
                  value={formData.identifier}
                  onChange={e => setFormData({ ...formData, identifier: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#AFC4DF', fontFamily: "'Inter',sans-serif" }}>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(formData.identifier || '');
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotStep(1);
                    setShowForgotModal(true);
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#38A7FF', fontWeight: 600, cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  placeholder="Enter your password"
                  style={{ paddingLeft: 36, paddingRight: 42 }}
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

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: '#1677FF', width: 15, height: 15 }} />
              <span style={{ fontSize: 13, color: '#6E86A5' }}>Remember me</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '13px 20px', fontSize: 14, marginTop: 4, justifyContent: 'center' }}
            >
              {loading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <>Login <ArrowRight style={{ width: 16, height: 16 }} /></>
              )}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6E86A5' }}>
            Don't have an account?{' '}
            <Link to="/student/register" style={{ color: '#38A7FF', fontWeight: 700, textDecoration: 'none' }}>Register Profile</Link>
          </p>

          {/* Footer */}
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(55,140,255,0.12)', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#3A5272' }}>
              Government Arts and Science College, Idappadi<br />
              GASC Sports Portal v1.0
            </p>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 8, 23, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: 'linear-gradient(180deg, #061938 0%, #031126 100%)', border: '1px solid rgba(55,140,255,0.35)', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(22,119,255,0.2)', position: 'relative' }}>

            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer', padding: 4 }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>

            {/* Icon */}
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(22,119,255,0.15)', border: '2px solid rgba(55,140,255,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF' }}>
              <KeyRound style={{ width: 26, height: 26 }} />
            </div>

            {/* ── STEP 1: ENTER REGISTER NUMBER / EMAIL ── */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetOtp}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', margin: '0 0 6px' }}>
                  Reset Your Password
                </h3>
                <p style={{ fontSize: '13px', color: '#AFC4DF', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Enter your College Register Number or registered Email to receive a 6-digit OTP verification code.
                </p>

                {forgotError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '8px' }}>
                    College Register Number or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type="text"
                      required
                      className="input-dark"
                      placeholder="e.g. 23UGCS101 or student@gasc.edu"
                      style={{ paddingLeft: '38px' }}
                      value={forgotIdentifier}
                      onChange={e => setForgotIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, justifyContent: 'center' }}
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
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}


                {/* 6 OTP Boxes */}
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
                        width: '44px',
                        height: '52px',
                        background: 'rgba(8,27,53,0.85)',
                        border: digit ? '2px solid #38A7FF' : '1px solid rgba(55,140,255,0.25)',
                        borderRadius: '10px',
                        color: '#FFFFFF',
                        fontSize: '20px',
                        fontWeight: 800,
                        textAlign: 'center',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>

                {/* New Password */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                    New Password (min 6 chars)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      className="input-dark"
                      placeholder="••••••••"
                      style={{ paddingLeft: '36px', paddingRight: '36px' }}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer' }}
                    >
                      {showNewPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#AFC4DF', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      className="input-dark"
                      placeholder="••••••••"
                      style={{ paddingLeft: '36px', paddingRight: '36px' }}
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, justifyContent: 'center', marginBottom: '14px' }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password & Complete</span>
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6E86A5' }}>
                  {forgotResendTimer > 0 ? (
                    <span>Resend code in {forgotResendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendResetOtp}
                      style={{ background: 'none', border: 'none', color: '#38A7FF', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                    >
                      Resend OTP
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={{ background: 'none', border: 'none', color: '#6E86A5', cursor: 'pointer', padding: 0 }}
                  >
                    Change Identifier
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: SUCCESS ── */}
            {forgotStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
                  <CheckCircle style={{ width: 32, height: 32 }} />
                </div>

                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
                  Password Reset Successfully!
                </h3>
                <p style={{ fontSize: '13px', color: '#AFC4DF', margin: '0 0 24px', lineHeight: 1.5 }}>
                  {forgotSuccess || 'Your password has been changed. You can now log into your student sports account.'}
                </p>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, justifyContent: 'center' }}
                >
                  Proceed to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
