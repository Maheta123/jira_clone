// routes/project-manager.routes.js — FULL UPDATED FILE

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

/**
 * ============================
 * GET MY PROJECTS
 * ============================
 */
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const managerObjectId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Find all managed projects
    const projects = await Project.find({
      managerId: managerObjectId,
      companyCode: req.user.companyCode
    })
      .populate('managerId', 'name email')
      .populate('members', 'name role')
      .sort({ updatedAt: -1 })
      .lean();

    // 2. Get stats for ALL projects in one query
    const projectIds = projects.map(p => p._id);

    const taskStats = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds }
        }
      },
      {
        $group: {
          _id: "$projectId",
          total: { $sum: 1 },
          open: {
            $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "inprogress"] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] }
          }
        }
      }
    ]);

    // 3. Make lookup map
    const statsMap = new Map(
      taskStats.map(s => [String(s._id), s])
    );

    // 4. Format response
    const formattedProjects = projects.map(p => {
      const stats = statsMap.get(String(p._id)) || {
        total: 0,
        open: 0,
        completed: 0
      };

      const progress = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;

      return {
        _id: String(p._id),
        name: p.name,
        status: p.status || 'active',
        issues: p.issues || 0,
        progress,
        tasksCount: stats.total,
        openTasks: stats.open + stats.inProgress, // todo + inprogress = still open
        dueSoon: p.dueSoon || false,
        members: p.members?.map(m => String(m._id)) || [],
        membersCount: p.members?.length || 0,
        membersLimit: p.membersLimit || 10, // Added back to match Project model and frontend expectations
        managerName: p.managerId?.name || 'Unassigned',
        managerEmail: p.managerId?.email || null,
        joined: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
        lastUpdated: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '-',
      };
    });

    res.json({
      success: true,
      projects: formattedProjects,
    });

  } catch (err) {
    console.error('GET MY PROJECTS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ============================
 * GET PROJECT MEMBERS (NEW ✅)
 * ============================
 */
router.get('/projects/:projectId/members', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const project = await Project.findById(req.params.projectId)
      .populate('members', 'name email role')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (String(project.managerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view members'
      });
    }

    res.json({
      success: true,
      members: project.members.map(m => ({
        _id: String(m._id),
        name: m.name,
        email: m.email,
        role: m.role
      }))
    });

  } catch (err) {
    console.error('GET MEMBERS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ============================
 * GET AVAILABLE USERS
 * ============================
 */
router.get('/projects/:projectId/available-users', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const project = await Project.findById(req.params.projectId)
      .populate('members', 'role')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (String(project.managerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not the manager of this project'
      });
    }

    const qaCount = project.members.filter(m => m.role === 'QATester').length;

    const users = await User.find({
      companyCode: req.user.companyCode,
      role: { $in: ['Developer', 'QATester'] },
      status: 'active'
    })
      .select('name email role currentProjects')
      .lean();

    const eligibleUsers = users.filter(u => {
      if (project.members.some(m => String(m._id) === String(u._id))) return false;
      if ((u.currentProjects?.length || 0) >= 5) return false;
      if (u.role === 'Developer' && qaCount < 1) return false;
      if (u.role === 'QATester' && qaCount >= 2) return false;
      return true;
    });

    res.json({
      success: true,
      users: eligibleUsers.map(u => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        projectCount: u.currentProjects?.length || 0,
      }))
    });
  } catch (err) {
    console.error('AVAILABLE USERS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ============================
 * ASSIGN USER
 * ============================
 */
router.post('/projects/:projectId/assign-user', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const project = await Project.findById(req.params.projectId);
    const user = await User.findById(userId);

    if (!project || !user) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    if (String(project.managerId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not your project'
      });
    }

    if (project.members.length >= project.membersLimit) {
      return res.status(400).json({
        success: false,
        message: 'Member limit reached'
      });
    }

    if (project.members.some(id => String(id) === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member'
      });
    }

    project.members.push(userId);
    user.currentProjects = user.currentProjects || [];
    user.currentProjects.push(req.params.projectId);

    await Promise.all([project.save(), user.save()]);

    res.json({
      success: true,
      message: `Assigned ${user.name} successfully`
    });
  } catch (err) {
    console.error('ASSIGN USER ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ============================
 * REMOVE MEMBER
 * ============================
 */
router.post('/projects/:projectId/remove-member', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    const project = await Project.findById(req.params.projectId);
    const user = await User.findById(userId);

    if (!project || !user) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (String(project.managerId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    project.members = project.members.filter(id => String(id) !== userId);
    user.currentProjects = user.currentProjects.filter(
      id => String(id) !== String(project._id)
    );

    await Promise.all([project.save(), user.save()]);

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;