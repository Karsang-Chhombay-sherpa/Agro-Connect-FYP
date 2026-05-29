const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Farmer = require('../models/Farmer');

// Sample locations in Nepal (for testing)
const sampleLocations = {
  kathmandu: { lat: 27.7172, lng: 85.3240, name: 'Kathmandu' },
  bhaktapur: { lat: 27.6710, lng: 85.4298, name: 'Bhaktapur' },
  lalitpur: { lat: 27.6667, lng: 85.3167, name: 'Lalitpur' },
  kirtipur: { lat: 27.6789, lng: 85.2753, name: 'Kirtipur' },
  budhanilkantha: { lat: 27.7833, lng: 85.3667, name: 'Budhanilkantha' },
  pokhara: { lat: 28.2096, lng: 83.9856, name: 'Pokhara' }, // Far away for testing
};

async function addSampleLocations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const farmers = await Farmer.find({});
    
    if (farmers.length === 0) {
      console.log('No farmers found in database. Please create farmers first.');
      process.exit(0);
    }

    console.log(`Found ${farmers.length} farmers\n`);
    console.log('Available sample locations:');
    Object.entries(sampleLocations).forEach(([key, loc], index) => {
      console.log(`${index + 1}. ${loc.name} (${loc.lat}, ${loc.lng})`);
    });
    console.log();

    // Assign locations to farmers in a round-robin fashion
    const locationKeys = Object.keys(sampleLocations);
    let updateCount = 0;

    for (let i = 0; i < farmers.length; i++) {
      const farmer = farmers[i];
      const locationKey = locationKeys[i % locationKeys.length];
      const location = sampleLocations[locationKey];

      // Update farmer with geolocation
      await Farmer.findByIdAndUpdate(farmer._id, {
        geoLocation: {
          type: 'Point',
          coordinates: [location.lng, location.lat] // [longitude, latitude]
        }
      });

      console.log(`✓ Updated ${farmer.farmName} → ${location.name} (${location.lat}, ${location.lng})`);
      updateCount++;
    }

    console.log(`\n✓ Successfully updated ${updateCount} farmers with sample locations`);
    console.log('\nYou can now test the location-based filtering feature!');
    console.log('Farmers in Kathmandu valley (within ~25km of each other):');
    console.log('  - Kathmandu, Bhaktapur, Lalitpur, Kirtipur, Budhanilkantha');
    console.log('Farmer in Pokhara (~145km away) will not appear in nearby results.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample locations:', error);
    process.exit(1);
  }
}

// Run the script
addSampleLocations();
