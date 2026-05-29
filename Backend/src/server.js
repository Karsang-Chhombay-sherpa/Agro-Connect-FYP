const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

console.log('Loading routes...');
const authRoutes = require('./routes/auth');
console.log('✓ Auth routes loaded');
const productRoutes = require('./routes/products');
console.log('✓ Product routes loaded');
const orderRoutes = require('./routes/orders');
console.log('✓ Order routes loaded');
const paymentRoutes = require('./routes/payments');
console.log('✓ Payment routes loaded');
const locationRoutes = require('./routes/location');
console.log('✓ Location routes loaded');
const reviewRoutes = require('./routes/reviews');
console.log('✓ Review routes loaded');
const subscriptionRoutes = require('./routes/subscriptions');
console.log('✓ Subscription routes loaded');
const bulkOrderRoutes = require('./routes/bulkOrders');
console.log('✓ Bulk Order routes loaded');
const adminRoutes = require('./routes/admin');
console.log('✓ Admin routes loaded');
const notificationRoutes = require('./routes/notifications');
console.log('✓ Notification routes loaded');


const app = express();

// Allow requests from Vercel frontend and local dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://agro-connect-fyp.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow any vercel.app preview deployment for this project
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection with error handling
if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected successfully'))
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err.message);
    process.exit(1);
  });

console.log('Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✓ Auth routes registered at /api/auth');
app.use('/api/products', productRoutes);
console.log('✓ Product routes registered at /api/products');
app.use('/api/orders', orderRoutes);
console.log('✓ Order routes registered at /api/orders');
app.use('/api/payments', paymentRoutes);
console.log('✓ Payment routes registered at /api/payments');
app.use('/api/location', locationRoutes);
console.log('✓ Location routes registered at /api/location');
app.use('/api/reviews', reviewRoutes);
console.log('✓ Review routes registered at /api/reviews');
app.use('/api/subscriptions', subscriptionRoutes);
console.log('✓ Subscription routes registered at /api/subscriptions');
app.use('/api/bulk-orders', bulkOrderRoutes);
console.log('✓ Bulk Order routes registered at /api/bulk-orders');
app.use('/api/admin', adminRoutes);
console.log('✓ Admin routes registered at /api/admin');
app.use('/api/notifications', notificationRoutes);
console.log('✓ Notification routes registered at /api/notifications');


// Test endpoints to verify routes are working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/test',
      'GET /api/products/test', 
      'GET /api/orders/test',
      'GET /api/payments/test',
      'POST /api/payments/initiate',
      'POST /api/orders/create'
    ]
  });
});

app.get('/api/products/test', (req, res) => {
  res.json({ message: 'Products route is working', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'API is running', status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  console.log(`✓ API available at ${baseUrl}`);
});

