const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: String,
    required: true,
    enum: ['basic', 'family']
  },
  planName: {
    type: String,
    required: true
  },
  weeklyPrice: {
    type: Number,
    required: true
  },
  numberOfWeeks: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryInfo: {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },
    area: String,
    ward: String,
    streetAddress: String,
    landmark: String,
    deliveryInstructions: String
  },
  schedule: {
    startDate: { type: Date, required: true },
    timeSlot: {
      type: String,
      required: true,
      enum: ['morning', 'afternoon', 'evening']
    }
  },
  selectedFarmers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer'
  }],
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'cancelled', 'completed'],
    default: 'pending'
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  deliveryFrequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },
  planType: {
    type: String,
    enum: ['Basic Box', 'Family Box'],
    default: 'Basic Box'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  platformCommission: {
    type: Number,
    default: 0
  },
  farmerAmount: {
    type: Number,
    default: 0
  },
  dailySelections: [{
    date: { type: Date, required: true },
    products: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      quantity: { type: Number, default: 1 },
      pricePerUnit: Number,
      unit: String
    }]
  }]
}, {
  timestamps: true
});

// Generate subscription ID before saving
subscriptionSchema.pre('save', async function(next) {
  if (!this.subscriptionId) {
    const count = await mongoose.model('Subscription').countDocuments();
    this.subscriptionId = `SUB-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
