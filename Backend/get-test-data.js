const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Product = require('./src/models/Product');

async function getTestData() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get a farmer
    const farmer = await User.findOne({ role: 'farmer' }).limit(1);
    console.log('\nFarmer:', farmer ? { _id: farmer._id, name: farmer.firstName } : 'None found');

    // Get a regular user
    const user = await User.findOne({ role: 'user' }).limit(1);
    console.log('User:', user ? { _id: user._id, name: user.firstName } : 'None found');

    // Get a product
    const product = await Product.findOne().limit(1);
    console.log('Product:', product ? { _id: product._id, name: product.productName } : 'None found');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getTestData();
