const mongoose = require('mongoose');

const CompetitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Competition name is required'],
    trim: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  sportName: {
    type: String
  },
  type: {
    type: String,
    enum: ['Inter-Department', 'Inter-College', 'District', 'State', 'University', 'National', 'Friendly Match'],
    default: 'Inter-College'
  },
  level: {
    type: String,
    enum: ['Department', 'College', 'District', 'Zonal', 'University', 'State', 'National'],
    default: 'College'
  },
  venue: {
    type: String,
    required: true,
    default: 'GASC Idappadi Sports Ground'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    default: '09:00 AM'
  },
  endTime: {
    type: String,
    default: '05:00 PM'
  },
  registrationStart: {
    type: Date,
    default: Date.now
  },
  registrationEnd: {
    type: Date,
    required: true
  },
  organizer: {
    type: String,
    default: 'GASC Idappadi Sports Board'
  },
  eligibility: {
    type: String,
    default: 'All enrolled undergraduate and postgraduate students'
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  currentRegistrations: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  bannerImage: {
    type: String,
    default: '/images/competitions/default.jpg'
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Registration Open'
  },
  resultSummary: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Competition', CompetitionSchema);
