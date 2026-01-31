const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

/* =========================
   Test Route
========================= */
app.get('/api', (req, res) => {
  res.json({
    message: 'Backend connected successfully!',
    time: new Date().toISOString()
  });
});


/* =========================
   Routes
========================= */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/project-manager', require('./routes/project-manager.routes'));
app.use('/api/project-manager', require('./routes/project-manager.tasks.routes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users', require('./routes/users'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/issue-types', require('./routes/issueTypes'));


app.use('/api/tasks', require('./routes/tasks'));

/* Master Router */
app.use('/api/master', require('./routes/master.routes'));

/* =========================
   404 Handler
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});



/* 
=========================
   Global Error Handler
========================= */
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
});



/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jira';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });