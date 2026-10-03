/**
 * In-Memory OTP Store with automatic expiration & attempt tracking
 */
class OtpStore {
  constructor() {
    this.store = new Map();
  }

  getKey(email, purpose = 'registration') {
    return `${email.toLowerCase().trim()}_${purpose}`;
  }

  saveOtp(email, otp, registerNumber, purpose = 'registration', expiryMinutes = 10) {
    const key = this.getKey(email, purpose);
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
    
    this.store.set(key, {
      email: email.toLowerCase().trim(),
      otp: String(otp).trim(),
      registerNumber: registerNumber ? registerNumber.toUpperCase().trim() : '',
      purpose,
      verified: false,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(expiresAt)
    });

    return this.store.get(key);
  }

  getOtp(email, purpose = 'registration') {
    const key = this.getKey(email, purpose);
    const record = this.store.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt.getTime()) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  verifyOtp(email, inputOtp, purpose = 'registration') {
    const record = this.getOtp(email, purpose);
    if (!record) {
      return { success: false, message: 'OTP has expired or does not exist. Please request a new OTP.' };
    }

    if (record.attempts >= 5) {
      this.store.delete(this.getKey(email, purpose));
      return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    record.attempts += 1;

    if (String(record.otp).trim() !== String(inputOtp).trim()) {
      return { 
        success: false, 
        message: `Invalid OTP code. ${5 - record.attempts} attempts remaining.` 
      };
    }

    record.verified = true;
    return { success: true, message: 'OTP verified successfully!', record };
  }

  deleteOtp(email, purpose = 'registration') {
    this.store.delete(this.getKey(email, purpose));
  }
}

module.exports = new OtpStore();
