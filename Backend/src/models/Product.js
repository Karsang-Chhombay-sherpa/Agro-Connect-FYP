const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  farmerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Farmer', 
    required: true 
  },
  productName: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0
  },
  unit: { 
    type: String, 
    required: true,
    enum: ['kg', 'liter', 'piece', 'dozen', 'box']
  },
  pricePerUnit: { 
    type: Number, 
    required: true,
    min: 0
  },
  description: { 
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  image: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Product', productSchema);

