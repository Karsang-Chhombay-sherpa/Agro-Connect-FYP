const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  farmName: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true }, // Keep for backward compatibility
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    }
  },
  profilePicture: { type: String, default: '' },
  description: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  registrationNumber: { type: String, default: '' },
  yearsOfExperience: { type: Number, default: null },
  organicCertification: { type: String, default: '' }, // Base64 encoded file
  certificationFileName: { type: String, default: '' },
  orderNotifications: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create 2dsphere index for geospatial queries
farmerSchema.index({ geoLocation: '2dsphere' });

// Update the updatedAt field before saving
farmerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
farmerSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Farmer', farmerSchema);

