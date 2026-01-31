// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization'); // Required for org name

const ALLOWED_ROLES = [
  'MasterAdmin',
  'Admin',
  'ProjectManager',
  'Developer',
  'QATester'
];

// GET ALL USERS (filtered by companyCode - Admin/Master only)
router.get('/', async (req, res) => {
  try {
    const { companyCode } = req.query;
    const filter = companyCode?.trim()
      ? { companyCode: companyCode.trim().toUpperCase() }
      : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyCode: user.companyCode,
        role: user.role,
        status: user.status || 'active',
        joined: user.createdAt
          ? new Date(user.createdAt).toISOString().split('T')[0]
          : '-',
        lastActive: user.lastLogin
          ? new Date(user.lastLogin).toISOString().split('T')[0]
          : '-'
      }))
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET SINGLE USER BY ID (for profile page - used by all roles)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let organizationName = null;
    if (user.companyCode) {
      const org = await Organization.findOne({ code: user.companyCode });
      organizationName = org ? org.name : null;
    }

    res.json({
      success: true,
      user: {
        _id: user._id.toString(),
        name: user.name || 'N/A',
        email: user.email,
        role: user.role,
        companyCode: user.companyCode || null,
        organizationName,
        status: user.status || 'active',
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null
      }
    });
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST - CREATE USER (Admin or MasterAdmin only)
router.post('/', async (req, res) => {
  try {
    const { name, email, companyCode, role, password } = req.body;

    // Validation
    if (!name?.trim() || !email?.trim() || !companyCode?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, companyCode, and password are required' });
    }

    if (password.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` });
    }

    const emailLower = email.trim().toLowerCase();
    const codeUpper = companyCode.trim().toUpperCase();

    const existing = await User.findOne({ email: emailLower, companyCode: codeUpper });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists in this organization' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 12);

    const user = new User({
      name: name.trim(),
      email: emailLower,
      companyCode: codeUpper,
      password: passwordHash,
      role: role || 'Developer',
      status: 'active',
      createdAt: new Date()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyCode: user.companyCode,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate email in organization' });
    }
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// PATCH - UPDATE USER
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, companyCode, role, status, password } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (companyCode) updateData.companyCode = companyCode.trim().toUpperCase();
    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      updateData.role = role;
    }
    if (status) updateData.status = status;
    if (password?.trim()) {
      if (password.trim().length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }
      updateData.password = await bcrypt.hash(password.trim(), 12);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// DELETE USER
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;