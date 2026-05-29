const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

const ADMIN_EMAIL = 'admin@agroconnect.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Admin';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log('Admin already exists. Updating password...');
      existing.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await existing.save();
      console.log('✓ Admin password updated');
    } else {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await Admin.create({ email: ADMIN_EMAIL, password: hashed, name: ADMIN_NAME });
      console.log('✓ Admin created successfully');
    }

    console.log('----------------------------');
    console.log('Email   :', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('----------------------------');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
