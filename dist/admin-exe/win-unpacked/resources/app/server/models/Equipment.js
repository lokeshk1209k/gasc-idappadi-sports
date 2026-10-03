const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Equipment code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  sportName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Balls & Shuttles', 'Bats & Rackets', 'Protective Gear', 'Nets & Goals', 'Track & Field Gear', 'Training & Cones', 'Board & Accessories'],
    default: 'Balls & Shuttles'
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  issuedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  damagedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  lostQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  minimumStock: {
    type: Number,
    default: 5,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  purchasePrice: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    default: 'Salem Sports Goods Co.'
  },
  storageLocation: {
    type: String,
    default: 'Main Sports Room, Rack A1'
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Needs Maintenance'],
    default: 'Good'
  },
  warranty: {
    type: String,
    default: '1 Year'
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Under Maintenance'],
    default: 'In Stock'
  },
  description: {
    type: String
  },
  image: {
    type: String,
    default: '/images/equipment/default.jpg'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Automatic calculation before saving
EquipmentSchema.pre('save', function (next) {
  // Available = Total - Issued - Damaged - Lost
  const calcAvailable = this.totalQuantity - (this.issuedQuantity + this.damagedQuantity + this.lostQuantity);
  this.availableQuantity = Math.max(0, calcAvailable);

  if (this.availableQuantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.availableQuantity <= this.minimumStock) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

module.exports = mongoose.model('Equipment', EquipmentSchema);
