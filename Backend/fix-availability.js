require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = require('./src/models/Product');

  // Fix products where quantity > 0 but isAvailable is false
  const fixed = await Product.updateMany(
    { quantity: { $gt: 0 }, isAvailable: false },
    { $set: { isAvailable: true } }
  );
  console.log('Fixed available products:', fixed.modifiedCount);

  // Fix products where quantity = 0 but isAvailable is true
  const fixedOOS = await Product.updateMany(
    { quantity: 0, isAvailable: true },
    { $set: { isAvailable: false } }
  );
  console.log('Fixed out-of-stock products:', fixedOOS.modifiedCount);

  // Show final state
  const all = await Product.find().select('productName quantity isAvailable');
  console.log('\nAll products after fix:');
  all.forEach(p => {
    console.log(`  ${p.productName}: qty=${p.quantity}, available=${p.isAvailable}`);
  });

  mongoose.disconnect();
  console.log('\nDone!');
});
