const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true
    },
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    plan: {
      type: String,
      enum: ['Starter', 'Pro', 'Enterprise'],
      default: 'Starter'
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended'],
      default: 'trial'
    }
  },
  { timestamps: true }
);

// ✅ SAFE PRE-SAVE HOOK (NO next)
organizationSchema.pre('save', async function () {
  if (!this.code && this.name) {
    const words = this.name.toUpperCase().match(/\b(\w)/g) || [];
    let generated = words.join('');
    if (generated.length >= 3) generated = generated.slice(0, 5);
    else if (generated.length === 2) generated += 'X';
    else if (generated.length === 1) generated += 'ORG';
    else generated = 'ORG' + Math.random().toString(36).substring(2, 5).toUpperCase();

    this.code = generated;
  }
});

module.exports = mongoose.model('Organization', organizationSchema);
