// server/routes/organizations.js
const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const Project = require('../models/Project'); // Make sure this model exists!

// Helper: Generate short unique code from name
function generateCode(name) {
  const words = name.trim().toUpperCase().match(/\b(\w)/g) || [];
  let code = words.join('');
  if (code.length >= 3) return code.slice(0, 5);
  if (code.length === 2) return code + 'X';
  if (code.length === 1) return code + 'ORG';
  return 'ORG' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// GET ALL ORGANIZATIONS (with real user & project counts)
router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 });

    const formattedOrgs = await Promise.all(
      organizations.map(async (org) => {
        const usersCount = await User.countDocuments({ companyCode: org.code });
        const projectsCount = await Project.countDocuments({ organizationCode: org.code });

        return {
          id: org._id.toString(),
          code: org.code || 'N/A',
          name: org.name,
          domain: org.domain,
          plan: org.plan || 'Starter',
          status: org.status || 'trial',
          created: new Date(org.createdAt).toISOString().split('T')[0],
          users: usersCount,
          projects: projectsCount
        };
      })
    );

    res.json({
      success: true,
      organizations: formattedOrgs
    });
  } catch (err) {
    console.error('Error fetching organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// POST - Create new organization
router.post('/', async (req, res) => {
  try {
    const { name, domain, plan, status, code } = req.body;

    if (!name?.trim() || !domain?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and Domain are required' });
    }

    const trimmedDomain = domain.trim().toLowerCase();

    // Prevent duplicate domain
    if (await Organization.findOne({ domain: trimmedDomain })) {
      return res.status(409).json({ success: false, message: 'Domain already exists' });
    }

    const newOrg = new Organization({
      name: name.trim(),
      code: code?.trim().toUpperCase() || generateCode(name.trim()),
      domain: trimmedDomain,
      plan: plan || 'Starter',
      status: status || 'trial'
    });

    const saved = await newOrg.save();

    res.status(201).json({
      success: true,
      organization: {
        id: saved._id.toString(),
        code: saved.code,
        name: saved.name,
        domain: saved.domain,
        plan: saved.plan,
        status: saved.status,
        created: new Date(saved.createdAt).toISOString().split('T')[0],
        users: 0,          // new org → 0 users initially
        projects: 0        // new org → 0 projects initially
      }
    });
  } catch (err) {
    console.error('Create organization error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate code or domain' });
    }
    res.status(500).json({ success: false, message: 'Failed to create organization' });
  }
});

// PATCH - Update organization + auto-update users if code changes
router.patch('/:id', async (req, res) => {
  try {
    const { name, domain, plan, status, code } = req.body;

    const oldOrg = await Organization.findById(req.params.id);
    if (!oldOrg) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const oldCode = oldOrg.code;

    const updateData = {};

    if (name) updateData.name = name.trim();
    if (domain) updateData.domain = domain.trim().toLowerCase();
    if (plan) updateData.plan = plan;
    if (status && ['active', 'trial', 'suspended'].includes(status)) {
      updateData.status = status;
    }

    // Handle code update (manual or auto)
    if (code !== undefined && code !== null && code.trim() !== '') {
      updateData.code = code.trim().toUpperCase();
    } else if (name && !oldOrg.code) {
      updateData.code = generateCode(name.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // Update the organization
    const updatedOrg = await Organization.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Auto-update all users if code changed
    if (updateData.code && updateData.code !== oldCode) {
      const result = await User.updateMany(
        { companyCode: oldCode },
        { companyCode: updateData.code }
      );
      console.log(`Updated ${result.modifiedCount} users: ${oldCode} → ${updateData.code}`);
    }

    // Return updated org with fresh counts
    const usersCount = await User.countDocuments({ companyCode: updatedOrg.code });
    const projectsCount = await Project.countDocuments({ organizationCode: updatedOrg.code });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: {
        id: updatedOrg._id.toString(),
        code: updatedOrg.code,
        name: updatedOrg.name,
        domain: updatedOrg.domain,
        plan: updatedOrg.plan,
        status: updatedOrg.status,
        created: new Date(updatedOrg.createdAt).toISOString().split('T')[0],
        users: usersCount,
        projects: projectsCount
      }
    });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
});

module.exports = router;