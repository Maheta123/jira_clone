// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');  


// Fallback only for local dev — MUST use real .env in production!
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-please-change-in-production-2026';

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, companyCode, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !companyCode?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      companyCode: companyCode.trim().toUpperCase(),
      password: passwordHash,
      role: role || 'Developer',
      status: 'active' // explicit default
    });

    const savedUser = await user.save();

    const token = jwt.sign(
      {
        id: savedUser._id.toString(), // ← standardize as string
        email: savedUser.email,
        role: savedUser.role,
        companyCode: savedUser.companyCode
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = savedUser.toObject();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userData,
      token
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, companyCode, password } = req.body;

    if (!email?.trim() || !companyCode?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email, Company Code and Password are required' });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      companyCode: companyCode.trim().toUpperCase(),
      status: 'active'
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account not active' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id.toString(), // ← consistent string id
        email: user.email,
        role: user.role,
        companyCode: user.companyCode
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
});

// GET current authenticated user (protected route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user is already set by authMiddleware
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('GET /me ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;