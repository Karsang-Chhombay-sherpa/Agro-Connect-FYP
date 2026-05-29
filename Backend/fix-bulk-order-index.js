const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from Backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixBulkOrderIndex() {
  try {
    console.log('MongoDB URI:', process.env.MONGO_URI);
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the old index
    console.log('Dropping old bulkOrderId index...');
    try {
      await db.collection('bulkorders').dropIndex('bulkOrderId_1');
      console.log('✓ Old index dropped');
    } catch (error) {
      console.log('Index does not exist or already dropped:', error.message);
    }

    // Create new sparse unique index
    console.log('Creating new sparse unique index on orderId...');
    await db.collection('bulkorders').createIndex(
      { orderId: 1 },
      { unique: true, sparse: true }
    );
    console.log('✓ New index created');

    // List all indexes
    console.log('\nCurrent indexes:');
    try {
      const indexes = await db.collection('bulkorders').listIndexes().toArray();
      console.log(indexes);
    } catch (error) {
      console.log('Could not list indexes:', error.message);
    }

    console.log('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixBulkOrderIndex();
