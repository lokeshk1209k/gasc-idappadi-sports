const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  captainName: {
    type: String,
    required: [true, 'Captain Name is required'],
    trim: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport'
  },
  sportName: {
    type: String,
    required: [true, 'Sport Name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  year: {
    type: String,
    enum: ['I Year', 'II Year', 'III Year', 'I PG', 'II PG'],
    default: 'I Year',
    required: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  name: {
    type: String,
    trim: true
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

module.exports = mongoose.model('Team', TeamSchema);
