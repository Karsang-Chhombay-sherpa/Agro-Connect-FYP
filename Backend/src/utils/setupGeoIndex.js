const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Farmer = require('../models/Farmer');

// Script to create geospatial index on Farmer collection
async function setupGeoIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    console.log('Creating 2dsphere index on geoLocation field...');
    await Farmer.collection.createIndex({ geoLocation: '2dsphere' });
    console.log('✓ Geospatial index created successfully');

    // Check existing farmers
    const farmers = await Farmer.find({});
    console.log(`\nFound ${farmers.length} farmers in database`);

    const farmersWithLocation = farmers.filter(f => f.geoLocation && f.geoLocation.coordinates && f.geoLocation.coordinates.length === 2);
    const farmersWithoutLocation = farmers.filter(f => !f.geoLocation || !f.geoLocation.coordinates || f.geoLocation.coordinates.length !== 2);

    console.log(`- ${farmersWithLocation.length} farmers have geolocation set`);
    console.log(`- ${farmersWithoutLocation.length} farmers need geolocation`);

    if (farmersWithoutLocation.length > 0) {
      console.log('\nFarmers without geolocation:');
      farmersWithoutLocation.forEach(f => {
        console.log(`  - ${f.farmName} (${f.email})`);
      });
      console.log('\nThese farmers need to set their coordinates using the API endpoint:');
      console.log('PUT /api/location/farmer/:farmerId/coordinates');
      console.log('Body: { "latitude": <lat>, "longitude": <lng> }');
    }

    console.log('\n✓ Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up geospatial index:', error);
    process.exit(1);
  }
}

setupGeoIndex();
