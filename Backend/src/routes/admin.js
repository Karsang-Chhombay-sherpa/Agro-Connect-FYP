const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const BulkOrder = require('../models/BulkOrder');
const Payment = require('../models/Payment');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// ── Stats overview ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, farmers, products, orders, subscriptions, bulkOrders, payments] = await Promise.all([
      User.countDocuments(),
      Farmer.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Subscription.countDocuments(),
      BulkOrder.countDocuments(),
      Payment.find({ status: 'completed' }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const platformRevenue = payments.reduce((sum, p) => sum + (p.platformCommission || 0), 0);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Revenue last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPayments = await Payment.find({
      status: 'completed',
      createdAt: { $gte: sevenDaysAgo }
    });
    const recentRevenue = recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        users, farmers, products, orders,
        subscriptions, bulkOrders,
        totalRevenue, platformRevenue, recentRevenue,
        ordersByStatus: ordersByStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {})
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Users ────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ _id: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Farmers ──────────────────────────────────────────────────────
router.get('/farmers', async (req, res) => {
  try {
    const farmers = await Farmer.find({}, '-password').sort({ _id: -1 });
    res.json({ success: true, farmers });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.patch('/farmers/:id/verify', async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { verified: req.body.verified },
      { new: true, select: '-password' }
    );
    res.json({ success: true, farmer });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/farmers/:id', async (req, res) => {
  try {
    await Farmer.findByIdAndDelete(req.params.id);
    await Product.deleteMany({ farmerId: req.params.id });
    res.json({ success: true, message: 'Farmer and their products deleted.' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Products ─────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('farmerId', 'farmName firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Orders ───────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('customerId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Subscriptions ────────────────────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Payments ─────────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── Admin setup ──────────────────────────────────────────────────
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name, setupKey } = req.body;
    if (setupKey !== (process.env.ADMIN_SETUP_KEY || 'agroconnect-admin-setup')) {
      return res.status(403).json({ message: 'Invalid setup key.' });
    }
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin already exists.' });
    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashed, name: name || 'Admin' });
    res.json({ success: true, message: 'Admin created.', adminId: admin._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
