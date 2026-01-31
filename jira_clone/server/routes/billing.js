// routes/billing.js
const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');

router.get('/test', (req, res) => {
  res.json({ message: 'Billing routes are working!' });
});

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const yearStart = new Date(currentYear, 0, 1);
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // End of month

    const allInvoices = await Invoice.find({}).sort({ date: -1 }).lean();

    // Recent invoices - newest first
    const recentInvoices = allInvoices.slice(0, 10).map(inv => ({
      id: inv.invoiceId,
      organization: inv.organization,
      plan: inv.plan,
      amount: inv.amount,
      date: inv.date.toISOString().split('T')[0],
      status: inv.status
    }));

    // Total Revenue YTD
    const totalRevenue = allInvoices
      .filter(inv => inv.date >= yearStart && inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // MRR: only paid + monthly + current month
    const mrr = allInvoices
      .filter(inv => 
        inv.date >= monthStart &&
        inv.date <= monthEnd &&
        inv.status === 'paid' &&
        inv.billingCycle === 'monthly'
      )
      .reduce((sum, inv) => sum + inv.amount, 0);

    // New subscriptions this month
    const newSubscriptions = allInvoices.filter(
      inv => inv.date >= monthStart && inv.date <= monthEnd && inv.status === 'paid'
    ).length;

    // Churn rate
    const monthInvoices = allInvoices.filter(inv => inv.date >= monthStart && inv.date <= monthEnd);
    const churnRate = monthInvoices.length > 0
      ? ((monthInvoices.filter(i => i.status !== 'paid').length / monthInvoices.length) * 100).toFixed(1)
      : 0;

    // MRR Trend - last 6 months
    const mrrData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const mStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const mEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const monthName = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

      const monthMRR = allInvoices
        .filter(inv => 
          inv.date >= mStart &&
          inv.date <= mEnd &&
          inv.status === 'paid' &&
          inv.billingCycle === 'monthly'
        )
        .reduce((sum, inv) => sum + inv.amount, 0);

      mrrData.push({ month: monthName, amount: monthMRR });
    }

    res.json({
      totalRevenue,
      mrr,
      newSubscriptions,
      churnRate: parseFloat(churnRate),
      mrrData,
      invoices: recentInvoices
    });
  } catch (err) {
    console.error('Billing dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.post('/invoice', async (req, res) => {
  try {
    const { organizationId, plan, amount, description } = req.body;

    if (!organizationId || !plan || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Optional: Validate organization exists
    const org = await Organization.findOne({ code: organizationId });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const newInvoice = new Invoice({
      organization: org.name,
      plan,
      amount,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      description: description || 'New subscription'
    });

    await newInvoice.save();

    // Optional: Update organization billing info, send email, etc.

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice: newInvoice
    });
  } catch (err) {
    console.error('Generate invoice error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to generate invoice' });
  }
});

// GET /api/billing/invoice/:invoiceId
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId })
      .populate('organizationId', 'name domain')   // optional
      .populate('planId', 'name price')            // optional
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({
      success: true,
      invoice: {
        ...invoice,
        organization: invoice.organizationId?.name || invoice.organization,
        planName: invoice.planId?.name || invoice.plan,
        planPrice: invoice.planId?.price || invoice.amount,
        formattedDate: new Date(invoice.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        formattedEndDate: new Date(invoice.endDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/billing/invoice/:invoiceId/pdf  (simple text-based for now, or use pdfkit later)
router.get('/invoice/:invoiceId/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId }).lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // For MVP: send plain text / HTML that browser can "print to PDF"
    // Later you can use pdfkit or puppeteer for real PDF
    const html = `
      <html>
        <head><title>Invoice ${invoice.invoiceId}</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto;">
          <h1>Invoice ${invoice.invoiceId}</h1>
          <p><strong>Organization:</strong> ${invoice.organization}</p>
          <p><strong>Plan:</strong> ${invoice.plan} (${invoice.billingCycle})</p>
          <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
          <p><strong>Billing Period:</strong> 
            ${new Date(invoice.date).toLocaleDateString()} – 
            ${new Date(invoice.endDate).toLocaleDateString()}
          </p>
          <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
          <hr>
          <p style="text-align:center; margin-top:60px;">
            Thank you for your business!<br>
            Generated on ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceId}.html"`
    );

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating invoice');
  }
});
module.exports = router;