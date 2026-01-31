// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ['Active', 'In Progress', 'Completed', 'Pending', 'Archived'],
    default: 'Active'
  },

  issues: {
    type: Number,
    default: 0,
    min: 0
  },

  // For future real calculation (MVP: we'll send dummy values from API)
  tasksCount: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  },

  // Optional – can be calculated or set manually later
  dueSoon: {
    type: Boolean,
    default: false
  },

  membersLimit: {
    type: Number,
    default: 5,
    min: 1
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  companyCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },

  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

projectSchema.index({ companyCode: 1 });
projectSchema.index({ name: 1, companyCode: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);