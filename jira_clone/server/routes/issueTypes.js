// server/routes/issueTypes.js
const express = require('express');
const router = express.Router();
const IssueType = require('../models/IssueType');

// GET issue types (global + organization's)
router.get('/', async (req, res) => {
  try {
    const { companyCode } = req.query;
    const query = companyCode 
      ? { $or: [{ organizationCode: companyCode }, { isGlobal: true }] }
      : { isGlobal: true };  // fallback for master

    const issueTypes = await IssueType.find(query).sort({ name: 1 });
    res.json({ success: true, issueTypes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST - Create (Master Admin can create global, Org Admin creates local)
router.post('/', async (req, res) => {
  try {
    const issueType = new IssueType(req.body);
    await issueType.save();
    res.status(201).json({ success: true, issueType });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH - Update
router.patch('/:id', async (req, res) => {
  try {
    const issueType = await IssueType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!issueType) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, issueType });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const issueType = await IssueType.findByIdAndDelete(req.params.id);
    if (!issueType) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;