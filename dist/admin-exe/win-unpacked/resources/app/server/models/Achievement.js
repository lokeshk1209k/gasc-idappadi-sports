const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String
  },
  registerNumber: {
    type: String
  },
  department: {
    type: String
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport'
  },
  sportName: {
    type: String
  },
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competition'
  },
  competitionName: {
    type: String
  },
  title: {
    type: String,
    required: [true, 'Achievement title is required'],
    trim: true
  },
  position: {
    type: String,
    default: 'Winner / 1st Place'
  },
  medal: {
    type: String,
    enum: ['Gold', 'Silver', 'Bronze', 'Participation / Trophy', 'None'],
    default: 'Gold'
  },
  year: {
    type: String,
    default: '2025 - 2026'
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  },
  certificate: {
    type: String
  },
  photo: {
    type: String,
    default: '/images/achievements/default.jpg'
  },
  isFeatured: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Achievement', AchievementSchema);
