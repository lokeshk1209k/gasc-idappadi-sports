const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  practiceSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PracticeSession',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused'],
    default: 'Present'
  },
  date: {
    type: Date,
    required: true
  },
  remarks: {
    type: String
  },
  recordedBy: {
    type: String,
    default: 'Sports Incharge'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to prevent duplicate attendance record for the same session and student
AttendanceSchema.index({ practiceSessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
