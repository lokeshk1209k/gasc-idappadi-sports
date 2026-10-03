const mongoose = require('mongoose');

const CollegeStudentRosterSchema = new mongoose.Schema({
  registerNumber: {
    type: String,
    required: [true, 'Register number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    enum: ['I Year', 'II Year', 'III Year'],
    default: 'I Year'
  },
  section: {
    type: String,
    default: 'A'
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  },
  collegeName: {
    type: String,
    default: 'Government Arts and Science College, Idappadi'
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  registeredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CollegeStudentRoster', CollegeStudentRosterSchema);
