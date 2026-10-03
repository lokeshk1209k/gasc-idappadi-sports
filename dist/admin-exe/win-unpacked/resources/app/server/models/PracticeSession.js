const mongoose = require('mongoose');

const PracticeSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Sports Practice Session'
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  sportName: {
    type: String
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  teamName: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    default: '06:30 AM'
  },
  endTime: {
    type: String,
    required: true,
    default: '08:00 AM'
  },
  venue: {
    type: String,
    required: true,
    default: 'College Main Ground'
  },
  coach: {
    type: String,
    default: 'Physical Director'
  },
  focusArea: {
    type: String,
    default: 'Fitness, drills, and match simulations'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PracticeSession', PracticeSessionSchema);
