const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required']
  },
  category: {
    type: String,
    enum: ['Competition', 'Practice', 'Equipment', 'Team Selection', 'General', 'Urgent'],
    default: 'General'
  },
  targetType: {
    type: String,
    enum: ['All Students', 'Specific Sport', 'Specific Team', 'Specific Student'],
    default: 'All Students'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['User', 'Sport', 'Team', 'Competition']
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sender: {
    type: String,
    default: 'Sports Incharge'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
