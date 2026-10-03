/**
 * Authentication Management Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if token already present
  const user = getCurrentUser();
  const token = localStorage.getItem('gasc_token');

  // Handle Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-password').value;
      const btn = loginForm.querySelector('button[type="submit"]');

      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...';

        const res = await apiRequest('/auth/login', 'POST', { identifier, password });
        setCurrentUser(res.user, res.token);
        showToast(res.message, 'success', 'Login Success');

        setTimeout(() => {
          if (res.user.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl');
            const targetDash = (window.location.protocol === 'file:' || (window.GASC_CONFIG && window.GASC_CONFIG.IS_PACKAGED_APP && !window.location.protocol.startsWith('http')))
              ? 'student-dashboard.html'
              : '/student/dashboard';
            window.location.href = returnUrl ? decodeURIComponent(returnUrl) : targetDash;
          }
        }, 800);
      } catch (err) {
        showToast(err.message, 'error', 'Login Failed');
        btn.disabled = false;
        btn.innerHTML = 'Sign In <i class="bi bi-arrow-right ms-1"></i>';
      }
    });
  }

  // Student Registration Form with OTP Verification
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const regInput = document.getElementById('register-number-input');
    if (regInput) {
      regInput.addEventListener('blur', () => {
        if (regInput.value.trim().length >= 5) {
          verifyStudentRegistration(false);
        }
      });
    }

    // Auto-format OTP input
    const otpInput = document.getElementById('otp-code-input');
    if (otpInput) {
      otpInput.addEventListener('input', (e) => {
        // Strip non-numeric characters
        otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
        if (otpInput.value.length === 6) {
          // Auto trigger verification when 6 digits are typed
          verifySubmittedOtp();
        }
      });

      otpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifySubmittedOtp();
        }
      });
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');

      const formData = new FormData(registerForm);
      const password = formData.get('password');
      const confirmPassword = formData.get('confirmPassword');
      const email = formData.get('email');
      const otpVal = document.getElementById('otp-code-input') ? document.getElementById('otp-code-input').value.trim() : '';

      if (password !== confirmPassword) {
        showToast('Password and Confirm Password do not match!', 'error', 'Validation Error');
        return;
      }

      // Check if email has been verified via OTP
      if (!isEmailVerified) {
        if (otpVal.length === 6) {
          // Try verifying OTP right now
          const verified = await verifySubmittedOtp();
          if (!verified) return;
        } else {
          showToast('Please verify your email with the 6-digit OTP code before completing registration!', 'warning', 'Email Verification Required');
          const otpContainer = document.getElementById('otp-verification-container');
          if (otpContainer && otpContainer.classList.contains('d-none')) {
            requestRegistrationOtp();
          } else {
            const codeInput = document.getElementById('otp-code-input');
            if (codeInput) codeInput.focus();
          }
          return;
        }
      }

      // Append verified OTP to form data
      if (otpVal) {
        formData.append('otp', otpVal);
      }

      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registering Student Athlete...';

        const res = await apiRequest('/auth/register', 'POST', formData, true);
        showToast(res.message, 'success', 'Registration Complete');
        setCurrentUser(res.user, res.token);

        setTimeout(() => {
          const targetDash = (window.location.protocol === 'file:' || (window.GASC_CONFIG && window.GASC_CONFIG.IS_PACKAGED_APP && !window.location.protocol.startsWith('http')))
            ? 'student-dashboard.html'
            : '/student/dashboard';
          window.location.href = targetDash;
        }, 1200);
      } catch (err) {
        showToast(err.message, 'error', 'Registration Failed');
        btn.disabled = false;
        btn.innerHTML = 'Complete Registration <i class="bi bi-check-circle ms-1"></i>';
      }
    });
  }
});

// Email OTP State & Timers
let isEmailVerified = false;
let resendTimerInterval = null;
let expiryTimerInterval = null;

/**
 * Request OTP to be sent to student's email
 */
async function requestRegistrationOtp() {
  const emailInput = document.getElementById('student-email-input');
  const regInput = document.getElementById('register-number-input');
  const nameInput = document.getElementById('student-name-input');
  const sendBtn = document.getElementById('btn-send-otp');
  const resendBtn = document.getElementById('btn-resend-otp');
  const otpContainer = document.getElementById('otp-verification-container') || document.getElementById('otp-input-container');
  const feedbackMsg = document.getElementById('otp-status-feedback');
  const infoMsg = document.getElementById('otp-sent-info-msg');

  if (!regInput || !regInput.value.trim()) {
    showToast('Please enter and verify your College Register Number first.', 'warning', 'Register Number Required');
    if (regInput) regInput.focus();
    return;
  }

  if (!emailInput || !emailInput.value.trim()) {
    showToast('Please enter your email address to receive OTP.', 'warning', 'Email Required');
    if (emailInput) emailInput.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput.value.trim())) {
    showToast('Please enter a valid email address format.', 'warning', 'Invalid Email');
    emailInput.focus();
    return;
  }

  try {
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
    }
    if (resendBtn) {
      resendBtn.disabled = true;
    }

    const payload = {
      email: emailInput.value.trim(),
      registerNumber: regInput.value.trim().toUpperCase(),
      name: nameInput ? nameInput.value.trim() : ''
    };

    const res = await apiRequest('/auth/send-otp', 'POST', payload);

    showToast(res.message, 'success', 'OTP Dispatched');

    // Show OTP container
    if (otpContainer) {
      otpContainer.classList.remove('d-none');
      setTimeout(() => {
        otpContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }

    if (infoMsg) {
      infoMsg.innerHTML = `We have sent a 6-digit OTP code to <strong>${res.maskedEmail || emailInput.value}</strong>.`;
    }

    if (feedbackMsg) {
      if (res.simulatedOtp) {
        feedbackMsg.innerHTML = `<span class="text-success fw-bold">Test Mode Active:</span> Your OTP is <code>${res.simulatedOtp}</code>`;
        const codeInput = document.getElementById('otp-code-input') || document.getElementById('registration-otp-code');
        if (codeInput && !codeInput.value) codeInput.value = res.simulatedOtp;
      } else {
        feedbackMsg.innerHTML = 'Please check your Inbox (and Spam/Junk folder if not received in 1 min).';
      }
    }

    // Focus on OTP input
    const codeInput = document.getElementById('otp-code-input') || document.getElementById('registration-otp-code');
    if (codeInput) {
      setTimeout(() => codeInput.focus(), 250);
    }

    // Start 45-second Resend Cooldown
    startResendCountdown(45);

    // Start 10-minute Expiry Timer
    startExpiryCountdown(10 * 60);

  } catch (err) {
    showToast(err.message, 'error', 'Failed to Send OTP');
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="bi bi-send-fill me-1"></i> Send OTP';
    }
  }
}

/**
 * Verify Submitted 6-Digit OTP
 */
async function verifySubmittedOtp() {
  const emailInput = document.getElementById('student-email-input');
  const codeInput = document.getElementById('otp-code-input') || document.getElementById('registration-otp-code');
  const verifyBtn = document.getElementById('btn-verify-otp');
  const badge = document.getElementById('email-verified-badge');
  const unverifiedBadge = document.getElementById('otp-badge');
  const sendBtn = document.getElementById('btn-send-otp');
  const changeBtn = document.getElementById('btn-change-email');
  const otpContainer = document.getElementById('otp-verification-container') || document.getElementById('otp-input-container');

  if (!emailInput || !codeInput) return false;

  const otp = codeInput.value.trim();
  if (otp.length !== 6) {
    showToast('Please enter the complete 6-digit OTP code.', 'warning', 'Incomplete Code');
    codeInput.focus();
    return false;
  }

  try {
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verifying...';
    }

    const res = await apiRequest('/auth/verify-otp', 'POST', {
      email: emailInput.value.trim(),
      otp: otp
    });

    isEmailVerified = true;
    showToast(res.message, 'success', 'Email Verified');

    // UI Updates on Success
    if (badge) badge.classList.remove('d-none');
    if (unverifiedBadge) unverifiedBadge.classList.add('d-none');
    if (emailInput) {
      emailInput.readOnly = true;
      emailInput.classList.add('border-success', 'bg-light');
    }
    if (sendBtn) sendBtn.classList.add('d-none');
    if (changeBtn) changeBtn.classList.remove('d-none');
    if (otpContainer) otpContainer.classList.add('d-none');

    // Clear timers
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    if (expiryTimerInterval) clearInterval(expiryTimerInterval);

    return true;
  } catch (err) {
    showToast(err.message, 'error', 'Verification Failed');
    return false;
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<i class="bi bi-shield-check me-1"></i> Verify OTP';
    }
  }
}

/**
 * Allow user to edit email if mistyped
 */
function enableEmailChange() {
  const emailInput = document.getElementById('student-email-input');
  const badge = document.getElementById('email-verified-badge');
  const sendBtn = document.getElementById('btn-send-otp');
  const changeBtn = document.getElementById('btn-change-email');
  const codeInput = document.getElementById('otp-code-input');

  isEmailVerified = false;
  if (emailInput) {
    emailInput.readOnly = false;
    emailInput.classList.remove('border-success', 'bg-light');
    emailInput.focus();
  }
  if (badge) badge.classList.add('d-none');
  if (sendBtn) sendBtn.classList.remove('d-none');
  if (changeBtn) changeBtn.classList.add('d-none');
  if (codeInput) codeInput.value = '';

  showToast('You can now update your email address. An OTP will be required for the new email.', 'info', 'Email Editing');
}

/**
 * Resend Countdown Timer Helper
 */
function startResendCountdown(seconds) {
  const resendBtn = document.getElementById('btn-resend-otp');
  const countdownText = document.getElementById('resend-countdown-text');
  if (!resendBtn || !countdownText) return;

  if (resendTimerInterval) clearInterval(resendTimerInterval);

  let remaining = seconds;
  resendBtn.disabled = true;
  countdownText.textContent = `(in ${remaining}s)`;

  resendTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(resendTimerInterval);
      resendBtn.disabled = false;
      countdownText.textContent = '';
    } else {
      countdownText.textContent = `(in ${remaining}s)`;
    }
  }, 1000);
}

/**
 * Expiry Countdown Timer Helper
 */
function startExpiryCountdown(totalSeconds) {
  const timerDisplay = document.getElementById('otp-timer-display');
  if (!timerDisplay) return;

  if (expiryTimerInterval) clearInterval(expiryTimerInterval);

  let remaining = totalSeconds;

  const updateDisplay = () => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    timerDisplay.innerHTML = `<i class="bi bi-clock-history me-1"></i> Expires in ${formatted}`;
  };

  updateDisplay();

  expiryTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(expiryTimerInterval);
      timerDisplay.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> OTP Expired`;
      timerDisplay.className = 'badge bg-danger text-white border';
    } else {
      updateDisplay();
    }
  }, 1000);
}


// Real-time verification of GASC Idappadi bonafide student
async function verifyStudentRegistration(isManualClick = true) {
  const regInput = document.getElementById('register-number-input');
  const msgBox = document.getElementById('student-verification-msg');
  const verifyBtn = document.getElementById('btn-verify-student');
  if (!regInput || !msgBox) return;

  const regNo = regInput.value.trim().toUpperCase();
  if (!regNo) {
    if (isManualClick) showToast('Please enter your college register number.', 'warning', 'Required');
    return;
  }

  try {
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    const res = await apiRequest(`/auth/verify-student/${regNo}`);
    msgBox.classList.remove('d-none');
    msgBox.innerHTML = `
      <div class="alert alert-success py-2 px-3 mt-2 mb-0 rounded-3 border-success text-start">
        <div class="fw-bold"><i class="bi bi-patch-check-fill text-success me-1"></i> Bonafide Student Verified!</div>
        <div style="font-size: 0.84rem;">
          <strong>${res.student.name}</strong> — ${res.student.department} (${res.student.year}, Sec: ${res.student.section})<br>
          <span class="text-success"><i class="bi bi-building me-1"></i>${res.student.collegeName}</span>
        </div>
      </div>
    `;

    // Auto-populate form fields from verified collegiate roster
    const nameInput = document.getElementById('student-name-input');
    if (nameInput) nameInput.value = res.student.name;

    const deptSelect = document.getElementById('student-dept-select');
    if (deptSelect && res.student.department) deptSelect.value = res.student.department;

    const yearSelect = document.getElementById('student-year-select');
    if (yearSelect && res.student.year) yearSelect.value = res.student.year;

    const sectionInput = document.getElementById('student-section-input');
    if (sectionInput && res.student.section) sectionInput.value = res.student.section;

    const genderSelect = document.getElementById('student-gender-select');
    if (genderSelect && res.student.gender) genderSelect.value = res.student.gender;

    showToast(`Verified bonafide student: ${res.student.name}`, 'success', 'Student Verified');
  } catch (err) {
    msgBox.classList.remove('d-none');
    msgBox.innerHTML = `
      <div class="alert alert-danger py-2 px-3 mt-2 mb-0 rounded-3 border-danger text-start">
        <div class="fw-bold"><i class="bi bi-slash-circle-fill text-danger me-1"></i> Access Restricted!</div>
        <div style="font-size: 0.84rem;">
          ${err.message || 'Register number is not enrolled at GASC Idappadi.'}
        </div>
      </div>
    `;
    if (isManualClick) {
      showToast(err.message, 'error', 'College Verification');
    }
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<i class="bi bi-shield-check me-1"></i> Verify';
    }
  }
}


// Quick Demo Fillers for Viva / Testing
function fillDemoAdmin() {
  const idField = document.getElementById('login-identifier');
  const pwdField = document.getElementById('login-password');
  if (idField && pwdField) {
    idField.value = 'admin';
    pwdField.value = 'admin123';
    showToast('Admin (Sports Incharge) credentials filled! Click Sign In.', 'info', 'Demo Preset');
  }
}

function fillDemoStudent() {
  const idField = document.getElementById('login-identifier');
  const pwdField = document.getElementById('login-password');
  if (idField && pwdField) {
    idField.value = '23UGCS101';
    pwdField.value = 'student123';
    showToast('Student Player (Arun Kumar) credentials filled! Click Sign In.', 'info', 'Demo Preset');
  }
}

// Global window mappings for inline event listeners
window.requestRegistrationOtp = requestRegistrationOtp;
window.verifySubmittedOtp = verifySubmittedOtp;
window.verifyRegistrationOtpCode = verifySubmittedOtp;
window.enableEmailChange = enableEmailChange;
window.verifyStudentRegistration = verifyStudentRegistration;
window.fillDemoAdmin = fillDemoAdmin;
window.fillDemoStudent = fillDemoStudent;

