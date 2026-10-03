const mongoose = require('mongoose');

const CompetitionRegistrationSchema = new mongoose.Schema({
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competition',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  preferredPosition: {
    type: String
  },
  remarks: {
    type: String
  },
  adminRemarks: {
    type: String
  },
  reviewedAt: {
    type: Date
  }
});

// Compound index to prevent duplicate registrations
CompetitionRegistrationSchema.index({ competitionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('CompetitionRegistration', CompetitionRegistrationSchema);
