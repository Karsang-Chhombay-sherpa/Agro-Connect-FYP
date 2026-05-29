const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const BulkOrder = require('../models/BulkOrder');

/**
 * Create a new bulk order
 */
router.post('/create', async (req, res) => {
  try {
    const {
      userId,
      farmerId,
      items,
      deliveryInfo,
      schedule,
      pricing,
      status,
      paymentStatus
    } = req.body;

    console.log('=== Creating bulk order ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!userId) {
      console.error('Validation failed: User ID is required');
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!farmerId) {
      console.error('Validation failed: Farmer ID is required');
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Validation failed: Items are required and must be an array');
      return res.status(400).json({
        success: false,
        message: 'Items are required and must be an array'
      });
    }

    if (!deliveryInfo) {
      console.error('Validation failed: Delivery information is required');
      return res.status(400).json({
        success: false,
        message: 'Delivery information is required'
      });
    }

    if (!schedule) {
      console.error('Validation failed: Schedule information is required');
      return res.status(400).json({
        success: false,
        message: 'Schedule information is required'
      });
    }

    if (!pricing) {
      console.error('Validation failed: Pricing information is required');
      return res.status(400).json({
        success: false,
        message: 'Pricing information is required'
      });
    }

    // Create bulk order
    const bulkOrder = new BulkOrder({
      userId,
      farmerId,
      items,
      deliveryInfo,
      schedule: {
        startDate: schedule.startDate ? new Date(schedule.startDate) : new Date(),
        timeSlot: schedule.timeSlot || 'morning'
      },
      pricing,
      status: status || 'pending',
      paymentStatus: paymentStatus || 'pending',
      orderId: `BO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

    console.log('Saving bulk order...');
    await bulkOrder.save();

    console.log('✅ Bulk order created successfully:', bulkOrder._id);

    res.json({
      success: true,
      message: 'Bulk order created successfully',
      data: bulkOrder
    });

  } catch (error) {
    console.error('❌ Error creating bulk order:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create bulk order',
      error: error.message
    });
  }
});

/**
 * Get bulk order by ID
 */
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const bulkOrder = await BulkOrder.findById(orderId)
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('farmerId', 'farmName location');

    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found'
      });
    }

    res.json({
      success: true,
      data: bulkOrder
    });

  } catch (error) {
    console.error('Error fetching bulk order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk order',
      error: error.message
    });
  }
});

/**
 * Get user's bulk orders
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const bulkOrders = await BulkOrder.find(query)
      .populate('farmerId', 'farmName location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bulkOrders
    });

  } catch (error) {
    console.error('Error fetching user bulk orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk orders',
      error: error.message
    });
  }
});

/**
 * Get farmer's bulk orders
 */
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { status } = req.query;

    const query = { farmerId };
    if (status) query.status = status;

    const bulkOrders = await BulkOrder.find(query)
      .populate('userId', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bulkOrders
    });

  } catch (error) {
    console.error('Error fetching farmer bulk orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk orders',
      error: error.message
    });
  }
});

/**
 * Update bulk order status
 */
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const bulkOrder = await BulkOrder.findById(orderId);

    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found'
      });
    }

    if (status) bulkOrder.status = status;
    if (paymentStatus) bulkOrder.paymentStatus = paymentStatus;
    bulkOrder.updatedAt = Date.now();

    await bulkOrder.save();

    res.json({
      success: true,
      message: 'Bulk order updated successfully',
      data: bulkOrder
    });

  } catch (error) {
    console.error('Error updating bulk order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bulk order',
      error: error.message
    });
  }
});

module.exports = router;
