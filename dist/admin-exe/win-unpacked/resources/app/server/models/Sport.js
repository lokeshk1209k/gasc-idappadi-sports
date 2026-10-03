const mongoose = require('mongoose');

const SportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sport name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Team Sport', 'Individual Sport', 'Athletics & Track', 'Indoor Games'],
    default: 'Team Sport'
  },
  indoorOutdoor: {
    type: String,
    enum: ['Indoor', 'Outdoor', 'Both'],
    default: 'Outdoor'
  },
  playerCount: {
    type: Number,
    default: 11
  },
  equipmentRequired: [{
    type: String
  }],
  rules: {
    type: String
  },
  coach: {
    type: String,
    default: 'Sports Incharge'
  },
  image: {
    type: String,
    default: '/images/sports/default.jpg'
  },
  icon: {
    type: String,
    default: 'bi-trophy'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Sport', SportSchema);
