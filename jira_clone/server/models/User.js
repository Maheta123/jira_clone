const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  companyCode: {  
    type: String, 
    required: true, 
    uppercase: true, 
    trim: true,
    minlength: 3,
    maxlength: 12
  },
  password: { type: String, required: true, minlength: 8 },
  role: { 
    type: String, 
    enum: ['MasterAdmin', 'Admin', 'ProjectManager', 'Developer', 'QATester'],
    default: 'Developer' 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'invited'],
    default: 'active' 
  },
  // ── NEW FIELD ──
  currentProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  // ───────────────
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);