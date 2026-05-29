const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    quantity: Number,
    unit: String,
    pricePerUnit: Number,
    totalPrice: Number
  }],
  deliveryInfo: {
    fullName: String,
    email: String,
    phoneNumber: String,
    city: String,
    area: String,
    ward: String,
    streetAddress: String,
    landmark: String,
    deliveryInstructions: String
  },
  schedule: {
    startDate: Date,
    timeSlot: String
  },
  pricing: {
    subtotal: Number,
    discountPercentage: Number,
    discountAmount: Number,
    deliveryCharge: Number,
    totalAmount: Number
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  orderId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Remove the old index if it exists and create a new one
bulkOrderSchema.index({ orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
