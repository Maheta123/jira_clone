const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// GET projects for company (supports both field names for backward compatibility)
router.get('/', async (req, res) => {
  try {
    const { companyCode } = req.query;
    if (!companyCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Company code required' });
    }

    const code = companyCode.trim().toUpperCase();

    const projects = await Project.find({
      $or: [
        { companyCode: code },
        { organizationCode: code } // ← Support for old data
      ]
    })
      .populate('managerId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      projects: projects.map(p => ({
        _id: p._id,
        name: p.name,
        status: p.status,
        issues: p.issues,
        members: p.members,
        companyCode: p.companyCode || p.organizationCode || code, // Normalize
        managerId: p.managerId?._id || null,
        managerName: p.managerId?.name || 'Unassigned',
        joined: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
        createdBy: p.createdBy
      }))
    });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE project (uses companyCode)
router.post('/', async (req, res) => {
  try {
    const { name, status, issues, members, companyCode, managerId, createdBy } = req.body;

    if (!name?.trim() || !companyCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and Company Code required' });
    }

    const project = new Project({
      name: name.trim(),
      status: status || 'Active',
      issues: Number(issues) || 0,
      members: Number(members) || 1,
      companyCode: companyCode.trim().toUpperCase(),
      managerId: managerId || null,
      createdBy: createdBy || 'system'
    });

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('managerId', 'name')
      .lean();

    res.status(201).json({
      success: true,
      project: {
        ...populated,
        managerName: populated.managerId?.name || 'Unassigned',
        joined: populated.createdAt ? new Date(populated.createdAt).toISOString().split('T')[0] : '-'
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// UPDATE & DELETE remain the same (already good)
router.patch('/:id', async (req, res) => {
  try {
    const updateData = {};
    const { name, status, issues, members, managerId } = req.body;

    if (name) updateData.name = name.trim();
    if (status) updateData.status = status;
    if (issues !== undefined) updateData.issues = Number(issues);
    if (members !== undefined) updateData.members = Number(members);
    if (managerId !== undefined) updateData.managerId = managerId || null;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('managerId', 'name')
      .lean();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      project: {
        ...project,
        managerName: project.managerId?.name || 'Unassigned',
        joined: project.createdAt ? new Date(project.createdAt).toISOString().split('T')[0] : '-'
      }
    });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;