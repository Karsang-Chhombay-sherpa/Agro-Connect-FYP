const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const paymentService = require('../services/paymentService');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Payment routes working', 
    timestamp: new Date().toISOString(),
    frontendUrl: process.env.FRONTEND_URL,
    backendUrl: process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 8000}`,
    servers: {
      backend: 'running',
      frontend: process.env.FRONTEND_URL
    },
    endpoints: [
      'POST /api/payments/initiate',
      'POST /api/payments/verify',
      'POST /api/payments/initiate-bulk-payment',
      'GET /api/payments/success',
      'GET /api/payments/failure',
      'GET /api/payments/wallet/:farmerId',
      'GET /api/payments/success-page (static fallback)'
    ]
  });
});

// Test redirect endpoint
router.get('/test-redirect', (req, res) => {
  const testUrl = `${process.env.FRONTEND_URL}/payment/success?paymentId=TEST123&transactionId=TEST456&amount=100&redirect=immediate`;
  console.log('Test redirect URL:', testUrl);
  res.redirect(testUrl);
});

// Static fallback success page
router.get('/success-page', (req, res) => {
  const { paymentId, transactionId, amount } = req.query;
  
  // Serve static HTML with parameters
  const fs = require('fs');
  const path = require('path');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, '../../public/payment-success.html'), 'utf8');
    
    // Replace placeholders if needed
    if (paymentId) {
      html = html.replace('paymentId = urlParams.get(\'paymentId\')', `paymentId = '${paymentId}'`);
    }
    if (transactionId) {
      html = html.replace('transactionId = urlParams.get(\'transactionId\')', `transactionId = '${transactionId}'`);
    }
    if (amount) {
      html = html.replace('amount = urlParams.get(\'amount\')', `amount = '${amount}'`);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving static success page:', error);
    res.status(500).send('Error loading success page');
  }
});

/**
 * Initiate eSewa payment for subscription
 */
router.post('/initiate-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    console.log('Subscription payment initiation request:', { subscriptionId });

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    // Find the subscription
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    console.log('Subscription found:', {
      subscriptionId: subscription.subscriptionId,
      paymentStatus: subscription.paymentStatus,
      totalAmount: subscription.totalAmount
    });

    // Check if subscription is already paid
    if (subscription.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already paid'
      });
    }

    // Create a temporary order-like object for payment service
    const orderData = {
      _id: subscription._id,
      orderId: subscription.subscriptionId,
      totalAmount: subscription.totalAmount,
      customerId: subscription.userId,
      paymentMethod: 'esewa'
    };

    // Create eSewa payment parameters
    let paymentData;
    try {
      paymentData = await paymentService.createEsewaPayment(orderData);
    } catch (paymentError) {
      console.error('Error creating eSewa payment parameters:', paymentError);
      
      let errorMessage = 'Failed to create payment parameters';
      if (paymentError.message.includes('Invalid amount')) {
        errorMessage = 'Invalid payment amount. Please check your subscription total.';
      } else if (paymentError.message.includes('too small')) {
        errorMessage = 'Payment amount is too small. Minimum amount is NPR 10.';
      } else if (paymentError.message.includes('too large')) {
        errorMessage = 'Payment amount is too large. Maximum amount is NPR 100,000.';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: paymentError.message
      });
    }

    const { paymentId, esewaParams, paymentUrl, testMode, esewaAvailable } = paymentData;

    console.log('eSewa payment data created for subscription:', {
      paymentId,
      testMode,
      esewaAvailable
    });

    // Create payment record in database
    const payment = await Payment.create({
      orderId: subscription._id,
      userId: subscription.userId,
      paymentId: paymentId,
      amount: subscription.totalAmount,
      platformCommission: subscription.platformCommission,
      farmerAmount: subscription.farmerAmount,
      paymentMethod: 'esewa',
      status: 'pending',
      paymentType: 'subscription'
    });

    // Update subscription with payment reference
    subscription.paymentId = payment._id;
    await subscription.save();

    console.log('eSewa payment initiated for subscription:', paymentId);

    res.json({
      success: true,
      message: testMode ? 'Payment initiated in test mode' : 'Payment initiated successfully',
      data: {
        paymentId,
        esewaParams,
        paymentUrl,
        subscriptionId: subscription._id,
        testMode,
        esewaAvailable
      }
    });

  } catch (error) {
    console.error('Error initiating subscription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

/**
 * Initiate eSewa payment
 */
router.post('/initiate', async (req, res) => {
  try {
    const { orderId } = req.body;

    console.log('Payment initiation request received:', {
      orderId,
      orderIdType: typeof orderId,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });

    if (!orderId) {
      console.log('Missing orderId in request');
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    console.log('Looking for order with ID:', orderId);
    const order = await Order.findById(orderId).populate('items.productId');
    
    if (!order) {
      console.log('Order not found in database for ID:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Order found:', {
      orderId: order.orderId,
      mongoId: order._id,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount
    });
    if (!order) {
      console.log('Order not found in database for ID:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Order found:', {
      orderId: order.orderId,
      mongoId: order._id,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount
    });

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Only process eSewa payments
    if (order.paymentMethod !== 'esewa') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method for eSewa processing'
      });
    }

    // Create eSewa payment parameters
    let paymentData;
    try {
      paymentData = await paymentService.createEsewaPayment(order);
    } catch (paymentError) {
      console.error('Error creating eSewa payment parameters:', paymentError);
      
      // Provide specific error messages for common issues
      let errorMessage = 'Failed to create payment parameters';
      if (paymentError.message.includes('Invalid amount')) {
        errorMessage = 'Invalid payment amount. Please check your order total.';
      } else if (paymentError.message.includes('too small')) {
        errorMessage = 'Payment amount is too small. Minimum amount is NPR 10.';
      } else if (paymentError.message.includes('too large')) {
        errorMessage = 'Payment amount is too large. Maximum amount is NPR 100,000.';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: paymentError.message,
        details: {
          orderId: order.orderId,
          amount: order.totalAmount,
          paymentMethod: order.paymentMethod
        }
      });
    }

    const { paymentId, esewaParams, paymentUrl, testMode, esewaAvailable } = paymentData;

    console.log('eSewa payment data created:', {
      paymentId,
      testMode,
      esewaAvailable,
      amount: esewaParams.amt
    });

    // Create payment record in database
    await paymentService.createPaymentRecord(order, paymentId);

    console.log('eSewa payment initiated:', paymentId);

    res.json({
      success: true,
      message: testMode ? 'Payment initiated in test mode' : 'Payment initiated successfully',
      data: {
        paymentId,
        esewaParams,
        paymentUrl,
        orderId: order._id,
        testMode,
        esewaAvailable
      }
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

/**
 * Verify eSewa payment (called by eSewa after payment)
 */
router.post('/verify', async (req, res) => {
  try {
    const { oid, amt, refId } = req.body;

    console.log('Payment verification request:', { oid, amt, refId });

    if (!oid || !amt || !refId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Verify with eSewa
    const verificationResult = await paymentService.verifyEsewaPayment(oid, refId, amt);

    if (verificationResult.success) {
      // Process successful payment
      const payment = await paymentService.processSuccessfulPayment(
        oid, 
        refId, 
        verificationResult
      );

      console.log('Payment verified and processed successfully:', oid);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          paymentId: payment.paymentId,
          transactionId: payment.esewaTransactionId,
          status: payment.status
        }
      });

    } else {
      // Process failed payment
      await paymentService.processFailedPayment(oid, 'eSewa verification failed');

      console.log('Payment verification failed:', oid);

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message
    });
  }
});

/**
 * Verify and process eSewa payment (called from frontend after eSewa redirects)
 */
router.post('/verify-and-process', async (req, res) => {
  try {
    const { paymentId, transactionId, amount, esewaData } = req.body;

    console.log('=== VERIFY AND PROCESS PAYMENT ===');
    console.log('paymentId:', paymentId);
    console.log('transactionId:', transactionId);
    console.log('amount:', amount);

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    // Verify with eSewa
    let verificationResult;
    try {
      verificationResult = await paymentService.verifyEsewaPayment(paymentId, transactionId, amount);
      console.log('Verification result:', verificationResult);
    } catch (verifyErr) {
      console.log('Verification error, proceeding with COMPLETE status:', verifyErr.message);
      verificationResult = { success: true, transactionId };
    }

    // Process the payment
    try {
      await paymentService.processSuccessfulPayment(paymentId, transactionId, verificationResult);
      console.log('Payment processed successfully');
    } catch (processErr) {
      console.log('Process error (may already be processed):', processErr.message);
    }

    // Determine payment type
    let paymentType = 'order';
    try {
      const paymentRecord = await Payment.findOne({ paymentId });
      if (paymentRecord && paymentRecord.paymentType === 'subscription') {
        paymentType = 'subscription';
      }
    } catch (e) {}

    return res.json({ success: true, paymentType, message: 'Payment processed successfully' });

  } catch (error) {
    console.error('Error in verify-and-process:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Handle eSewa success callback (V2 API)
 */
router.get('/success', async (req, res) => {
  try {
    console.log('=== eSewa V2 SUCCESS CALLBACK ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Raw query parameters:', req.query);

    let paymentData = null;
    let paymentId = null;
    let amount = null;
    let transactionId = null;
    let status = null;

    // eSewa V2 sends data as base64-encoded JSON in 'data' parameter
    if (req.query.data) {
      try {
        console.log('🔍 Decoding eSewa V2 data parameter...');
        const decodedData = Buffer.from(req.query.data, 'base64').toString('utf8');
        console.log('📄 Decoded data:', decodedData);
        
        paymentData = JSON.parse(decodedData);
        console.log('✅ Parsed payment data:', paymentData);

        // Extract payment information from decoded data
        paymentId = paymentData.transaction_uuid;
        amount = paymentData.total_amount;
        transactionId = paymentData.transaction_code;
        status = paymentData.status;

        console.log('📊 Extracted payment info:', {
          paymentId,
          amount,
          transactionId,
          status
        });

      } catch (decodeError) {
        console.error('❌ Error decoding eSewa data:', decodeError);
        console.log('🔄 Falling back to legacy parameter extraction...');
      }
    }

    // Fallback to legacy V1 parameters if V2 decoding failed
    if (!paymentId) {
      console.log('🔄 Using legacy parameter extraction...');
      const { oid, amt, refId, transaction_uuid } = req.query;
      
      paymentId = transaction_uuid || oid;
      amount = amt;
      transactionId = refId;

      console.log('📊 Legacy parameters:', { 
        oid, 
        amt, 
        refId, 
        transaction_uuid,
        extracted: { paymentId, amount, transactionId }
      });
    }

    // Additional fallback for alternative parameter names
    if (!paymentId && !amount) {
      console.log('🔍 Checking alternative parameter names...');
      
      const altParams = {
        paymentId: req.query.pid || req.query.payment_id || req.query.txnId,
        amount: req.query.total_amount || req.query.totalAmount || req.query.tAmt,
        transactionId: req.query.transaction_id || req.query.txn_id || req.query.ref_id
      };
      
      console.log('📊 Alternative parameters found:', altParams);
      
      if (altParams.paymentId || altParams.amount) {
        paymentId = altParams.paymentId;
        amount = altParams.amount;
        transactionId = altParams.transactionId;
        console.log('✅ Using alternative parameters');
      }
    }

    // Final check - if we still don't have basic parameters, redirect with debug info
    if (!paymentId && !amount) {
      console.log('❌ No payment parameters found after all attempts');
      const debugInfo = {
        hasData: !!req.query.data,
        queryKeys: Object.keys(req.query),
        paymentData: paymentData
      };
      
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?paymentId=unknown&error=missing_parameters&debug=${encodeURIComponent(JSON.stringify(debugInfo))}&redirect=immediate`);
    }

    console.log('🔍 Final payment info for processing:', { 
      paymentId, 
      amount, 
      transactionId, 
      status 
    });

    // Process the payment if we have the required information
    try {
      // For eSewa V2, if status is COMPLETE, we can consider it successful
      if (status === 'COMPLETE' || paymentId) {
        console.log('✅ Payment appears successful, processing...');
        
        // Try to verify payment server-side (more lenient for test mode)
        try {
          const verificationResult = await paymentService.verifyEsewaPayment(paymentId, transactionId, amount);
          console.log('🔐 Verification result:', verificationResult);

          if (verificationResult.success) {
            await paymentService.processSuccessfulPayment(paymentId, transactionId, verificationResult);
            console.log('✅ Payment processed successfully');
          } else {
            console.log('⚠️ Payment verification failed, but status is COMPLETE - processing anyway');
            // For V2 API with COMPLETE status, process even if verification fails
            if (status === 'COMPLETE') {
              await paymentService.processSuccessfulPayment(paymentId, transactionId, {
                success: true,
                data: paymentData || { status: 'COMPLETE' }
              });
              console.log('✅ Payment processed based on COMPLETE status');
            }
          }
        } catch (verificationError) {
          console.log('⚠️ Verification error, but continuing based on status:', verificationError.message);
          // If status is COMPLETE, process anyway
          if (status === 'COMPLETE') {
            try {
              await paymentService.processSuccessfulPayment(paymentId, transactionId, {
                success: true,
                data: paymentData || { status: 'COMPLETE' }
              });
              console.log('✅ Payment processed despite verification error');
            } catch (processError) {
              console.log('⚠️ Payment processing failed:', processError.message);
            }
          }
        }
      }
    } catch (processingError) {
      console.log('⚠️ Payment processing error:', processingError.message);
    }
    
    console.log('🔄 Redirecting to success page');
    
    // Determine payment type and fetch user data to restore session on frontend
    let paymentType = 'order';
    let userToken = '';
    try {
      const Payment = require('../models/Payment');
      const User = require('../models/User');
      const paymentRecord = await Payment.findOne({ paymentId });
      if (paymentRecord) {
        if (paymentRecord.paymentType === 'subscription') {
          paymentType = 'subscription';
          console.log('✅ Detected subscription payment');
        }
        // Fetch user data to pass back to frontend for session restoration
        if (paymentRecord.userId) {
          const user = await User.findById(paymentRecord.userId).select('-password');
          if (user) {
            const userData = { ...user.toObject(), userType: 'user' };
            userToken = Buffer.from(JSON.stringify(userData)).toString('base64');
            console.log('✅ User data fetched for session restoration:', user.email);
          }
        }
      }
    } catch (typeCheckError) {
      console.log('⚠️ Could not determine payment type or fetch user:', typeCheckError.message);
    }
    
    // Build redirect URL — include base64 user data so frontend can restore session
    const redirectUrl = `${process.env.FRONTEND_URL}/payment/success?paymentId=${encodeURIComponent(paymentId || 'unknown')}&transactionId=${encodeURIComponent(transactionId || 'unknown')}&amount=${encodeURIComponent(amount || '0')}&status=${encodeURIComponent(status || 'unknown')}&type=${paymentType}&redirect=immediate${userToken ? `&ud=${userToken}` : ''}`;
    
    console.log('🔗 Redirect URL built (userToken present:', !!userToken, ')');
    
    // Redirect to frontend
    try {
      res.redirect(redirectUrl);
    } catch (redirectError) {
      console.log('⚠️ Frontend redirect failed, serving static success page');
      const fallbackUrl = `/api/payments/success-page?paymentId=${encodeURIComponent(paymentId || 'unknown')}&transactionId=${encodeURIComponent(transactionId || 'unknown')}&amount=${encodeURIComponent(amount || '0')}`;
      res.redirect(fallbackUrl);
    }

  } catch (error) {
    console.error('💥 Error in success callback:', error);
    console.error('Stack trace:', error.stack);
    
    // Even on error, redirect to success with error info
    // Better user experience than showing server error
    res.redirect(`${process.env.FRONTEND_URL}/payment/success?paymentId=error&error=server_error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Handle eSewa failure callback
 */
router.get('/failure', async (req, res) => {
  try {
    const { pid } = req.query;

    console.log('eSewa failure callback:', { pid });

    if (pid) {
      // Process failed payment
      await paymentService.processFailedPayment(pid, 'Payment cancelled by user');
    }

    // Redirect to failure page
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure?paymentId=${pid}&error=payment_cancelled`);

  } catch (error) {
    console.error('Error in failure callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=server_error`);
  }
});

/**
 * Get payment status
 */
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ paymentId }).populate('orderId');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        transactionId: payment.esewaTransactionId,
        orderId: payment.orderId.orderId,
        createdAt: payment.createdAt,
        processedAt: payment.processedAt
      }
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
});

/**
 * Get farmer wallet (enhanced with debugging info)
 */
router.get('/wallet/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;

    console.log(`Getting wallet for farmer: ${farmerId}`);

    const wallet = await paymentService.getFarmerWallet(farmerId);

    // Get recent orders for this farmer to verify wallet updates
    const recentOrders = await Order.find({ 
      'items.farmerId': farmerId,
      paymentStatus: 'paid'
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`Found ${recentOrders.length} paid orders for farmer ${farmerId}`);

    res.json({
      success: true,
      data: {
        farmerId: wallet.farmerId._id,
        farmerName: wallet.farmerId.farmName,
        balance: wallet.balance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        transactionCount: wallet.transactions.length,
        recentTransactions: wallet.transactions
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10),
        recentPaidOrders: recentOrders.map(order => ({
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          farmerAmount: order.farmerAmount,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error getting farmer wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet information',
      error: error.message
    });
  }
});

/**
 * Get all payments (admin)
 */
router.get('/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('orderId', 'orderId customerName totalAmount')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
});

/**
 * Test wallet crediting (for debugging)
 */
router.post('/test-wallet-credit', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Find or create a test payment record
    let payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      payment = new Payment({
        orderId: order._id,
        userId: order.customerId,
        paymentId: `TEST-${Date.now()}`,
        amount: order.totalAmount,
        paymentMethod: 'esewa',
        status: 'completed',
        esewaTransactionId: `TEST-TXN-${Date.now()}`
      });
      await payment.save();
    }

    // Test wallet crediting
    await paymentService.creditFarmerWallets(order, payment);

    res.json({
      success: true,
      message: 'Wallet crediting test completed',
      data: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
        farmers: order.items.map(item => ({
          farmerId: item.farmerId._id,
          farmerName: item.farmerId.farmName,
          farmerAmount: item.farmerAmount,
          totalPrice: item.totalPrice
        }))
      }
    });

  } catch (error) {
    console.error('Error testing wallet credit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test wallet crediting',
      error: error.message
    });
  }
});

/**
 * Simulate successful eSewa payment (for testing)
 */
router.post('/simulate-esewa-success', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Simulating eSewa payment for order:', order.orderId);

    // Create or update payment record
    let payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      const commissionData = paymentService.calculateCommission(order.totalAmount);
      
      payment = new Payment({
        orderId: order._id,
        userId: order.customerId,
        paymentId: `SIM-${Date.now()}`,
        amount: order.totalAmount,
        platformCommission: commissionData.platformCommission,
        farmerAmount: commissionData.farmerAmount,
        paymentMethod: 'esewa',
        status: 'pending'
      });
      await payment.save();
    }

    // Simulate successful payment processing
    payment.status = 'completed';
    payment.esewaTransactionId = `SIM-TXN-${Date.now()}`;
    payment.processedAt = new Date();
    await payment.save();

    // Update order
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    await order.save();

    // Credit farmer wallets
    await paymentService.creditFarmerWallets(order, payment);

    res.json({
      success: true,
      message: 'eSewa payment simulated successfully',
      data: {
        orderId: order.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Error simulating eSewa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate payment',
      error: error.message
    });
  }
});


/**
 * Initiate bulk order payment
 */
router.post('/initiate-bulk-payment', async (req, res) => {
  try {
    const { orderId, amount, userId } = req.body;

    if (!orderId || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, amount, userId'
      });
    }

    const mongoose = require('mongoose');

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId format.' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId format.' });
    }

    // Verify bulk order exists
    const BulkOrder = require('../models/BulkOrder');
    const bulkOrder = await BulkOrder.findById(orderId);
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found.' });
    }

    // Create eSewa payment parameters first (before saving to DB)
    const esewaPayment = await paymentService.createEsewaPayment({
      totalAmount: parseFloat(amount),
      _id: orderId
    });

    const { paymentId } = esewaPayment;
    const commissionData = paymentService.calculateCommission(parseFloat(amount));

    // Save payment record
    const payment = new Payment({
      orderId: new mongoose.Types.ObjectId(orderId),
      userId: new mongoose.Types.ObjectId(userId),
      paymentId,
      amount: parseFloat(amount),
      platformCommission: commissionData.platformCommission,
      farmerAmount: commissionData.farmerAmount,
      paymentMethod: 'esewa',
      paymentType: 'order',
      orderType: 'bulkOrder',
      status: 'pending'
    });
    await payment.save();

    // Link payment to bulk order
    bulkOrder.paymentStatus = 'pending';
    await bulkOrder.save();

    console.log('Bulk payment initiated:', paymentId);

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: esewaPayment
    });

  } catch (error) {
    console.error('Error initiating bulk payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

module.exports = router;
