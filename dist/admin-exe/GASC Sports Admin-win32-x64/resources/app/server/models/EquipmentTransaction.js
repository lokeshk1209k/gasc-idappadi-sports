const mongoose = require('mongoose');

const EquipmentTransactionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String
  },
  registerNumber: {
    type: String
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  equipmentName: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  expectedReturnDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Issued', 'Returned', 'Damaged', 'Lost', 'Overdue'],
    default: 'Issued'
  },
  returnCondition: {
    type: String,
    enum: ['Good', 'Damaged', 'Lost', 'Partially Damaged', 'Pending'],
    default: 'Pending'
  },
  damageDescription: {
    type: String
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  purpose: {
    type: String,
    default: 'College Practice / Match'
  },
  remarks: {
    type: String
  },
  issuedBy: {
    type: String,
    default: 'Sports Incharge'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EquipmentTransaction', EquipmentTransactionSchema);
