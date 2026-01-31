// routes/plans.js
const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const Organization = require('../models/Organization');

// GET ALL PLANS
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 }).lean();

    const formattedPlans = [];
    for (let plan of plans) {
      const orgCount = await Organization.countDocuments({ plan: plan.name });
      formattedPlans.push({
        id: plan._id.toString(),
        name: plan.name,
        priceMonthly: plan.priceMonthly || 0,
        priceYearly: plan.priceYearly || 0,
        features: plan.features || [],
        isActive: plan.isActive !== false,
        organizationsCount: orgCount
      });
    }

    res.json({ success: true, plans: formattedPlans });
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
});

// POST - Create new plan
router.post('/', async (req, res) => {
  try {
    const { name, priceMonthly, priceYearly, features, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name required' });
    }
    if (priceMonthly === undefined || priceYearly === undefined) {
      return res.status(400).json({ success: false, message: 'Both prices are required' });
    }

    const existing = await Plan.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Plan name already exists' });
    }

    const newPlan = new Plan({
      name: name.trim(),
      priceMonthly: Number(priceMonthly),
      priceYearly: Number(priceYearly),
      features: features || [],
      isActive: isActive !== false
    });

    const saved = await newPlan.save();

    res.status(201).json({
      success: true,
      plan: {
        id: saved._id.toString(),
        name: saved.name,
        priceMonthly: saved.priceMonthly,
        priceYearly: saved.priceYearly,
        features: saved.features,
        isActive: saved.isActive,
        organizationsCount: 0
      }
    });
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ success: false, message: 'Failed to create plan' });
  }
});

// PATCH - Update plan
router.patch('/:id', async (req, res) => {
  try {
    const { name, priceMonthly, priceYearly, features, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (priceMonthly !== undefined) updateData.priceMonthly = Number(priceMonthly);
    if (priceYearly !== undefined) updateData.priceYearly = Number(priceYearly);
    if (features !== undefined) updateData.features = features;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const orgCount = await Organization.countDocuments({ plan: plan.name });

    res.json({
      success: true,
      plan: {
        id: plan._id.toString(),
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        isActive: plan.isActive,
        organizationsCount: orgCount
      }
    });
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
});

module.exports = router;