// routes/project-manager.tasks.routes.js (Final version: includes description, improved error handling, case-insensitive find)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

/**
 * ==================================
 * GET TASKS (KANBAN BOARD)
 * ==================================
 */
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find()
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      tasks: tasks.map(t => ({
        id: t.taskKey,                     
        title: t.title,
        description: t.description || '',  // Added description
        assignee: [
          t.assignees?.developer?.name,
          t.assignees?.qa?.name
        ].filter(Boolean).join(' & '),    
        priority: t.priority,
        projectId: String(t.projectId),
        projectName: t.projectName,
        status: t.status
      }))
    });

  } catch (err) {
    console.error('GET TASKS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ==================================
 * GET PROJECT TASK MEMBERS
 * ==================================
 */
router.get('/projects/:projectId/task-members', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      managerId: req.user.id
    })
      .populate('members', 'name role')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or unauthorized'
      });
    }

    const developers = [];
    const qaTesters = [];

    project.members.forEach(m => {
      if (m.role === 'Developer') {
        developers.push({ _id: m._id, name: m.name });
      }
      if (m.role === 'QATester') {
        qaTesters.push({ _id: m._id, name: m.name });
      }
    });

    res.json({
      success: true,
      developers,
      qaTesters
    });

  } catch (err) {
    console.error('TASK MEMBERS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * ==================================
 * CREATE TASK
 * ==================================
 */
router.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { projectId, title, description, developerId, qaId, priority } = req.body;

    if (!projectId || !title || !developerId || !qaId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      managerId: req.user.id
    }).populate('members', 'name role');

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const dev = project.members.find(m => String(m._id) === developerId);
    const qa = project.members.find(m => String(m._id) === qaId);

    if (!dev || dev.role !== 'Developer') {
      return res.status(400).json({ success: false, message: 'Invalid developer' });
    }

    if (!qa || qa.role !== 'QATester') {
      return res.status(400).json({ success: false, message: 'Invalid QA tester' });
    }

    const count = await Task.countDocuments();
    const taskKey = `TASK-${100 + count + 1}`;

    const task = new Task({
      taskKey,
      title,
      description,
      assignees: {
        developer: { userId: dev._id, name: dev.name },
        qa: { userId: qa._id, name: qa.name }
      },
      priority,
      projectId: project._id,
      projectName: project.name,
      status: 'todo'
    });

    await task.save();

    res.json({
      success: true,
      message: 'Task created successfully'
    });

  } catch (err) {
    console.error('CREATE TASK ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/**
 * UPDATE TASK (title, priority, etc.)
 */
router.put('/tasks/:taskKey', authMiddleware, async (req, res) => {
  try {
    const { taskKey } = req.params;
    const { title, priority, description } = req.body;  // Added description

    console.log('PUT Request for taskKey:', taskKey); // Debug log

    let task = await Task.findOne({ taskKey });

    // Fallback to case-insensitive search
    if (!task) {
      console.log('Exact match not found, trying case-insensitive');
      task = await Task.findOne({
        taskKey: { $regex: new RegExp(`^${taskKey.trim()}$`, 'i') }
      });
    }

    if (!task) {
      console.log('Task not found for key:', taskKey);
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    console.log('Found task:', task.taskKey); // Debug log

    const project = await Project.findById(task.projectId);
    if (!project || String(project.managerId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update allowed fields
    if (title !== undefined) task.title = title;
    if (priority !== undefined) task.priority = priority;
    if (description !== undefined) task.description = description;  // Added

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: {
        id: task.taskKey,
        title: task.title,
        description: task.description,  // Added
        priority: task.priority,
        // ... other fields you return in GET
      }
    });

  } catch (err) {
    console.error('UPDATE TASK ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ==================================
 * UPDATE TASK STATUS
 * ==================================
 */
router.put('/tasks/:taskKey/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['todo', 'inprogress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findOne({ taskKey: req.params.taskKey });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check authorization: user must be manager of the project
    const project = await Project.findById(task.projectId);

    if (!project || String(project.managerId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();

    res.json({
      success: true,
      message: 'Task status updated successfully'
    });

  } catch (err) {
    console.error('UPDATE TASK STATUS ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

module.exports = router;