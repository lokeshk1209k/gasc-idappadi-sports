const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Gallery item title is required'],
    trim: true
  },
  description: {
    type: String
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport'
  },
  sportName: {
    type: String
  },
  category: {
    type: String,
    enum: ['Tournaments', 'Annual Sports Day', 'Practice Sessions', 'Prize Distribution', 'Campus Facilities', 'General'],
    default: 'Tournaments'
  },
  image: {
    type: String,
    required: true,
    default: '/images/gallery/default.jpg'
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Gallery', GallerySchema);
