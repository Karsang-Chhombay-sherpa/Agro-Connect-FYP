const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Farmer = require('../models/Farmer');

// Helper function to restore stock when order is cancelled
async function restoreOrderStock(order) {
  try {
    console.log('Restoring stock for cancelled order:', order.orderId);
    
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const newQuantity = product.quantity + item.quantity;
        await Product.findByIdAndUpdate(product._id, {
          quantity: newQuantity,
          isAvailable: true, // Make available again since we have stock
          updatedAt: new Date()
        });

        console.log('Stock restored:', {
          productName: product.productName,
          previousQuantity: product.quantity,
          restoredQuantity: item.quantity,
          newQuantity: newQuantity
        });
      }
    }
  } catch (error) {
    console.error('Error restoring stock:', error);
  }
}

// Debug endpoint for farmer orders
router.get('/debug/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    console.log(`[DEBUG] Checking orders for farmer: ${farmerId}`);
    
    // Check total orders in system
    const totalOrders = await Order.countDocuments();
    console.log(`[DEBUG] Total orders in system: ${totalOrders}`);
    
    // Check orders with this farmer's items (string comparison)
    const ordersWithFarmerString = await Order.find({ 'items.farmerId': farmerId });
    console.log(`[DEBUG] Orders with farmer (string): ${ordersWithFarmerString.length}`);
    
    // Check orders with this farmer's items (ObjectId comparison)
    const ordersWithFarmerObjectId = await Order.find({ 'items.farmerId': new mongoose.Types.ObjectId(farmerId) });
    console.log(`[DEBUG] Orders with farmer (ObjectId): ${ordersWithFarmerObjectId.length}`);
    
    // Get sample order to check structure
    const sampleOrder = await Order.findOne().populate('items.farmerId');
    console.log(`[DEBUG] Sample order structure:`, {
      orderId: sampleOrder?.orderId,
      itemsCount: sampleOrder?.items?.length,
      firstItemFarmerId: sampleOrder?.items?.[0]?.farmerId,
      firstItemFarmerIdType: typeof sampleOrder?.items?.[0]?.farmerId
    });
    
    res.json({
      farmerId,
      totalOrders,
      ordersWithFarmerString: ordersWithFarmerString.length,
      ordersWithFarmerObjectId: ordersWithFarmerObjectId.length,
      sampleOrder: sampleOrder ? {
        orderId: sampleOrder.orderId,
        itemsCount: sampleOrder.items.length,
        firstItemFarmerId: sampleOrder.items[0]?.farmerId
      } : null
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to verify orders route is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Orders route is working', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/orders/create',
      'GET /api/orders/farmer/:farmerId',
      'PATCH /api/orders/:orderId/status',
      'GET /api/orders/all'
    ]
  });
});

// Create new order
router.post('/create', async (req, res) => {
  try {
    console.log('Order creation request received:', {
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const {
      customerId,
      items,
      paymentMethod,
      deliveryTime,
      deliveryAddress,
      primaryMobile,
      secondaryMobile,
      subscriptionDiscount
    } = req.body;

    // Validate required fields
    if (!customerId || !items || !paymentMethod || !deliveryTime || !deliveryAddress || !primaryMobile) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerId, items, paymentMethod, deliveryTime, deliveryAddress, primaryMobile'
      });
    }

    // Validate customer
    console.log('Looking for customer with ID:', customerId);
    const customer = await User.findById(customerId);
    if (!customer) {
      console.log('Customer not found');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    console.log('Customer found:', customer.email);

    // Validate and process items with stock management
    let subtotal = 0;
    const processedItems = [];
    const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE) || 0.05; // 5% default

    // First pass: Validate stock availability
    for (const item of items) {
      console.log('Checking stock for item:', item.productId, item.productName, 'Qty:', item.quantity);
      const product = await Product.findById(item.productId).populate('farmerId');
      if (!product) {
        console.log('Product not found:', item.productId);
        return res.status(404).json({
          success: false,
          message: `Product ${item.productName} not found`
        });
      }

      // Check stock availability
      if (product.quantity < item.quantity) {
        console.log('Insufficient stock:', {
          productName: product.productName,
          available: product.quantity,
          requested: item.quantity
        });
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}. Available: ${product.quantity} ${product.unit}, Requested: ${item.quantity} ${product.unit}`
        });
      }

      // Check if product is available
      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.productName} is currently unavailable`
        });
      }
    }

    // Second pass: Process items and update stock
    for (const item of items) {
      console.log('Processing item:', item.productId, item.productName);
      const product = await Product.findById(item.productId).populate('farmerId');

      const totalPrice = item.quantity * item.pricePerUnit;
      subtotal += totalPrice;

      // Calculate commission for this item
      const itemCommission = Math.round(totalPrice * commissionRate * 100) / 100;
      const itemFarmerAmount = Math.round((totalPrice - itemCommission) * 100) / 100;

      processedItems.push({
        productId: product._id,
        productName: product.productName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        unit: product.unit,
        farmerId: product.farmerId._id,
        totalPrice: totalPrice,
        platformCommission: itemCommission,
        farmerAmount: itemFarmerAmount
      });

      // Update product stock
      const newQuantity = product.quantity - item.quantity;
      await Product.findByIdAndUpdate(product._id, {
        quantity: newQuantity,
        isAvailable: newQuantity > 0, // Set to false if out of stock
        updatedAt: new Date()
      });

      console.log('Stock updated:', {
        productName: product.productName,
        previousQuantity: product.quantity,
        soldQuantity: item.quantity,
        newQuantity: newQuantity,
        isAvailable: newQuantity > 0
      });
    }

    const deliveryFee = 2.50;
    
    // Apply subscription discount if provided
    let discountAmount = 0;
    if (subscriptionDiscount && subscriptionDiscount.amount) {
      discountAmount = subscriptionDiscount.amount;
    }
    
    const subtotalAfterDiscount = subtotal - discountAmount;
    const totalAmount = subtotalAfterDiscount + deliveryFee;

    // Calculate total commission and farmer amount
    const totalPlatformCommission = Math.round(totalAmount * commissionRate * 100) / 100;
    const totalFarmerAmount = Math.round((totalAmount - totalPlatformCommission) * 100) / 100;

    console.log('Commission calculation:', {
      totalAmount,
      commissionRate,
      platformCommission: totalPlatformCommission,
      farmerAmount: totalFarmerAmount
    });

    // Set delivery time slot
    const deliveryTimeSlot = deliveryTime === 'morning' 
      ? '8:00 AM - 12:00 PM' 
      : '4:00 PM - 8:00 PM';

    // Set delivery date (next day)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 1);

    console.log('Creating order with data:', {
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      itemsCount: processedItems.length,
      totalAmount,
      platformCommission: totalPlatformCommission,
      farmerAmount: totalFarmerAmount
    });

    // Generate unique order ID with retry logic
    let orderId;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const orderCount = await Order.countDocuments();
        const nextOrderNumber = orderCount + 1 + attempts; // Add attempts to avoid duplicates
        orderId = `ORD-${String(nextOrderNumber).padStart(3, '0')}`;
        
        // Check if this orderId already exists
        const existingOrder = await Order.findOne({ orderId });
        if (!existingOrder) {
          break; // Found a unique ID
        }
        
        attempts++;
        console.log(`Order ID ${orderId} already exists, trying again (attempt ${attempts})`);
        
      } catch (countError) {
        console.warn('Could not count existing orders, using timestamp-based ID:', countError.message);
        orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      // Fallback to timestamp-based ID if we can't find a unique sequential ID
      orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
      console.log('Using timestamp-based order ID as fallback:', orderId);
    }

    console.log('Generated unique order ID:', orderId);

    // Set initial status based on payment method
    // eSewa orders are auto-confirmed since payment is required upfront
    const initialStatus = paymentMethod === 'esewa' ? 'confirmed' : 'pending';

    const orderData = {
      orderId: orderId, // Explicitly set the orderId
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone || primaryMobile, // Use primary mobile as fallback
      customerEmail: customer.email,
      primaryMobile: primaryMobile,
      secondaryMobile: secondaryMobile || null,
      items: processedItems,
      subtotal,
      subscriptionDiscount: subscriptionDiscount || {
        percentage: 0,
        amount: 0,
        planType: null
      },
      deliveryFee,
      totalAmount,
      platformCommission: totalPlatformCommission,
      farmerAmount: totalFarmerAmount,
      paymentMethod,
      deliveryTime,
      deliveryTimeSlot,
      deliveryAddress,
      deliveryDate,
      status: initialStatus // Set status based on payment method
    };

    console.log('Creating order with complete data:', {
      orderId: orderData.orderId,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      itemsCount: orderData.items.length,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      initialStatus: orderData.status
    });

    const order = new Order(orderData);

    try {
      await order.save();
      console.log('Order saved successfully with ID:', order.orderId);
    } catch (saveError) {
      if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.orderId) {
        // Duplicate order ID error - try with timestamp-based ID
        console.log('Duplicate order ID detected, generating timestamp-based ID');
        order.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
        await order.save();
        console.log('Order saved with fallback ID:', order.orderId);
      } else {
        throw saveError; // Re-throw if it's not a duplicate key error
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,           // MongoDB ObjectId for payment initiation
        orderId: order.orderId,   // Human-readable order ID
        totalAmount: order.totalAmount,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create order';
    
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.orderId) {
        errorMessage = 'Order ID conflict occurred. Please try again.';
      } else {
        errorMessage = 'Duplicate data detected. Please check your input.';
      }
    } else if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => 
        `${key}: ${error.errors[key].message}`
      );
      errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format provided';
    }
    
    console.error('Detailed error info:', {
      name: error.name,
      code: error.code,
      message: error.message,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: {
        errorType: error.name,
        errorCode: error.code
      }
    });
  }
});

// Get orders for customer order history
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status } = req.query;

    let query = { customerId: new mongoose.Types.ObjectId(customerId) };
    if (status && status !== 'all') query.status = status;

    const orders = await Order.find(query)
      .populate('items.productId', 'productName image category')
      .populate('items.farmerId', 'farmName firstName lastName phone')
      .populate('paymentId', 'paymentId status transactionId amount')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Get orders for farmer dashboard
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { status } = req.query;

    console.log(`[FARMER ORDERS] Fetching orders for farmer: ${farmerId}, status filter: ${status}`);

    // Build query to find orders containing items from this farmer
    let matchQuery = {
      'items.farmerId': new mongoose.Types.ObjectId(farmerId),
      // IMPORTANT: Only show orders that are paid OR cash on delivery
      $or: [
        { paymentStatus: 'paid' },
        { paymentMethod: 'cash', paymentStatus: 'pending' } // Cash orders can be pending payment
      ]
    };

    if (status && status !== 'all') {
      matchQuery.status = status;
    }

    console.log('[FARMER ORDERS] Match query:', matchQuery);

    const orders = await Order.find(matchQuery)
      .populate('customerId', 'firstName lastName email phone')
      .populate('items.productId', 'productName image')
      .sort({ createdAt: -1 });

    console.log(`[FARMER ORDERS] Found ${orders.length} orders matching query (paid or cash only)`);

    // Filter items to only show those from this farmer
    const farmerOrders = orders.map(order => {
      const farmerItems = order.items.filter(item => 
        item.farmerId.toString() === farmerId
      );
      
      if (farmerItems.length === 0) return null;

      const farmerSubtotal = farmerItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        primaryMobile: order.primaryMobile,
        secondaryMobile: order.secondaryMobile,
        items: farmerItems,
        subtotal: farmerSubtotal,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryTime: order.deliveryTime,
        deliveryTimeSlot: order.deliveryTimeSlot,
        deliveryAddress: order.deliveryAddress,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        createdAt: order.createdAt
      };
    }).filter(order => order !== null);

    console.log(`[FARMER ORDERS] Filtered to ${farmerOrders.length} orders for this farmer`);

    // Get order counts by status (only for paid/cash orders)
    const statusCounts = await Order.aggregate([
      { 
        $match: { 
          'items.farmerId': new mongoose.Types.ObjectId(farmerId),
          $or: [
            { paymentStatus: 'paid' },
            { paymentMethod: 'cash', paymentStatus: 'pending' }
          ]
        } 
      },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('[FARMER ORDERS] Status counts from aggregation (paid/cash only):', statusCounts);

    const counts = {
      total: 0,
      pending: 0,
      confirmed: 0,
      delivered: 0,
      cancelled: 0
    };

    statusCounts.forEach(item => {
      counts[item._id] = item.count;
      counts.total += item.count; // Add to total for all statuses
    });

    console.log('[FARMER ORDERS] Final counts:', counts);

    res.json({
      success: true,
      orders: farmerOrders,
      counts
    });

  } catch (error) {
    console.error('Error fetching farmer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Update order status
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, farmerId } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if farmer has items in this order
    const hasItems = order.items.some(item => 
      item.farmerId.toString() === farmerId
    );

    if (!hasItems) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    // Business Logic: Prevent cancellation of paid orders
    if (status === 'cancelled') {
      // Check if order is paid online
      if (order.paymentMethod === 'esewa' && order.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel order that has been paid online. Only cash on delivery orders can be cancelled.'
        });
      }

      // Additional check: Don't allow cancellation if payment method is esewa (even if not yet paid)
      if (order.paymentMethod === 'esewa') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel online payment orders. Please contact customer support if needed.'
        });
      }

      console.log(`Order ${orderId} cancellation allowed - Cash on Delivery order`);
      
      // Restore stock when order is cancelled
      await restoreOrderStock(order);
    }

    // Log the status update
    console.log(`Updating order ${orderId} status from ${order.status} to ${status}`, {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      farmerId
    });

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// Get all orders (admin view)
router.get('/all', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'firstName lastName email phone')
      .populate('items.productId', 'productName image')
      .populate('items.farmerId', 'farmName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

module.exports = router;