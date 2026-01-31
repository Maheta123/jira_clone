// routes/master.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Ticket = require('../models/Task');  // assuming your Task model is used for tickets

// Helper: relative time formatter
function relativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 1) return `${days} days ago`;
  if (days === 1) return 'Yesterday';
  if (hours > 1) return `${hours} hours ago`;
  if (hours === 1) return '1 hour ago';
  if (minutes > 1) return `${minutes} minutes ago`;
  return 'Just now';
}

// ────────────────────────────────────────────────
//   GET /api/master/dashboard
//   → Returns stats + recent platform-wide activity
// ────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // ── Core stats ────────────────────────────────────────
    const stats = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Project.countDocuments(),
      Project.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      Organization.countDocuments({ createdAt: { $gte: thisMonthStart } }), // orgsThisMonth
      User.countDocuments({ createdAt: { $gte: thisMonthStart } }),         // usersThisMonth
      Project.countDocuments({ createdAt: { $gte: todayStart } })           // projectsToday
    ]);

    const [
      totalOrgs, activeOrgs, totalUsers, activeUsers,
      totalProjects, projectsThisMonth, orgsThisMonth,
      usersThisMonth, projectsTodayCount
    ] = stats;

    // Real percentage changes
    const orgsChange = totalOrgs - orgsThisMonth > 0
      ? `+${Math.round((orgsThisMonth / (totalOrgs - orgsThisMonth)) * 100)}% this month`
      : (orgsThisMonth > 0 ? '+100% this month' : '0% this month');

    const usersChange = totalUsers - usersThisMonth > 0
      ? `+${Math.round((usersThisMonth / (totalUsers - usersThisMonth)) * 100)}% this month`
      : (usersThisMonth > 0 ? '+100% this month' : '0% this month');

    const projectsNewToday = projectsTodayCount.toString();

    const systemHealth = {
      status: 'Excellent',
      uptime: '99.9%'
    };

    // ── Recent platform activity (like admin dashboard style) ──
    const [recentOrgs, recentUsers, recentProjects, recentTickets] = await Promise.all([
      Organization.find().sort({ createdAt: -1 }).limit(6).select('name createdAt'),
      User.find().sort({ createdAt: -1 }).limit(6).select('email companyCode createdAt'),
      Project.find().sort({ createdAt: -1 }).limit(6).select('name companyCode createdAt'),
      Ticket.find().sort({ createdAt: -1 }).limit(6).select('title name raisedBy createdAt') // adjust fields based on your Task model
    ]);

    let events = [];

    // Organization events
    recentOrgs.forEach(org => {
      events.push({
        createdAt: org.createdAt,
        message: `New organization <strong>"${org.name}"</strong> registered`,
        icon: 'apartment'
      });
    });

    // User events
    recentUsers.forEach(user => {
      events.push({
        createdAt: user.createdAt,
        message: `New user <strong>${user.email}</strong> joined (${user.companyCode})`,
        icon: 'person_add'
      });
    });

    // Project events
    recentProjects.forEach(project => {
      events.push({
        createdAt: project.createdAt,
        message: `New project <strong>"${project.name}"</strong> created in ${project.companyCode}`,
        icon: 'folder_special'
      });
    });

    // Ticket/Task events
    recentTickets.forEach(ticket => {
      const title = ticket.title || ticket.name || 'Untitled';
      const by = ticket.raisedBy || 'system';
      events.push({
        createdAt: ticket.createdAt,
        message: `New ticket <strong>"${title}"</strong> raised by ${by}`,
        icon: 'report_problem'
      });
    });

    // Sort by time (newest first) and take top 8
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentActivities = events.slice(0, 8).map(event => ({
      icon: event.icon,
      time: relativeTime(event.createdAt),
      message: event.message
    }));

    // ── Final response ─────────────────────────────────────
    res.json({
      success: true,
      data: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalUsers,
        activeUsers,
        totalProjects,
        projectsThisMonth,
        systemHealth,

        display: {
          organizations: { total: totalOrgs, change: orgsChange },
          users: { active: activeUsers, change: usersChange },
          projects: { total: totalProjects, newToday: projectsNewToday },
          health: systemHealth
        },

        recentActivities   // ← now real DB data
      }
    });

  } catch (error) {
    console.error('Master dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard statistics',
      error: error.message
    });
  }
});

module.exports = router;