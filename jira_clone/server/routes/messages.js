const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Schema (unchanged)
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  subject: { type: String, trim: true },
  message: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['contact', 'feedback'],
    default: 'contact'
  },
  rating: { 
    type: Number, 
    min: 0,
    max: 5,
    default: 0
  },
  category: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// GET /api/messages - Fetch all messages (Admin only)
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({})
      .select('-__v -category') // Hide unnecessary fields
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', async (req, res) => {
  try {
    console.log(`DELETE request received for message ID: ${req.params.id}`);

    const deleted = await Message.findByIdAndDelete(req.params.id);

    if (!deleted) {
      console.log('Message not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    console.log('Message deleted successfully:', deleted._id);
    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});


// POST /api/messages - Save message
router.post('/', async (req, res) => {
  try {
    console.log('Received payload:', req.body);

    const newMessage = new Message(req.body);
    await newMessage.validate();
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Thank you! Your submission has been received.',
      data: newMessage
    });
  } catch (err) {
    console.error('Message save error:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

module.exports = router;