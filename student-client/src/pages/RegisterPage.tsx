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
  AlertTriangle,
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building,
  GraduationCap,
  Calendar,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface VerifiedStudentData {
  register_number: string;
  name: string;
  department: string;
  year: string;
  section: string;
  gender: string;
  status?: string;
  isRegistered?: boolean;
}

const RegisterPage = () => {
  const navigate = useNavigate();

  // Wizard Step: 1 = Verify Reg No, 2 = Account Details, 3 = OTP Verification, 4 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Register Number Input & Verification State
  const [regInput, setRegInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    verified: boolean;
    isPreEnrolled: boolean;
    isRegistered: boolean;
    isInactive: boolean;
    message: string;
    student?: VerifiedStudentData;
  } | null>(null);

  // Step 2: Form & Credentials State
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    termsAgreed: false
  });
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Step 3: OTP State
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [maskedEmail, setMaskedEmail] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validation helpers
  const isEmailValid = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  const isPhoneValid = (phone: string) => /^[6-9]\d{9}$/.test(phone.trim());
  const isPasswordValid = (pw: string) => pw.length >= 6;
  const isPasswordMatch = formData.password.length > 0 && formData.password === formData.confirm_password;

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // ── STEP 1: Query Official Student Roster in Supabase ──
  const verifyRegisterNumber = async (regToCheck?: string) => {
    const rawReg = (regToCheck || regInput).trim().toUpperCase();
    if (!rawReg || rawReg.length < 3) {
      setVerifyStatus({
        verified: false,
        isPreEnrolled: false,
        isRegistered: false,
        isInactive: false,
        message: 'Please enter a valid College Register Number.'
      });
      return;
    }

    setVerifying(true);
    setVerifyStatus(null);
    setFormError('');

    try {
      const variants = getRegisterNumberVariants(rawReg);
      const cleanRegNo = variants[0] || rawReg;

      // 1. Check if an active registered account already exists in Supabase users table
      let existingRegisteredUser: any = null;
      let existingRosterUser: any = null;

      try {
        const { data: userRows, error: userErr } = await supabase
          .from('users')
          .select('*')
          .in('register_number', variants);

        if (userRows && userRows.length > 0) {
          existingRegisteredUser = userRows.find(u => u.role === 'student');
          existingRosterUser = userRows.find(u => u.role === 'roster' || u.role !== 'student');
        }
      } catch (uErr) {
        console.warn('Supabase users query warning:', uErr);
      }

      // Check competition_registrations table for student accounts
      if (!existingRegisteredUser) {
        try {
          const { data: compRows } = await supabase
            .from('competition_registrations')
            .select('*')
            .eq('competition_id', '__STUDENT_ACCOUNT__')
            .in('register_number', variants);

          if (compRows && compRows.length > 0) {
            existingRegisteredUser = {
              name: compRows[0].student_name,
              register_number: compRows[0].register_number
            };
          }
        } catch (e) {}
      }

      // If user is ALREADY registered -> BLOCK with duplicate error
      if (existingRegisteredUser) {
        const studentName = existingRegisteredUser.name || 'Student Athlete';
        setVerifyStatus({
          verified: false,
          isPreEnrolled: false,
          isRegistered: true,
          isInactive: false,
          message: `An account already exists for this Register Number (${cleanRegNo}). Please login instead.`
        });
        setVerifying(false);
        return;
      }

      // 2. Query Supabase notifications table for real-time roster record (synced instantly from Admin Portal)
      let rosterMatch: VerifiedStudentData | null = null;

      if (existingRosterUser) {
        rosterMatch = {
          register_number: existingRosterUser.register_number || cleanRegNo,
          name: existingRosterUser.name,
          department: existingRosterUser.department || 'Computer Science',
          year: existingRosterUser.year || 'I Year',
          section: existingRosterUser.section || 'A',
          gender: existingRosterUser.gender || 'Male',
          status: existingRosterUser.status || 'Active',
          isRegistered: false
        };
      }

      if (!rosterMatch) {
        try {
          const { data: notifRows } = await supabase
            .from('notifications')
            .select('*')
            .eq('category', 'roster')
            .in('title', variants);

          if (notifRows && notifRows.length > 0) {
            const notif = notifRows[0];
            try {
              const parsed = JSON.parse(notif.message);
              rosterMatch = {
                register_number: parsed.registerNumber || notif.title,
                name: parsed.name || notif.title,
                department: parsed.department || notif.target_type || 'Computer Science',
                year: parsed.year || notif.target_audience || 'I Year',
                section: parsed.section || 'A',
                gender: parsed.gender || notif.priority || 'Male',
                status: parsed.status || 'Active',
                isRegistered: parsed.isRegistered || notif.sender === 'registered'
              };
            } catch (pErr) {
              rosterMatch = {
                register_number: notif.title,
                name: notif.title,
                department: notif.target_type || 'Computer Science',
                year: notif.target_audience || 'I Year',
                section: 'A',
                gender: notif.priority || 'Male',
                status: 'Active',
                isRegistered: notif.sender === 'registered'
              };
            }
          }
        } catch (nErr) {
          console.warn('Real-time Supabase notifications roster query warning:', nErr);
        }
      }

      // 3. Fallback: Query backend API /api/auth/verify-student
      if (!rosterMatch) {
        try {
          const apiRes = await fetch(`/api/auth/verify-student?regNo=${encodeURIComponent(cleanRegNo)}`);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && apiData.success && apiData.student) {
              rosterMatch = {
                register_number: apiData.student.registerNumber || cleanRegNo,
                name: apiData.student.name,
                department: apiData.student.department || 'Computer Science',
                year: apiData.student.year || 'I Year',
                section: apiData.student.section || 'A',
                gender: apiData.student.gender || 'Male',
                status: apiData.student.status || 'Active',
                isRegistered: apiData.isRegistered
              };
            } else if (apiData && apiData.isInactive) {
              setVerifyStatus({
                verified: false,
                isPreEnrolled: false,
                isRegistered: false,
                isInactive: true,
                message: 'Your Register Number exists in the college roster, but your student status is currently inactive. Please contact the Sports Administration.'
              });
              setVerifying(false);
              return;
            } else if (apiData && apiData.isRegistered) {
              setVerifyStatus({
                verified: false,
                isPreEnrolled: false,
                isRegistered: true,
                isInactive: false,
                message: `An account already exists for this Register Number (${cleanRegNo}). Please login instead.`
              });
              setVerifying(false);
              return;
            }
          }
        } catch (apiErr) {}
      }

      // 4. Fallback: Query public roster.json
      if (!rosterMatch) {
        try {
          const rRes = await fetch('/roster.json');
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData && Array.isArray(rData.roster)) {
              const staticMatch = rData.roster.find((r: any) => {
                const rVars = getRegisterNumberVariants(r.register_number || r.registerNumber);
                return variants.some(v => rVars.includes(v));
              });
              if (staticMatch) {
                rosterMatch = {
                  register_number: staticMatch.register_number || staticMatch.registerNumber || cleanRegNo,
                  name: staticMatch.name,
                  department: staticMatch.department || 'Computer Science',
                  year: staticMatch.year || 'I Year',
                  section: staticMatch.section || 'A',
                  gender: staticMatch.gender || 'Male',
                  status: staticMatch.status || 'Active',
                  isRegistered: false
                };
              }
            }
          }
        } catch (e) {}
      }

      // 5. Evaluate the Roster Record
      if (!rosterMatch) {
        // NOT FOUND IN OFFICIAL ROSTER -> BLOCK IMMEDIATELY
        setVerifyStatus({
          verified: false,
          isPreEnrolled: false,
          isRegistered: false,
          isInactive: false,
          message: 'Your Register Number was not found in the official college student roster. You cannot create a Student Portal account using this Register Number. Please contact the college Sports Administration.'
        });
        setVerifying(false);
        return;
      }

      // CHECK IF INACTIVE
      if (rosterMatch.status && rosterMatch.status.toUpperCase() === 'INACTIVE') {
        setVerifyStatus({
          verified: false,
          isPreEnrolled: false,
          isRegistered: false,
          isInactive: true,
          message: 'Your Register Number exists in the college roster, but your student status is currently inactive. Please contact the Sports Administration.'
        });
        setVerifying(false);
        return;
      }

      // VERIFIED AND ACTIVE!
      setVerifyStatus({
        verified: true,
        isPreEnrolled: true,
        isRegistered: false,
        isInactive: false,
        message: 'Your Register Number has been verified successfully.',
        student: rosterMatch
      });

    } catch (err: any) {
      console.error('Verify error:', err);
      setVerifyStatus({
        verified: false,
        isPreEnrolled: false,
        isRegistered: false,
        isInactive: false,
        message: 'Unable to verify your Register Number right now. Please check your internet connection and try again.'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Auto-trigger verification on debounced typing
  useEffect(() => {
    const raw = regInput.trim();
    if (!raw || raw.length < 4) {
      if (currentStep === 1) setVerifyStatus(null);
      return;
    }

    const timer = setTimeout(() => {
      if (currentStep === 1) {
        verifyRegisterNumber(raw);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [regInput, currentStep]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 3 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, resendTimer]);

  // ── STEP 2: Proceed to Account Details ──
  const handleProceedToStep2 = () => {
    if (!verifyStatus?.verified || !verifyStatus.student) {
      setFormError('Please verify your Register Number before proceeding.');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── STEP 2 -> STEP 3: Dispatch OTP to Email ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    setTouched({
      email: true,
      phone: true,
      password: true,
      confirm_password: true,
      termsAgreed: true
    });

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phone.trim();
    const student = verifyStatus?.student;

    if (!student) {
      setFormError('Roster student verification lost. Please re-verify Register Number.');
      setCurrentStep(1);
      return;
    }

    if (!isEmailValid(cleanEmail)) {
      setFormError('Please enter a valid email address (e.g. name@gascidappadi.edu.in or student@gmail.com).');
      return;
    }

    if (!isPhoneValid(cleanPhone)) {
      setFormError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!isPasswordValid(formData.password)) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setFormError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    if (!formData.termsAgreed) {
      setFormError('Please agree to the Athletics Code of Conduct & Terms to continue.');
      return;
    }

    // Check if email already registered to another student
    try {
      const { data: existingEmailUser } = await supabase
        .from('users')
        .select('id, register_number')
        .ilike('email', cleanEmail)
        .eq('role', 'student')
        .maybeSingle();

      if (existingEmailUser) {
        setFormError('This email address is already registered with another account. Please use a different email.');
        return;
      }
    } catch (e) {}

    setOtpLoading(true);

    try {
      const cleanRegNo = student.register_number.trim().toUpperCase();

      // 1. Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expTime = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

      // 2. Persist OTP in Supabase notifications table
      try {
        await supabase.from('notifications').insert({
          id: `reg_otp_${cleanRegNo}_${Date.now()}`,
          title: 'STUDENT_REGISTRATION_OTP',
          message: JSON.stringify({
            otp: generatedOtp,
            email: cleanEmail,
            registerNumber: cleanRegNo,
            expiresAt: expTime
          }),
          type: 'registration',
          sender: 'unread',
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      // 3. Dispatch background email via API
      try {
        let sent = false;
        try {
          const res1 = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              registerNumber: cleanRegNo,
              name: student.name,
              otp: generatedOtp
            })
          });
          if (res1.ok) sent = true;
        } catch (e) {}

        if (!sent) {
          try {
            await fetch('/api/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: cleanEmail,
                registerNumber: cleanRegNo,
                name: student.name,
                otp: generatedOtp
              })
            });
          } catch (e) {}
        }
      } catch (e) {}

      // 4. Move to Step 3 (OTP Verification)
      const emailMask = cleanEmail.includes('@')
        ? cleanEmail.replace(/^(.)(.*)(@.*)$/, (_: any, a: any, b: any, c: any) => `${a}${'*'.repeat(Math.min(b.length, 5))}${c}`)
        : cleanEmail;

      setMaskedEmail(emailMask);
      setOtpToken(`otp_${generatedOtp}_${expTime}`);
      setOtpValues(['', '', '', '', '', '']);
      setOtpError('');
      setOtpAttempts(0);
      setResendTimer(60);
      setCurrentStep(3);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setFormError('Unable to send OTP email: ' + (err.message || 'Please try again.'));
    } finally {
      setOtpLoading(false);
    }
  };

  // ── STEP 3: Resend OTP ──
  const handleResendOtp = async () => {
    if (resendTimer > 0 || !verifyStatus?.student) return;
    setOtpLoading(true);
    setOtpError('');

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanRegNo = verifyStatus.student.register_number.trim().toUpperCase();

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expTime = Date.now() + 10 * 60 * 1000;

      try {
        await supabase.from('notifications').insert({
          id: `reg_otp_${cleanRegNo}_${Date.now()}`,
          title: 'STUDENT_REGISTRATION_OTP',
          message: JSON.stringify({
            otp: generatedOtp,
            email: cleanEmail,
            registerNumber: cleanRegNo,
            expiresAt: expTime
          }),
          type: 'registration',
          sender: 'unread',
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      try {
        let sent = false;
        try {
          const res1 = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              registerNumber: cleanRegNo,
              name: verifyStatus.student.name,
              otp: generatedOtp
            })
          });
          if (res1.ok) sent = true;
        } catch (e) {}

        if (!sent) {
          try {
            await fetch('/api/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: cleanEmail,
                registerNumber: cleanRegNo,
                name: verifyStatus.student.name,
                otp: generatedOtp
              })
            });
          } catch (e) {}
        }
      } catch (e) {}

      setOtpToken(`otp_${generatedOtp}_${expTime}`);
      setResendTimer(60);
      setOtpError('');
    } catch (err) {
      setOtpError('Failed to resend OTP. Please check your connection.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP Inputs Handling ──
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

  // ── STEP 3 -> STEP 4: Verify OTP & Final Account Creation in Supabase ──
  const executeRegistration = async (enteredOtp?: string) => {
    const otpToVerify = enteredOtp || otpValues.join('');

    if (otpToVerify.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (otpAttempts >= 5) {
      setOtpError('Too many incorrect attempts. Please request a new OTP.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const student = verifyStatus?.student;

      if (!student) {
        setOtpError('Session expired. Please restart registration.');
        setCurrentStep(1);
        return;
      }

      const cleanReg = student.register_number.trim().toUpperCase();

      // 1. Verify OTP code
      let isOtpValid = false;

      if (otpToken && otpToken.includes(otpToVerify)) {
        isOtpValid = true;
      }

      if (!isOtpValid) {
        try {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('id, message')
            .eq('title', 'STUDENT_REGISTRATION_OTP')
            .order('created_at', { ascending: false })
            .limit(10);

          if (notifs) {
            for (const n of notifs) {
              try {
                const p = JSON.parse(n.message);
                if (p.email?.toLowerCase() === cleanEmail && p.otp === otpToVerify && Date.now() <= p.expiresAt) {
                  isOtpValid = true;
                  await supabase.from('notifications').update({ sender: 'read' }).eq('id', n.id);
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
        if (nextAttempts >= 5) {
          setOtpError('Too many incorrect attempts. Please request a new OTP.');
        } else {
          setOtpError(`Invalid OTP. Please try again (${5 - nextAttempts} attempts remaining).`);
        }
        setOtpLoading(false);
        return;
      }

      // 2. Register real Student Account via API and Supabase
      let finalUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let authSessionUser: any = null;
      let tokenStr = '';

      try {
        const apiRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: student.name.trim(),
            registerNumber: cleanReg,
            email: cleanEmail,
            password: formData.password,
            department: student.department,
            year: student.year,
            section: student.section || 'A',
            gender: student.gender,
            mobile: formData.phone.trim(),
            phone: formData.phone.trim()
          })
        });
        const apiData = await apiRes.json();
        if (apiData && apiData.success && apiData.user) {
          authSessionUser = apiData.user;
          tokenStr = apiData.token || `gasc_student_jwt_${Date.now()}_${apiData.user.id}`;
          finalUserId = apiData.user.id;
        }
      } catch (apiErr) {
        console.warn('API register notice, proceeding with direct database sync:', apiErr);
      }

      // Direct Supabase fallback / sync
      try {
        const { data: existingRow } = await supabase
          .from('users')
          .select('id')
          .ilike('register_number', cleanReg)
          .maybeSingle();

        if (existingRow) {
          finalUserId = existingRow.id;
          await supabase
            .from('users')
            .update({
              name: student.name.trim(),
              email: cleanEmail,
              password: formData.password,
              role: 'student',
              department: student.department,
              year: student.year,
              section: student.section || 'A',
              gender: student.gender,
              mobile: formData.phone.trim(),
              status: 'Active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRow.id);
        } else {
          await supabase
            .from('users')
            .insert({
              id: finalUserId,
              name: student.name.trim(),
              register_number: cleanReg,
              email: cleanEmail,
              password: formData.password,
              role: 'student',
              department: student.department,
              year: student.year,
              section: student.section || 'A',
              gender: student.gender,
              mobile: formData.phone.trim(),
              profile_photo: '/images/default-avatar.png',
              status: 'Active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } catch (dbErr) {
        console.warn('Direct Supabase users update warning:', dbErr);
      }

      // 3. Create default Player Profile
      try {
        await supabase.from('player_profiles').insert({
          id: `prof_${finalUserId}`,
          user_id: finalUserId,
          position: 'All Rounder',
          jersey_number: 7,
          playing_level: 'College Level',
          experience: '1 Year',
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
          score_points: 0,
          awards_count: 0,
          competitions_participated: 0,
          bio: `Enrolled student athlete at GASC Idappadi (${student.department} - ${student.year}).`,
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      // 4. Update local session
      if (!authSessionUser) {
        authSessionUser = {
          id: finalUserId,
          name: student.name.trim(),
          registerNumber: cleanReg,
          regNo: cleanReg,
          department: student.department,
          dept: student.department,
          year: student.year,
          section: student.section || 'A',
          gender: student.gender,
          mobile: formData.phone.trim(),
          phone: formData.phone.trim(),
          email: cleanEmail,
          role: 'student'
        };
      }

      if (!tokenStr) {
        tokenStr = `gasc_student_jwt_${Date.now()}_${finalUserId}`;
      }

      localStorage.setItem('gasc_token', tokenStr);
      localStorage.setItem('gasc_user', JSON.stringify(authSessionUser));

      // 5. Move to Step 4 (Success)
      setCurrentStep(4);

      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error('Registration execution error:', err);
      setOtpError(err.message || 'Registration failed. Check network connection.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #061938 0%, #020817 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative' }}>

      {/* Ambient background glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '650px', height: '450px', background: 'radial-gradient(circle, rgba(22,119,255,0.14) 0%, transparent 70%)', filter: 'blur(90px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '780px', background: 'rgba(8, 27, 53, 0.90)', backdropFilter: 'blur(24px)', border: '1px solid rgba(55,140,255,0.30)', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.1)', position: 'relative', zIndex: 10 }}>

        {/* Back Link */}
        <Link 
          to="/student/login" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#38A7FF', textDecoration: 'none', marginBottom: '20px', transition: 'color 0.2s' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Student Login
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(55,140,255,0.40)', background: 'rgba(22,119,255,0.15)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/images/college-logo.jpg" alt="GASC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/college-logo.png'; }} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(22,119,255,0.15)', border: '1px solid rgba(55,140,255,0.3)', borderRadius: '20px', color: '#38A7FF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
            <Sparkles style={{ width: 13, height: 13 }} /> OFFICIAL STUDENT ATHLETE PORTAL
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
            STUDENT <span style={{ color: '#38A7FF' }}>REGISTRATION</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#8EA8C7', margin: 0 }}>
            Government Arts and Science College, Idappadi • 2026 Sports System
          </p>
        </div>

        {/* Multi-Step Wizard Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
          {/* Background Track */}
          <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '3px', background: 'rgba(55,140,255,0.2)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '16px', left: '10%', width: currentStep === 1 ? '0%' : (currentStep === 2 ? '35%' : (currentStep === 3 ? '70%' : '80%')), height: '3px', background: '#38A7FF', transition: 'width 0.4s ease', zIndex: 0 }} />

          {[
            { num: 1, label: 'Verify Reg No' },
            { num: 2, label: 'Account Details' },
            { num: 3, label: 'OTP Verification' },
            { num: 4, label: 'Ready' }
          ].map((s) => {
            const isCompleted = currentStep > s.num;
            const isActive = currentStep === s.num;
            return (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, minWidth: '70px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isCompleted ? '#10B981' : (isActive ? '#38A7FF' : 'rgba(15, 33, 58, 0.95)'),
                  border: `2px solid ${isCompleted ? '#10B981' : (isActive ? '#38A7FF' : 'rgba(55,140,255,0.3)')}`,
                  color: isCompleted || isActive ? '#FFFFFF' : '#8EA8C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: isActive ? '0 0 16px rgba(56,167,255,0.6)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  {isCompleted ? <Check style={{ width: 16, height: 16 }} /> : s.num}
                </div>
                <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? '#38A7FF' : (isCompleted ? '#10B981' : '#6E86A5'), marginTop: '6px', textAlign: 'center' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Global Form Error Banner */}
        {formError && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1: ENTER & VERIFY COLLEGE REGISTER NUMBER
        ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div>
            <div style={{ background: 'rgba(3, 17, 38, 0.75)', border: '1px solid rgba(55,140,255,0.25)', borderRadius: '18px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen style={{ width: 18, height: 18, color: '#38A7FF' }} /> Enter Your College Register Number
                </h2>
                <p style={{ fontSize: '13px', color: '#8EA8C7', margin: 0 }}>
                  Enter your official register number issued by GASC Idappadi. The system will verify your student record in the Master Roster.
                </p>
              </div>

              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <BookOpen style={{ width: 18, height: 18, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                <input
                  type="text"
                  id="student-register-input"
                  placeholder="e.g. 23UGCS101, 24UGCO205, C24UG183CSC013"
                  value={regInput}
                  onChange={e => setRegInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      verifyRegisterNumber();
                    }
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '13px 44px 13px 44px',
                    background: 'rgba(10, 31, 60, 0.9)',
                    border: `1.5px solid ${verifyStatus?.verified ? '#10B981' : (verifyStatus ? '#EF4444' : 'rgba(55,140,255,0.35)')}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                {verifying && (
                  <Loader2 style={{ width: 18, height: 18, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF', animation: 'spin 1s linear infinite' }} />
                )}
              </div>

              <button
                type="button"
                id="btn-verify-reg-number"
                disabled={verifying || !regInput.trim()}
                onClick={() => verifyRegisterNumber()}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: verifying || !regInput.trim() ? 'rgba(55,140,255,0.2)' : 'linear-gradient(135deg, #1677FF 0%, #0052CC 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  cursor: verifying || !regInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: verifying || !regInput.trim() ? 'none' : '0 4px 14px rgba(22,119,255,0.4)',
                  transition: 'all 0.2s'
                }}
              >
                {verifying ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                    <span>Checking official student roster...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck style={{ width: 17, height: 17 }} />
                    <span>VERIFY REGISTER NUMBER</span>
                  </>
                )}
              </button>

              {/* Status Indicator Feedback */}
              {verifyStatus && (
                <div style={{ marginTop: '16px' }}>
                  {/* Case A: Already Registered */}
                  {verifyStatus.isRegistered && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <AlertTriangle style={{ width: 18, height: 18, color: '#F87171', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '13px', color: '#F87171', fontWeight: 600 }}>{verifyStatus.message}</span>
                      </div>
                      <Link 
                        to="/student/login" 
                        style={{ padding: '6px 14px', background: '#38A7FF', color: '#FFFFFF', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        LOGIN NOW
                      </Link>
                    </div>
                  )}

                  {/* Case B: Inactive Student */}
                  {verifyStatus.isInactive && (
                    <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <AlertTriangle style={{ width: 18, height: 18, color: '#FBBF24', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FBBF24', marginBottom: '2px' }}>⚠ Student Status Inactive</div>
                        <div style={{ fontSize: '12px', color: '#FCD34D' }}>{verifyStatus.message}</div>
                      </div>
                    </div>
                  )}

                  {/* Case C: Not Found */}
                  {!verifyStatus.verified && !verifyStatus.isRegistered && !verifyStatus.isInactive && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <AlertCircle style={{ width: 18, height: 18, color: '#F87171', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#F87171', marginBottom: '2px' }}>✕ Register Number Not Found</div>
                        <div style={{ fontSize: '12px', color: '#FCA5A5' }}>{verifyStatus.message}</div>
                      </div>
                    </div>
                  )}

                  {/* Case D: Verified & Active */}
                  {verifyStatus.verified && verifyStatus.student && (
                    <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                        <CheckCircle style={{ width: 18, height: 18 }} />
                        <span>✓ Register Number Verified</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#A7F3D0', margin: '0 0 14px' }}>
                        {verifyStatus.message}
                      </p>

                      {/* Read-Only Verified Student Details Card */}
                      <div style={{ background: 'rgba(4, 23, 49, 0.8)', border: '1px solid rgba(55,140,255,0.2)', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Official Student Name</small>
                          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '13px' }}>{verifyStatus.student.name}</div>
                        </div>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Register Number</small>
                          <div style={{ color: '#38A7FF', fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{verifyStatus.student.register_number}</div>
                        </div>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Department</small>
                          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>{verifyStatus.student.department}</div>
                        </div>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Year & Section</small>
                          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>{verifyStatus.student.year} (Sec {verifyStatus.student.section || 'A'})</div>
                        </div>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Gender</small>
                          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>{verifyStatus.student.gender}</div>
                        </div>
                        <div>
                          <small style={{ color: '#8EA8C7', fontSize: '11px', textTransform: 'uppercase' }}>Roster Status</small>
                          <div style={{ color: '#10B981', fontWeight: 700, fontSize: '13px' }}>● ACTIVE</div>
                        </div>
                      </div>

                      {/* Continue Button */}
                      <button
                        type="button"
                        id="btn-continue-registration"
                        onClick={handleProceedToStep2}
                        style={{
                          width: '100%',
                          padding: '12px 20px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>CONTINUE REGISTRATION</span>
                        <ArrowRight style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2: ENTER EMAIL & ACCOUNT CREDENTIALS
        ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && verifyStatus?.student && (
          <form onSubmit={handleSendOtp}>
            {/* Read-Only Verified Summary Ribbon */}
            <div style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>
                  <CheckCircle style={{ width: 14, height: 14 }} /> Verified College Record (Read-Only)
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                  {verifyStatus.student.name} <span style={{ color: '#38A7FF', fontFamily: 'monospace', fontWeight: 700 }}>({verifyStatus.student.register_number})</span>
                </div>
                <small style={{ color: '#A7F3D0', fontSize: '12px' }}>
                  {verifyStatus.student.department} • {verifyStatus.student.year} • {verifyStatus.student.gender}
                </small>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{ background: 'transparent', border: '1px solid rgba(55,140,255,0.3)', color: '#38A7FF', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Change Reg No
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '20px' }}>
              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Address <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                  <input
                    type="email"
                    required
                    placeholder="student@gmail.com or college email"
                    value={formData.email}
                    onBlur={() => markTouched('email')}
                    onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px 12px 42px',
                      background: 'rgba(10, 31, 60, 0.85)',
                      border: `1.5px solid ${touched.email && !isEmailValid(formData.email) ? '#EF4444' : 'rgba(55,140,255,0.3)'}`,
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                {touched.email && !isEmailValid(formData.email) && (
                  <span style={{ fontSize: '11px', color: '#F87171', marginTop: '4px', display: 'block' }}>Please enter a valid email address.</span>
                )}
              </div>

              {/* Mobile Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Mobile Phone Number <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onBlur={() => markTouched('phone')}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px 12px 42px',
                      background: 'rgba(10, 31, 60, 0.85)',
                      border: `1.5px solid ${touched.phone && !isPhoneValid(formData.phone) ? '#EF4444' : 'rgba(55,140,255,0.3)'}`,
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                {touched.phone && !isPhoneValid(formData.phone) && (
                  <span style={{ fontSize: '11px', color: '#F87171', marginTop: '4px', display: 'block' }}>Please enter a valid 10-digit mobile number.</span>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Create Password <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onBlur={() => markTouched('password')}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 42px 12px 42px',
                      background: 'rgba(10, 31, 60, 0.85)',
                      border: `1.5px solid ${touched.password && !isPasswordValid(formData.password) ? '#EF4444' : 'rgba(55,140,255,0.3)'}`,
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8EA8C7', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
                {touched.password && !isPasswordValid(formData.password) && (
                  <span style={{ fontSize: '11px', color: '#F87171', marginTop: '4px', display: 'block' }}>Password must be at least 6 characters.</span>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#AFC4DF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Confirm Password <span style={{ color: '#FF6A21' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ width: 17, height: 17, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#38A7FF' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onBlur={() => markTouched('confirm_password')}
                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 42px 12px 42px',
                      background: 'rgba(10, 31, 60, 0.85)',
                      border: `1.5px solid ${touched.confirm_password && !isPasswordMatch ? '#EF4444' : 'rgba(55,140,255,0.3)'}`,
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8EA8C7', cursor: 'pointer', padding: 0 }}
                  >
                    {showConfirmPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
                {touched.confirm_password && !isPasswordMatch && (
                  <span style={{ fontSize: '11px', color: '#F87171', marginTop: '4px', display: 'block' }}>Passwords do not match.</span>
                )}
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div style={{ background: 'rgba(10, 31, 60, 0.6)', border: '1px solid rgba(55,140,255,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="terms"
                required
                checked={formData.termsAgreed}
                onChange={e => setFormData({ ...formData, termsAgreed: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#1677FF', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '12px', color: '#AFC4DF', cursor: 'pointer' }}>
                I agree to the <strong style={{ color: '#FFFFFF' }}>Athletics Code of Conduct</strong> and declare that the provided details match my official bonafide college admission.
              </label>
            </div>

            {/* Actions Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '13px 20px',
                  background: 'rgba(15, 33, 58, 0.8)',
                  border: '1px solid rgba(55,140,255,0.3)',
                  borderRadius: '12px',
                  color: '#AFC4DF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>

              <button
                type="submit"
                id="btn-send-otp"
                disabled={otpLoading}
                style={{
                  flex: 1,
                  padding: '13px 24px',
                  background: 'linear-gradient(135deg, #1677FF 0%, #0052CC 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  cursor: otpLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
                  transition: 'all 0.2s'
                }}
              >
                {otpLoading ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                    <span>Sending 6-Digit OTP to Email...</span>
                  </>
                ) : (
                  <>
                    <span>SEND VERIFICATION OTP</span>
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3: OTP AUTHENTICATION & VERIFICATION
        ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(22,119,255,0.15)', border: '2px solid rgba(55,140,255,0.4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38A7FF' }}>
              <KeyRound style={{ width: 26, height: 26 }} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
              Verify Your Email Address
            </h2>
            <p style={{ fontSize: '13px', color: '#8EA8C7', margin: '0 auto 24px', maxWidth: '440px' }}>
              We sent a secure 6-digit verification code to <strong style={{ color: '#38A7FF' }}>{maskedEmail}</strong>. Enter the code below to complete your registration.
            </p>

            {/* OTP Error Feedback */}
            {otpError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', padding: '10px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{otpError}</span>
              </div>
            )}

            {/* 6-Digit Box Inputs */}
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
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    background: 'rgba(10, 31, 60, 0.95)',
                    border: `2px solid ${digit ? '#38A7FF' : 'rgba(55,140,255,0.3)'}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    outline: 'none',
                    boxShadow: digit ? '0 0 12px rgba(56,167,255,0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="button"
              id="btn-verify-otp-submit"
              disabled={otpLoading || otpValues.some(v => v === '')}
              onClick={() => executeRegistration()}
              style={{
                width: '100%',
                maxWidth: '360px',
                padding: '13px 24px',
                background: otpLoading || otpValues.some(v => v === '') ? 'rgba(55,140,255,0.2)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: otpLoading || otpValues.some(v => v === '') ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
                boxShadow: otpLoading || otpValues.some(v => v === '') ? 'none' : '0 4px 14px rgba(16,185,129,0.4)',
                transition: 'all 0.2s'
              }}
            >
              {otpLoading ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  <span>Verifying Code & Creating Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle style={{ width: 17, height: 17 }} />
                  <span>VERIFY OTP & COMPLETE SIGNUP</span>
                </>
              )}
            </button>

            {/* Resend Timer & Actions */}
            <div style={{ fontSize: '13px', color: '#8EA8C7' }}>
              {resendTimer > 0 ? (
                <span>Resend code available in <strong style={{ color: '#38A7FF' }}>{resendTimer}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpLoading}
                  style={{ background: 'none', border: 'none', color: '#38A7FF', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Resend OTP Code
                </button>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{ background: 'none', border: 'none', color: '#6E86A5', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Edit email or account details
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4: REGISTRATION COMPLETE & REDIRECT
        ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', boxShadow: '0 0 24px rgba(16,185,129,0.4)' }}>
              <CheckCircle style={{ width: 40, height: 40 }} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
              🎉 Registration Complete!
            </h2>
            <p style={{ fontSize: '14px', color: '#A7F3D0', margin: '0 0 24px' }}>
              Your student athlete account is now active and linked to the official college roster.
            </p>

            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              style={{
                padding: '13px 32px',
                background: 'linear-gradient(135deg, #1677FF 0%, #0052CC 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(22,119,255,0.4)'
              }}
            >
              <span>GO TO STUDENT DASHBOARD</span>
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RegisterPage;
