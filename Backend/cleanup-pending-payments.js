/**
 * Cleanup script to mark old pending payments as failed
 * Run with: node cleanup-pending-payments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupPendingPayments() {
  try {
    console.log('\n=== Cleanup Pending Payments ===\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Payment = require('./src/models/Payment');
    const Order = require('./src/models/Order');

    // Find old pending payments (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const oldPendingPayments = await Payment.find({
      status: 'pending',
      createdAt: { $lt: thirtyMinutesAgo }
    }).sort({ createdAt: -1 });

    console.log(`Found ${oldPendingPayments.length} pending payments older than 30 minutes\n`);

    if (oldPendingPayments.length === 0) {
      console.log('✅ No old pending payments to clean up');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    // Show summary
    console.log('Summary:');
    console.log('─'.repeat(80));
    const totalAmount = oldPendingPayments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`Total payments: ${oldPendingPayments.length}`);
    console.log(`Total amount: NPR ${totalAmount.toFixed(2)}`);
    console.log(`Oldest payment: ${oldPendingPayments[oldPendingPayments.length - 1].createdAt}`);
    console.log(`Newest payment: ${oldPendingPayments[0].createdAt}\n`);

    // Show first 10
    console.log('First 10 payments:');
    oldPendingPayments.slice(0, 10).forEach((payment, index) => {
      const ageMinutes = Math.floor((Date.now() - payment.createdAt) / 1000 / 60);
      console.log(`${index + 1}. ${payment.paymentId} - NPR ${payment.amount} - ${ageMinutes} min old`);
    });

    if (oldPendingPayments.length > 10) {
      console.log(`... and ${oldPendingPayments.length - 10} more\n`);
    }

    // Ask for confirmation
    const answer = await question('\nMark these payments as failed? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled. No changes made.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    console.log('\nProcessing...');

    let updated = 0;
    let errors = 0;

    for (const payment of oldPendingPayments) {
      try {
        // Update payment status
        payment.status = 'failed';
        payment.failureReason = 'Payment timeout - marked as failed by cleanup script';
        await payment.save();

        // Update associated order if exists
        if (payment.orderId) {
          const order = await Order.findById(payment.orderId);
          if (order && order.paymentStatus === 'pending') {
            order.paymentStatus = 'failed';
            order.status = 'cancelled';
            await order.save();
          }
        }

        updated++;
        if (updated % 10 === 0) {
          console.log(`Processed ${updated}/${oldPendingPayments.length}...`);
        }
      } catch (error) {
        console.error(`Error updating ${payment.paymentId}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`Updated: ${updated} payments`);
    if (errors > 0) {
      console.log(`Errors: ${errors} payments`);
    }

    // Show updated statistics
    console.log('\n📊 Updated Statistics:');
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

    stats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} payments, NPR ${stat.totalAmount.toFixed(2)} total`);
    });

    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupPendingPayments();
