const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const paymentService = require('../services/paymentService');

// ─── Create subscription ──────────────────────────────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const {
      userId, planId, planName, weeklyPrice, numberOfWeeks, totalAmount,
      deliveryInfo, schedule, selectedFarmers, paymentMethod
    } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const existing = await Subscription.findOne({ userId, status: 'active' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please cancel it before subscribing to a new one.',
        existingSubscription: { subscriptionId: existing.subscriptionId, planName: existing.planName }
      });
    }

    if (!planId || !planName || !weeklyPrice || !numberOfWeeks || !totalAmount)
      return res.status(400).json({ success: false, message: 'Missing required subscription fields' });
    if (!deliveryInfo?.fullName || !deliveryInfo?.email || !deliveryInfo?.phoneNumber)
      return res.status(400).json({ success: false, message: 'Missing required delivery information' });
    if (!schedule?.startDate || !schedule?.timeSlot)
      return res.status(400).json({ success: false, message: 'Missing required schedule information' });
    if (!selectedFarmers || selectedFarmers.length === 0)
      return res.status(400).json({ success: false, message: 'Please select at least one farmer' });

    const commissionData = paymentService.calculateCommission(totalAmount);
    const planType = planId === 'basic' ? 'Basic Box' : 'Family Box';
    const deliveryFrequency = numberOfWeeks === 1 ? 'weekly' : numberOfWeeks === 2 ? 'biweekly' : 'monthly';

    const subscription = new Subscription({
      userId, planId, planName, weeklyPrice, numberOfWeeks, totalAmount,
      deliveryInfo, schedule, selectedFarmers,
      platformCommission: commissionData.platformCommission,
      farmerAmount: commissionData.farmerAmount,
      paymentStatus: 'pending', status: 'pending',
      autoRenew: true, deliveryFrequency, planType,
      startDate: schedule.startDate
    });

    await subscription.save();
    res.json({ success: true, message: 'Subscription created successfully', data: subscription });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription', error: error.message });
  }
});

// ─── Get user subscriptions (by query param) ─────────────────────────────────
router.get('/user', async (req, res) => {
  try {
    const { userId, status } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const query = { userId };
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('selectedFarmers', 'farmName location profilePicture')
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get user subscriptions (by URL param) ───────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    const query = { userId };
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('selectedFarmers', 'farmName location profilePicture')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get farmer subscriptions ─────────────────────────────────────────────────
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { status } = req.query;
    const query = { selectedFarmers: farmerId };
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('selectedFarmers', 'farmName location profilePicture')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get daily selections ─────────────────────────────────────────────────────
// MUST come before /:subscriptionId
router.get('/:subscriptionId/daily-selections', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.subscriptionId)
      .populate('dailySelections.products.productId', 'productName image unit pricePerUnit');
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, dailySelections: subscription.dailySelections || [] });
  } catch (error) {
    console.error('Error getting daily selections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Save daily selections ────────────────────────────────────────────────────
// MUST come before /:subscriptionId
router.patch('/:subscriptionId/daily-selections', async (req, res) => {
  try {
    const { dailySelections } = req.body;
    console.log('Saving daily selections for:', req.params.subscriptionId, '| count:', dailySelections?.length);

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.subscriptionId,
      { $set: { dailySelections } },
      { new: true, runValidators: false }
    );
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, message: 'Daily selections saved successfully', dailySelections: subscription.dailySelections });
  } catch (error) {
    console.error('Error saving daily selections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Update subscription status ───────────────────────────────────────────────
router.patch('/:subscriptionId/status', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'active', 'paused', 'cancelled', 'completed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const subscription = await Subscription.findByIdAndUpdate(subscriptionId, { status }, { new: true })
      .populate('selectedFarmers', 'farmName firstName lastName email')
      .populate('userId', 'firstName lastName email');

    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    // When subscription is completed, send invoice to customer
    if (status === 'completed') {
      try {
        const { sendSubscriptionInvoice } = require('../utils/sendEmail');
        const Farmer = require('../models/Farmer');

        // Calculate totals from daily selections
        let subtotal = 0;
        (subscription.dailySelections || []).forEach(day => {
          (day.products || []).forEach(p => {
            subtotal += (p.quantity || 1) * (p.pricePerUnit || 0);
          });
        });

        // Discount: basic = 5%, family = 10%
        const discountPercentage = subscription.planId === 'family' ? 10 : 5;
        const discountAmount = (subtotal * discountPercentage) / 100;
        const totalDue = subtotal - discountAmount;

        // Get farmer info
        const farmer = subscription.selectedFarmers?.[0];
        const farmerName = farmer?.farmName || farmer?.firstName || 'Your Farmer';

        // Calculate end date
        const startDate = subscription.startDate || subscription.schedule?.startDate;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (subscription.numberOfWeeks || 1) * 7);

        const customerEmail = subscription.deliveryInfo?.email || subscription.userId?.email;
        const customerName = subscription.deliveryInfo?.fullName || `${subscription.userId?.firstName} ${subscription.userId?.lastName}`;

        if (customerEmail) {
          await sendSubscriptionInvoice(customerEmail, {
            subscriptionId: subscription.subscriptionId,
            customerName,
            planName: subscription.planName,
            planType: subscription.planType,
            startDate,
            endDate,
            deliveryFrequency: subscription.deliveryFrequency,
            dailySelections: subscription.dailySelections || [],
            discountPercentage,
            subtotal,
            discountAmount,
            totalDue,
            farmerName,
          });
          console.log(`✅ Invoice sent to ${customerEmail} for subscription ${subscription.subscriptionId}`);
        }
      } catch (emailErr) {
        console.error('Error sending invoice email:', emailErr.message);
        // Don't fail the status update if email fails
      }
    }

    res.json({ success: true, message: 'Subscription status updated', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Toggle auto-renew ────────────────────────────────────────────────────────
router.patch('/:subscriptionId/auto-renew', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { autoRenew } = req.body;
    if (typeof autoRenew !== 'boolean')
      return res.status(400).json({ success: false, message: 'autoRenew must be a boolean' });

    const subscription = await Subscription.findByIdAndUpdate(subscriptionId, { autoRenew }, { new: true });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, message: 'Auto-renew updated', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Manual activation ────────────────────────────────────────────────────────
router.post('/:subscriptionId/activate', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.subscriptionId);
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    subscription.status = 'active';
    subscription.paymentStatus = 'paid';
    await subscription.save();
    res.json({ success: true, message: 'Subscription activated', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Delete subscription ──────────────────────────────────────────────────────
router.delete('/:subscriptionId', async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.subscriptionId);
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get subscription by ID ───────────────────────────────────────────────────
// MUST be last - catches all /:subscriptionId patterns
router.get('/:subscriptionId', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.subscriptionId)
      .populate('selectedFarmers', 'farmName location profilePicture')
      .populate('userId', 'firstName lastName email');
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
