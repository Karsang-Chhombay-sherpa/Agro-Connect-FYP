/**
 * Debug script to test payment flow without frontend
 * Run with: node debug-payment.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugPayment() {
  try {
    console.log('\n=== Payment Flow Debug Tool ===\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Order = require('./src/models/Order');
    const Payment = require('./src/models/Payment');

    // Get recent orders
    console.log('📦 Recent Orders (last 5):');
    console.log('─'.repeat(80));
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId customerId totalAmount paymentStatus paymentMethod createdAt');

    if (orders.length === 0) {
      console.log('No orders found');
    } else {
      orders.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.orderId}`);
        console.log(`   Amount: NPR ${order.totalAmount}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Payment Method: ${order.paymentMethod}`);
        console.log(`   Created: ${order.createdAt}`);
        console.log('');
      });
    }

    // Get recent payments
    console.log('\n💳 Recent Payments (last 5):');
    console.log('─'.repeat(80));
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('paymentId orderId amount status paymentMethod transactionId createdAt');

    if (payments.length === 0) {
      console.log('No payments found');
    } else {
      payments.forEach((payment, index) => {
        console.log(`${index + 1}. Payment ID: ${payment.paymentId}`);
        console.log(`   Order ID: ${payment.orderId}`);
        console.log(`   Amount: NPR ${payment.amount}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Method: ${payment.paymentMethod}`);
        console.log(`   Transaction ID: ${payment.transactionId || 'N/A'}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log('');
      });
    }

    // Check for pending payments
    console.log('\n⏳ Pending Payments:');
    console.log('─'.repeat(80));
    const pendingPayments = await Payment.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .select('paymentId orderId amount createdAt');

    if (pendingPayments.length === 0) {
      console.log('✅ No pending payments');
    } else {
      console.log(`⚠️  Found ${pendingPayments.length} pending payment(s):`);
      pendingPayments.forEach((payment, index) => {
        const ageMinutes = Math.floor((Date.now() - payment.createdAt) / 1000 / 60);
        console.log(`${index + 1}. ${payment.paymentId} - ${ageMinutes} minutes old`);
      });
      console.log('\nNote: Pending payments older than 15 minutes might indicate failed payments');
    }

    // Check for failed payments
    console.log('\n❌ Failed Payments (last 5):');
    console.log('─'.repeat(80));
    const failedPayments = await Payment.find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('paymentId orderId amount createdAt');

    if (failedPayments.length === 0) {
      console.log('✅ No failed payments');
    } else {
      failedPayments.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.paymentId} - Failed at ${payment.createdAt}`);
      });
    }

    // Payment statistics
    console.log('\n📊 Payment Statistics:');
    console.log('─'.repeat(80));
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    if (stats.length === 0) {
      console.log('No payment data available');
    } else {
      stats.forEach(stat => {
        console.log(`${stat._id}: ${stat.count} payments, NPR ${stat.totalAmount.toFixed(2)} total`);
      });
    }

    // Check configuration
    console.log('\n⚙️  Current Configuration:');
    console.log('─'.repeat(80));
    console.log(`Backend Port: ${process.env.PORT || '8000'}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`Success URL: ${process.env.ESEWA_SUCCESS_URL}`);
    console.log(`Failure URL: ${process.env.ESEWA_FAILURE_URL}`);
    console.log(`Merchant ID: ${process.env.ESEWA_MERCHANT_ID}`);
    console.log(`Test Mode: ${process.env.ESEWA_TEST_MODE || 'false'}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('─'.repeat(80));

    if (pendingPayments.length > 0) {
      console.log('⚠️  You have pending payments. Possible causes:');
      console.log('   • User abandoned payment on eSewa');
      console.log('   • eSewa callback failed to reach backend');
      console.log('   • Payment verification failed');
      console.log('   Action: Check backend logs for callback attempts');
    }

    if (failedPayments.length > 0) {
      console.log('⚠️  You have failed payments. Common causes:');
      console.log('   • User clicked cancel on eSewa');
      console.log('   • Payment verification failed');
      console.log('   • Network timeout');
      console.log('   Action: Review payment logs for specific errors');
    }

    const successRate = stats.find(s => s._id === 'completed');
    const totalPayments = stats.reduce((sum, s) => sum + s.count, 0);
    if (successRate && totalPayments > 0) {
      const rate = ((successRate.count / totalPayments) * 100).toFixed(1);
      console.log(`\n✅ Success Rate: ${rate}% (${successRate.count}/${totalPayments})`);
      if (rate < 50) {
        console.log('⚠️  Low success rate! Check:');
        console.log('   • Backend is accessible from eSewa');
        console.log('   • Callback URLs are correct');
        console.log('   • Payment verification is working');
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugPayment();
