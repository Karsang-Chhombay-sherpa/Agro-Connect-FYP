const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  farmerAmount: {
    type: Number,
    default: function() {
      return this.totalPrice || 0;
    }
  },
  platformCommission: {
    type: Number,
    default: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  primaryMobile: {
    type: String,
    required: true
  },
  secondaryMobile: {
    type: String,
    default: null
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  subscriptionDiscount: {
    percentage: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    },
    planType: {
      type: String,
      default: null
    }
  },
  deliveryFee: {
    type: Number,
    required: true,
    default: 2.50
  },
  totalAmount: {
    type: Number,
    required: true
  },
  platformCommission: {
    type: Number,
    default: 0
  },
  farmerAmount: {
    type: Number,
    default: function() {
      return this.totalAmount || 0;
    }
  },
  paymentMethod: {
    type: String,
    enum: ['esewa', 'cash'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  deliveryTime: {
    type: String,
    enum: ['morning', 'evening'],
    required: true
  },
  deliveryTimeSlot: {
    type: String,
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Generate order ID if not provided
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const orderCount = await mongoose.model('Order').countDocuments();
        const nextOrderNumber = orderCount + 1 + attempts;
        const candidateId = `ORD-${String(nextOrderNumber).padStart(3, '0')}`;
        
        // Check if this ID already exists
        const existingOrder = await mongoose.model('Order').findOne({ orderId: candidateId });
        if (!existingOrder) {
          this.orderId = candidateId;
          break;
        }
        
        attempts++;
      } catch (error) {
        // Fallback to timestamp-based ID
        this.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      // Final fallback
      this.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
    }
  }
  next();
});

// Indexes for better performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ 'items.farmerId': 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);