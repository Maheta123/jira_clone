const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskKey: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  steps: String,
  priority: { type: String, default: 'Medium' },
  status: { type: String, default: 'todo' },
  browser: String,
  os: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true },
  assignees: {
    developer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String
    },
    qa: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String
    }
  },
  reportedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String
  },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);