// server/models/IssueType.js
const mongoose = require('mongoose');

const issueTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '⭐'
  },
  type: {
    type: String,
    enum: ['standard', 'subtask'],
    default: 'standard'
  },
  organizationCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  isGlobal: {
    type: Boolean,
    default: false  // true = Master Admin only, false = per organization
  }
}, { timestamps: true });

issueTypeSchema.index({ organizationCode: 1 });
issueTypeSchema.index({ name: 1, organizationCode: 1 }, { unique: true });

module.exports = mongoose.model('IssueType', issueTypeSchema);