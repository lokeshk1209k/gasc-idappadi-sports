const mongoose = require('mongoose');

const PlayerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  primarySport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport'
  },
  secondarySports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport'
  }],
  position: {
    type: String,
    trim: true,
    default: 'All Rounder'
  },
  jerseyNumber: {
    type: Number,
    default: 7
  },
  playingLevel: {
    type: String,
    enum: ['College Level', 'District Level', 'Zonal Level', 'University Level', 'State Level', 'National Level'],
    default: 'College Level'
  },
  experience: {
    type: String,
    default: '1 Year'
  },
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    scorePoints: { type: Number, default: 0 }, // Goals / Runs / Points
    awardsCount: { type: Number, default: 0 },
    competitionsParticipated: { type: Number, default: 0 }
  },
  bio: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlayerProfile', PlayerProfileSchema);
