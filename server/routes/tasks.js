const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * GET ALL PROJECTS
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().lean();
    const formatted = projects.map(project => ({
      id: project._id.toString(),
      name: project.name
    }));
    res.json(formatted);
  } catch (err) {
    console.error('[GET /api/tasks/projects]', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

/**
 * GET DEVELOPERS FOR A PROJECT
 */
router.get('/developers/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const objectId = new ObjectId(projectId);  // Ensure valid ObjectId
    const developers = await User.find({
      role: 'Developer',
      currentProjects: { $in: [objectId] }
    }).lean();

    const formatted = developers.map(dev => ({
      userId: dev._id.toString(),
      name: dev.name
    }));

    res.json(formatted);
  } catch (err) {
    console.error(`[GET /api/tasks/developers/${req.params.projectId}]`, err);
    res.status(500).json({ message: 'Failed to fetch developers' });
  }
});

/**
 * GET ALL TASKS
 */
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();

    const formatted = tasks.map(task => ({
      _id: task._id.toString(),
      id: task.taskKey,
      title: task.title,
      project: task.projectName,
      status: task.status,
      priority: task.priority,
      assignee: formatAssignees(task.assignees),
      developerName: task.assignees?.developer?.name || '',
      qaName: task.assignees?.qa?.name || '',
      reported: task.createdAt.toISOString().split('T')[0],
      resolved: task.resolvedAt
        ? task.resolvedAt.toISOString().split('T')[0]
        : '',
      description: task.description || '',
      steps: task.steps || '',
      reportedBy: {
        userId: task.reportedBy?.userId?.toString(),
        name: task.reportedBy?.name || ''
      },
      projectId: task.projectId.toString(),
      assignees: task.assignees  // Include full assignees for frontend filtering
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[GET /api/tasks]', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

/**
 * CREATE TASK
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, steps, priority, status, browser, os, projectId, projectName, assignees, reportedBy } = req.body;

    if (!title || !projectId || !projectName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert projectId to ObjectId
    const objectProjectId = new ObjectId(projectId);

    const lastTask = await Task.findOne({ projectId: objectProjectId }, {}, { sort: { createdAt: -1 } });

    let num = 1;
    if (lastTask && lastTask.taskKey) {
      const match = lastTask.taskKey.match(/(\d+)$/);
      if (match) num = parseInt(match[1]) + 1;
    }

    const prefix = projectName.split(' ').map(w => w[0]).join('').toUpperCase();
    const taskKey = `${prefix}-${num}`;

    const existing = await Task.findOne({ taskKey });
    if (existing) {
      return res.status(409).json({ message: 'Task key conflict' });
    }

    // Fix: Convert assignees userId to ObjectId if they are strings
    const processedAssignees = processAssignees(assignees);

    // Convert reportedBy userId to ObjectId
    const processedReportedBy = reportedBy ? {
      ...reportedBy,
      userId: reportedBy.userId ? new ObjectId(reportedBy.userId) : undefined
    } : undefined;

    const task = new Task({
      taskKey,
      title,
      description,
      steps,
      assignees: processedAssignees,
      priority: priority || 'Medium',
      projectId: objectProjectId,
      projectName,
      status: status || 'todo',
      reportedBy: processedReportedBy,
      browser: browser || '',
      os: os || ''
    });

    await task.save();

    res.status(201).json({
      message: 'Task created',
      task: {
        _id: task._id.toString(),
        id: task.taskKey,
        title: task.title,
        project: task.projectName,
        status: task.status,
        priority: task.priority,
        assignee: formatAssignees(task.assignees),
        developerName: task.assignees?.developer?.name || '',
        qaName: task.assignees?.qa?.name || '',
        reported: task.createdAt.toISOString().split('T')[0],
        resolved: '',
        description: task.description,
        steps: task.steps,
        reportedBy: {
          userId: task.reportedBy?.userId?.toString(),
          name: task.reportedBy?.name || ''
        },
        projectId: task.projectId.toString(),
        assignees: task.assignees
      }
    });
  } catch (err) {
    console.error('[POST /api/tasks]', err);
    res.status(500).json({ message: 'Create failed' });
  }
});

/**
 * UPDATE TASK
 */
router.put('/:taskKey', async (req, res) => {
  try {
    const { taskKey } = req.params;
    const { title, description, steps, status, priority, assignees, projectId, projectName, browser, os } = req.body;

    const task = await Task.findOne({ taskKey });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (steps !== undefined) task.steps = steps;
    if (projectId) task.projectId = new ObjectId(projectId);
    if (projectName) task.projectName = projectName;
    if (priority) task.priority = priority;
    if (browser !== undefined) task.browser = browser;
    if (os !== undefined) task.os = os;

    if (status) {
      task.status = status;
      task.resolvedAt = status === 'done' ? new Date() : undefined;
    }

    // Fix: Process assignees to convert userId to ObjectId
    if (assignees) {
      const processedAssignees = processAssignees(assignees);
      task.assignees = { ...task.assignees, ...processedAssignees };
    }

    await task.save();

    res.json({
      message: 'Task updated',
      task: {
        _id: task._id.toString(),
        id: task.taskKey,
        title: task.title,
        project: task.projectName,
        status: task.status,
        priority: task.priority,
        assignee: formatAssignees(task.assignees),
        developerName: task.assignees?.developer?.name || '',
        qaName: task.assignees?.qa?.name || '',
        reported: task.createdAt.toISOString().split('T')[0],
        resolved: task.resolvedAt
          ? task.resolvedAt.toISOString().split('T')[0]
          : '',
        description: task.description || '',
        steps: task.steps || '',
        reportedBy: {
          userId: task.reportedBy?.userId?.toString(),
          name: task.reportedBy?.name || ''
        },
        projectId: task.projectId.toString(),
        assignees: task.assignees
      }
    });
  } catch (err) {
    console.error('[PUT /api/tasks]', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

/**
 * DELETE TASK
 */
router.delete('/:taskKey', async (req, res) => {
  try {
    const { taskKey } = req.params;
    const task = await Task.findOneAndDelete({ taskKey });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('[DELETE /api/tasks]', err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

// Helper function to process assignees (convert userId strings to ObjectId)
function processAssignees(assignees) {
  if (!assignees) return assignees;

  const processed = { ...assignees };

  if (assignees.developer) {
    processed.developer = {
      ...assignees.developer,
      userId: assignees.developer.userId ? new ObjectId(assignees.developer.userId) : undefined
    };
  }

  if (assignees.qa) {
    processed.qa = {
      ...assignees.qa,
      userId: assignees.qa.userId ? new ObjectId(assignees.qa.userId) : undefined
    };
  }

  return processed;
}

function formatAssignees(assignees) {
  if (!assignees) return 'Unassigned';

  const parts = [];
  if (assignees.developer?.name) parts.push(assignees.developer.name);
  if (assignees.qa?.name) parts.push(`QA: ${assignees.qa.name}`);

  return parts.length ? parts.join(', ') : 'Unassigned';
}

/**
 * GET "test cases" — returns Tasks that look like test cases
 * (we filter by title starting with "TEST:" or you can add a field later)
 */
router.get('/test-cases', async (req, res) => {
  try {
    // Find tasks that seem to be test cases (title starts with "TEST:")
    const testTasks = await Task.find({ title: { $regex: /^TEST:/i } }).lean();

    const formatted = testTasks.map(task => ({
      _id: task._id.toString(),
      id: task.taskKey || `TC-${task._id.toString().slice(-6)}`,
      title: task.title.replace(/^TEST:\s*/i, ''), // remove "TEST:" prefix for display
      priority: task.priority || 'Medium',
      status: mapTaskStatusToTestStatus(task.status), // convert todo → Not Run, etc.
      steps: task.steps ? task.steps.split('\n').filter(s => s.trim()) : [],
      expectedResult: task.description || '', // misuse description as expected result
      notes: '', // no real field → empty
      executedBy: task.assignees?.qa?.name || '', // misuse qa assignee as executedBy
      executedOn: task.resolvedAt ? task.resolvedAt.toISOString() : undefined,
      assignedTo: task.assignees?.qa?.userId?.toString() || ''
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[GET /api/tasks/test-cases]', err);
    res.status(500).json({ message: 'Failed to fetch test cases' });
  }
});

/**
 * POST execute test case — update a Task as if it were a test case
 */
router.post('/test-cases/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, executedBy, executedOn } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Test case (task) not found' });
    }

    // Only allow update if it looks like a test case
    if (!task.title.startsWith('TEST:')) {
      return res.status(400).json({ message: 'This task is not marked as a test case' });
    }

    // Map test status back to task status
    task.status = mapTestStatusToTaskStatus(status);

    // Store notes in description (append)
    if (notes) {
      task.description = (task.description || '') + `\n\nTest Notes (${new Date().toISOString()}): ${notes}`;
    }

    // Misuse qa assignee for executedBy
    if (executedBy) {
      task.assignees = task.assignees || {};
      task.assignees.qa = task.assignees.qa || {};
      task.assignees.qa.name = executedBy;
    }

    if (executedOn) {
      task.resolvedAt = new Date(executedOn);
    }

    await task.save();

    res.json({
      message: 'Test case updated',
      testCase: {
        _id: task._id.toString(),
        id: task.taskKey,
        status: status, // return test-style status
        notes,
        executedBy,
        executedOn
      }
    });
  } catch (err) {
    console.error('[POST /api/tasks/test-cases/:id/execute]', err);
    res.status(500).json({ message: 'Failed to update test case' });
  }
});

// Helper to map task status → test status
function mapTaskStatusToTestStatus(taskStatus) {
  switch (taskStatus) {
    case 'todo':     return 'Not Run';
    case 'inprogress': return 'Not Run'; // or custom
    case 'done':     return 'Pass';      // simplistic mapping
    default:         return 'Not Run';
  }
}

// Helper to map test status → task status
function mapTestStatusToTaskStatus(testStatus) {
  switch (testStatus) {
    case 'Not Run':  return 'todo';
    case 'Pass':     return 'done';
    case 'Fail':     return 'todo'; // or add 'failed' if you extend schema later
    case 'Blocked':  return 'todo';
    default:         return 'todo';
  }
}

router.put('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { title, description, steps, status, priority, assignees, projectId, projectName, browser, os } = req.body;
    
    
    let task;

    // Try by _id first (MongoDB ObjectId)
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      task = await Task.findById(identifier);
    }

    // Fallback to taskKey
    if (!task) {
      task = await Task.findOne({ taskKey: identifier });
    }

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (steps !== undefined) task.steps = steps;
    if (projectId) task.projectId = new ObjectId(projectId);
    if (projectName) task.projectName = projectName;
    if (priority) task.priority = priority;
    if (browser !== undefined) task.browser = browser;
    if (os !== undefined) task.os = os;

    if (status) {
      task.status = status;
      task.resolvedAt = status === 'done' ? new Date() : undefined;
    }

    if (assignees) {
      const processedAssignees = processAssignees(assignees);
      task.assignees = { ...task.assignees, ...processedAssignees };
    }

    await task.save();

    res.json({
      message: 'Task updated',
      task: {
        _id: task._id.toString(),
        id: task.taskKey,
        title: task.title,
        project: task.projectName,
        status: task.status,
        priority: task.priority,
        assignee: formatAssignees(task.assignees),
        developerName: task.assignees?.developer?.name || '',
        qaName: task.assignees?.qa?.name || '',
        reported: task.createdAt.toISOString().split('T')[0],
        resolved: task.resolvedAt ? task.resolvedAt.toISOString().split('T')[0] : '',
        description: task.description || '',
        steps: task.steps || '',
        reportedBy: {
          userId: task.reportedBy?.userId?.toString(),
          name: task.reportedBy?.name || ''
        },
        projectId: task.projectId.toString(),
        assignees: task.assignees
      }
    });
  } catch (err) {
    console.error('[PUT /api/tasks/:identifier]', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// NEW: Dedicated endpoint for developers to update task status (safe, no conflict)
router.put('/dev/update/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { status, resolvedAt } = req.body;  // only allow status & resolvedAt for safety

    let task;

    // Try by _id first
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      task = await Task.findById(identifier);
    }

    // Fallback to taskKey
    if (!task) {
      task = await Task.findOne({ taskKey: identifier });
    }

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only allow updating status and resolvedAt (restrict other fields for this endpoint)
    if (status) {
      task.status = status;
      task.resolvedAt = (status === 'done' && resolvedAt) 
        ? new Date(resolvedAt) 
        : (status === 'done' ? new Date() : undefined);
    }

    await task.save();

    res.json({
      message: 'Task status updated by developer',
      task: {
        _id: task._id.toString(),
        taskKey: task.taskKey,
        status: task.status,
        resolvedAt: task.resolvedAt ? task.resolvedAt.toISOString() : null
      }
    });
  } catch (err) {
    console.error('[PUT /api/tasks/dev/update/:identifier]', err);
    res.status(500).json({ message: 'Update failed' });
  }
});


module.exports = router;