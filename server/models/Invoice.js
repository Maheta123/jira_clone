  // models/Invoice.js
  const mongoose = require('mongoose');

  const invoiceSchema = new mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true },
    organization: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: false },
    plan: { type: String, required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: false },
    amount: { type: Number, required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    date: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['paid', 'pending', 'overdue'], required: true, default: 'pending' }
  }, { timestamps: true });

  module.exports = mongoose.model('Invoice', invoiceSchema);