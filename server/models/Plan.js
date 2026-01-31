
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  priceMonthly: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  priceYearly: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  features: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);