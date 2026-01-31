// routes/tickets.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// === Ticket Schema ===
const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true
    // DO NOT put required: true here when using pre-save generator
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long']
  },
  category: {
    type: String,
    enum: ['bug', 'feature', 'access', 'other', 'billing', 'api', 'ui/ux', 'authentication'],
    default: 'bug'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
  },
  raisedBy: {
    type: String,
    required: [true, 'Raised by (user/email) is required'],
    trim: true
  },
  organization: {
    type: String,
    default: 'Unknown Org',
    trim: true
  },
  user: {
    type: String,
    default: function() { return this.raisedBy; },
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Use async middleware to avoid 'next' issues entirely (no async ops here, so it's safe)
ticketSchema.pre('save', async function () {
  if (!this.ticketId) {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // e.g. 260102
    const randomPart = Math.floor(10000 + Math.random() * 90000);            // 5 digits
    this.ticketId = `TICK-${datePart}-${randomPart}`;
  }
  // No next() needed in async mode
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// POST - Create new ticket
router.post('/', async (req, res) => {
  try {
    console.log('Received ticket payload:', req.body);

    const newTicket = new Ticket(req.body);
    await newTicket.save();

    res.status(201).json({
      success: true,
      message: 'Ticket raised successfully!',
      ticket: {
        id: newTicket.ticketId,
        title: newTicket.title,
        category: newTicket.category,
        priority: newTicket.priority,
        status: newTicket.status,
        raisedBy: newTicket.raisedBy,
        organization: newTicket.organization,
        createdAt: newTicket.createdAt
      }
    });

  } catch (err) {
    console.error('Ticket creation error:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ticket ID collision - please try again in a moment'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: err.message  // For debugging in dev
    });
  }
});

// PUT - Update ticket status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId: req.params.id },
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket: {
        id: ticket.ticketId,
        title: ticket.title,
        organization: ticket.organization,
        user: ticket.user,
        priority: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1),
        status: ticket.status === 'in-progress' 
          ? 'In Progress' 
          : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1),
        category: ticket.category,
        submitted: ticket.createdAt,
        lastUpdate: ticket.updatedAt,
        assignedTo: ticket.assignedTo || null,
        description: ticket.description,
        raisedBy: ticket.raisedBy
      }
    });
  } catch (err) {
    console.error('Ticket update error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating ticket'
    });
  }
});

// GET - All tickets (admin dashboard)
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .lean();

    const formattedTickets = tickets.map(t => ({
      id: t.ticketId,
      title: t.title,
      organization: t.organization,
      user: t.user,
      priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      status: t.status === 'in-progress' 
        ? 'In Progress' 
        : t.status.charAt(0).toUpperCase() + t.status.slice(1),
      category: t.category,
      submitted: t.createdAt,
      lastUpdate: t.updatedAt,
      assignedTo: t.assignedTo || null,
      description: t.description,
      raisedBy: t.raisedBy
    }));

    res.json({
      success: true,
      tickets: formattedTickets,
      stats: {
        total: formattedTickets.length,
        open: formattedTickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length,
        critical: formattedTickets.filter(t => t.priority === 'Critical').length,
        resolvedToday: formattedTickets.filter(t => {
          const today = new Date().toDateString();
          return t.status === 'Resolved' && new Date(t.lastUpdate).toDateString() === today;
        }).length
      }
    });
  } catch (err) {
    console.error('Fetch tickets error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load tickets'
    });
  }
});

module.exports = router;