const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    default: 'Government Arts and Science College, Idappadi'
  },
  departmentName: {
    type: String,
    default: 'Department of Physical Education & Sports'
  },
  sportsInchargeName: {
    type: String,
    default: 'Dr. R. ANITHA M.P.Ed., M.Phil., Ph.D.'
  },
  sportsInchargeRole: {
    type: String,
    default: 'Physical Directress & Sports Incharge'
  },
  email: {
    type: String,
    default: 'sports@gascidappadi.edu.in'
  },
  phone: {
    type: String,
    default: '+91 94432 18765'
  },
  address: {
    type: String,
    default: 'Government Arts and Science College, Idappadi, Salem District - 637101, Tamil Nadu'
  },
  officeHours: {
    type: String,
    default: '08:30 AM - 05:30 PM (Mon - Sat)'
  },
  autoNotifications: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);
