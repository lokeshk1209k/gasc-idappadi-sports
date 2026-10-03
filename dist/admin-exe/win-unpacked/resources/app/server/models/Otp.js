const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  registerNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'password_reset', 'general'],
    default: 'registration'
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-delete document after 10 minutes (600s)
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

// Compound index for finding active OTPs
otpSchema.index({ email: 1, purpose: 1, verified: 1 });

module.exports = mongoose.model('Otp', otpSchema);
